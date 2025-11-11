import { Injectable, BadRequestException } from "@nestjs/common"; // Logger removed from here
import { CreateCardDto } from "../dtos/card";
import { UpdateCardDto } from "../dtos/card";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm"; // LessThanOrEqual, MoreThanOrEqual not used
import { Card, CardLocation, Supplier, Visitor } from "src/domain/entities";
import { RedisDatabaseService } from "src/infrastructure/database/redis/redis.database.service";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Added import

@Injectable()
export class CardService {
	// private readonly logger = new Logger(CardService.name); // Remove this

	constructor(
		@InjectRepository(Card)
		private readonly cardRepository: Repository<Card>,
		@InjectRepository(CardLocation)
		private readonly locationRepository: Repository<CardLocation>,
		@InjectRepository(Supplier)
		private readonly supplierRepository: Repository<Supplier>,
		@InjectRepository(Visitor)
		private readonly visitorRepository: Repository<Visitor>,
		private readonly redisService: RedisDatabaseService,
		private readonly structuredLogger: StructuredLoggerService, // Add this
	) {
		this.structuredLogger.setContext(CardService.name); // Set context
	}

	async findAvailableCards(): Promise<Card[]> {
		// Tarjetas disponibles son aquellas que están activas y no asignadas a ningún visitante
		return await this.cardRepository.find({
			where: {
				is_active: true,
				visitor_id: null,
			},
			relations: ["supplier", "supplier.subscription"],
		});
	}

	async recordLocation(
		card_number: string,
		latitude: number,
		longitude: number,
		accuracy?: number,
	): Promise<CardLocation> {
		const card = await this.findOneByCardNumber(card_number); // findOne might throw, which is fine.

		// Crear registro de ubicación
		const location = this.locationRepository.create({
			card,
			card_id: card.id,
			latitude,
			longitude,
			accuracy,
			timestamp: new Date(),
		});

		// También actualizar los datos de ubicación en la tarjeta para acceso rápido
		card.latitude = latitude;
		card.longitude = longitude;
		card.accuracy = accuracy;
		await this.cardRepository.save(card);

		const savedLocation = await this.locationRepository.save(location);
		this.structuredLogger.debug("Card location recorded", undefined, {
			cardId: card.id,
			latitude,
			longitude,
			accuracy,
		});

		// Guardar en caché Redis
		try {
			await this.redisService.saveCardLocation(card.id, {
				id: savedLocation.id,
				latitude,
				longitude,
				accuracy,
				timestamp: savedLocation.timestamp,
				card_number: card.card_number,
			});
		} catch (error) {
			this.structuredLogger.warn(
				`Error al guardar ubicación de tarjeta en caché: ${error.message}`,
				undefined,
				{ cardId: card.id },
			);
		}

		return savedLocation;
	}

	async assignToVisitor(card_id: string, visitor_id: string): Promise<Card> {
		this.structuredLogger.log(
			"Attempting to assign card to visitor",
			undefined,
			{ cardId: card_id, visitorId: visitor_id },
		);
		const card = await this.findOne(card_id);
		const visitor = await this.visitorRepository.findOne({
			where: { id: visitor_id },
			relations: ["card"],
		});

		let reason = "";
		if (!visitor) {
			reason = "El visitante no existe";
			this.structuredLogger.warn(
				`Card assignment failed: ${reason}`,
				undefined,
				{ cardId: card_id, visitorId: visitor_id, reason },
			);
			throw new BadRequestException(reason);
		}

		if (visitor.state === "completado") {
			reason = "El visitante ya completó su visita";
			this.structuredLogger.warn(
				`Card assignment failed: ${reason}`,
				undefined,
				{ cardId: card_id, visitorId: visitor_id, reason },
			);
			throw new BadRequestException(reason);
		}

		if (visitor.card) {
			reason = "El visitante ya tiene una tarjeta asignada";
			this.structuredLogger.warn(
				`Card assignment failed: ${reason}`,
				undefined,
				{ cardId: card_id, visitorId: visitor_id, reason },
			);
			throw new BadRequestException(reason);
		}

		if (!card.is_active) {
			reason = "La tarjeta no está activa";
			this.structuredLogger.warn(
				`Card assignment failed: ${reason}`,
				undefined,
				{ cardId: card_id, visitorId: visitor_id, reason },
			);
			throw new BadRequestException(reason);
		}

		if (card.visitor) {
			reason = "La tarjeta ya está asignada a otro visitante";
			this.structuredLogger.warn(
				`Card assignment failed: ${reason}`,
				undefined,
				{ cardId: card_id, visitorId: visitor_id, reason },
			);
			throw new BadRequestException(reason);
		}

		card.visitor = visitor;
		card.visitor_id = visitor.id;
		card.issued_at = new Date();
		visitor.state = "en_progreso";

		await this.visitorRepository.save(visitor);
		const savedCard = await this.cardRepository.save(card);
		this.structuredLogger.log(
			"Card assigned to visitor successfully",
			undefined,
			{ cardId: savedCard.id, visitorId: visitor.id },
		);
		return savedCard;
	}

	async unassignFromVisitor(card_id: string): Promise<Card> {
		this.structuredLogger.log(
			"Attempting to unassign card from visitor",
			undefined,
			{ cardId: card_id },
		);
		const card = await this.findOne(card_id);

		if (!card.visitor) {
			// This could be a normal scenario or an error depending on context. Logging as WARN if unexpected.
			// For now, let's assume it's a validation failure.
			const reason = "La tarjeta no está asignada a ningún visitante";
			this.structuredLogger.warn(
				`Card unassignment failed: ${reason}`,
				undefined,
				{ cardId: card_id, reason },
			);
			throw new BadRequestException(reason);
		}

		const visitorIdBeforeUnassign = card.visitor.id; // Capture before setting to null
		const visitor = await this.visitorRepository.findOne({
			// Fetch visitor to update state
			where: { id: visitorIdBeforeUnassign },
		});

		if (visitor) {
			visitor.state = "completado"; // Or another appropriate state
			await this.visitorRepository.save(visitor);
		}

		card.visitor = null;
		card.visitor_id = null;
		card.issued_at = null;
		const unassignedCard = await this.cardRepository.save(card);
		this.structuredLogger.log(
			"Card unassigned from visitor successfully",
			undefined,
			{ cardId: unassignedCard.id, visitorId: visitorIdBeforeUnassign },
		);
		return unassignedCard;
	}

	async create(createCardDto: CreateCardDto) {
		this.structuredLogger.log("Attempting to create card", undefined, {
			supplierId: createCardDto.supplier_id,
			cardNumber: createCardDto.card_number,
		});

		const supplier = await this.supplierRepository.findOne({
			where: { id: createCardDto.supplier_id },
			relations: ["subscription"],
		});

		if (!supplier) {
			// This will be caught by GlobalExceptionFilter, but explicit log can be useful.
			// this.structuredLogger.error('Card creation prerequisite failed: Supplier not found', { supplierId: createCardDto.supplier_id });
			throw new BadRequestException("El proveedor no existe");
		}

		if (
			!supplier.subscription ||
			!supplier.subscription.has_card_subscription
		) {
			this.structuredLogger.warn(
				"Card creation failed: Supplier not subscribed for cards",
				undefined,
				{
					supplierId: createCardDto.supplier_id,
				},
			);
			throw new BadRequestException(
				"El proveedor no tiene suscripción de tarjetas",
			);
		}

		// Verificar límite de tarjetas
		const currentCardCount = await this.cardRepository.count({
			where: { supplier: { id: supplier.id } },
		});

		if (currentCardCount >= supplier.subscription.max_card_count) {
			this.structuredLogger.warn(
				"Card creation failed: Supplier card limit reached",
				undefined,
				{
					supplierId: createCardDto.supplier_id,
					limit: supplier.subscription.max_card_count,
				},
			);
			throw new BadRequestException(
				`El proveedor ha alcanzado su límite de tarjetas (${supplier.subscription.max_card_count})`,
			);
		}

		const newCard = this.cardRepository.create({
			card_uuid: createCardDto.card_uuid,
			card_number: createCardDto.card_number || `CARD-${Date.now()}`, // Consider a more robust unique number generation
			is_active: createCardDto.is_active ?? true,
			status: createCardDto.status || "active",
			battery_percentage: createCardDto.battery_percentage ?? 100,
			supplier,
			supplier_id: supplier.id,
		});

		const savedCard = await this.cardRepository.save(newCard);
		this.structuredLogger.log("Card created successfully", undefined, {
			cardId: savedCard.id,
			cardNumber: savedCard.card_number,
			supplierId: supplier.id,
		});
		return savedCard;
	}

	async findAll() {
		return await this.cardRepository.find({
			relations: ["supplier", "visitor", "employee", "locations"],
		});
	}

	async findBySupplier(supplierId: string) {
		return await this.cardRepository.find({
			where: { supplier_id: supplierId },
			relations: ["supplier", "visitor", "employee", "locations"],
		});
	}

	async findOne(id: string) {
		const card = await this.cardRepository.findOne({
			where: { id },
			relations: ["supplier", "supplier.subscription", "visitor", "employee", "locations"],
		});

		if (!card) {
			throw new BadRequestException("La tarjeta no existe");
		}

		return card;
	}

	async findOneByCardNumber(card_number: string) {
		const card = await this.cardRepository.findOne({
			where: { card_number },
			relations: ["supplier", "supplier.subscription", "visitor", "employee", "locations"],
		});

		if (!card) {
			throw new BadRequestException("La tarjeta no existe");
		}

		return card;
	}

	async findLocationHistory(card_id: string): Promise<CardLocation[]> {
		const card = await this.findOne(card_id); // Ensures card exists

		// Obtener el historial de ubicaciones de la base de datos
		return this.locationRepository.find({
			where: { card: { id: card_id } }, // Ensure TypeORM handles this relation correctly
			order: { timestamp: "DESC" },
		});
	}

	async getLastLocation(card_id: string): Promise<any> {
		// Intentar obtener de caché primero
		try {
			const cachedLocation = await this.redisService.getCardLocation(card_id);
			if (cachedLocation) {
				return cachedLocation;
			}
		} catch (error) {
			this.structuredLogger.warn(
				`Error al obtener ubicación de tarjeta de caché: ${error.message}`,
				undefined,
				{ cardId: card_id },
			);
		}

		// Si no está en caché, obtener de base de datos
		const lastLocationFromDB = await this.locationRepository.findOne({
			where: { card: { id: card_id } }, // Ensure TypeORM handles this relation correctly
			order: { timestamp: "DESC" },
		});

		if (lastLocationFromDB) {
			// Guardar en caché para futuros accesos
			try {
				const card = await this.findOne(card_id); // To get card_number if not on lastLocationFromDB
				await this.redisService.saveCardLocation(card_id, {
					id: lastLocationFromDB.id,
					latitude: lastLocationFromDB.latitude,
					longitude: lastLocationFromDB.longitude,
					accuracy: lastLocationFromDB.accuracy,
					timestamp: lastLocationFromDB.timestamp,
					card_number: card.card_number, // Assuming card_number is needed in cache
				});
			} catch (error) {
				this.structuredLogger.warn(
					`Error al guardar ubicación de tarjeta en caché: ${error.message}`,
					undefined,
					{ cardId: card_id },
				);
			}

			return lastLocationFromDB;
		}

		return null;
	}

	async getNearbyCards(
		latitude: number,
		longitude: number,
		radius = 100,
	): Promise<any[]> {
		// Utilizar la función de Redis para obtener tarjetas cercanas
		try {
			const nearbyCards = await this.redisService.getNearbyCards(
				latitude,
				longitude,
				radius,
			);
			if (nearbyCards && nearbyCards.length > 0) {
				return nearbyCards;
			}
		} catch (error) {
			this.structuredLogger.warn(
				`Error al obtener tarjetas cercanas de caché: ${error.message}`,
				undefined,
				{ latitude, longitude, radius },
			);
		}

		// Fallback a la base de datos (búsqueda aproximada)
		// Nota: esto no es una verdadera búsqueda geoespacial, solo una aproximación
		const latDelta = radius / 111000; // Aproximado: 1 grado ~ 111km
		const lngDelta = radius / (111000 * Math.cos(latitude * (Math.PI / 180)));

		const minLat = latitude - latDelta;
		const maxLat = latitude + latDelta;
		const minLng = longitude - lngDelta;
		const maxLng = longitude + lngDelta;

		const cards = await this.cardRepository.find({
			where: {
				latitude: Between(minLat, maxLat), // Ensure latitude/longitude are numeric types in DB
				longitude: Between(minLng, maxLng),
			},
		});

		return cards.map((card) => ({
			id: card.id,
			card_number: card.card_number,
			latitude: card.latitude, // Ensure these are directly on the card entity
			longitude: card.longitude, // Ensure these are directly on the card entity
			accuracy: card.accuracy, // Ensure these are directly on the card entity
			// Cálculo aproximado de la distancia
			distance_meters: this.calculateDistance(
				latitude,
				longitude,
				parseFloat(String(card.latitude)), // Ensure conversion is safe
				parseFloat(String(card.longitude)), // Ensure conversion is safe
			),
		}));
	}

	private calculateDistance(
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number,
	): number {
		const R = 6371000; // Radio de la Tierra en metros
		const φ1 = (lat1 * Math.PI) / 180;
		const φ2 = (lat2 * Math.PI) / 180;
		const Δφ = ((lat2 - lat1) * Math.PI) / 180;
		const Δλ = ((lon2 - lon1) * Math.PI) / 180;

		const a =
			Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
			Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return Math.round(R * c); // Distancia en metros
	}

	async update(id: string, updateCardDto: UpdateCardDto) {
		this.structuredLogger.log("Attempting to update card", undefined, {
			cardId: id,
		});
		const card = await this.findOne(id); // findOne will throw if not found

		if (updateCardDto.supplier_id) {
			const supplier = await this.supplierRepository.findOne({
				where: { id: updateCardDto.supplier_id },
				relations: ["subscription"],
			});

			if (!supplier) {
				throw new BadRequestException("El proveedor no existe");
			}

			if (
				!supplier.subscription ||
				!supplier.subscription.has_card_subscription
			) {
				throw new BadRequestException(
					"El proveedor no tiene suscripción de tarjetas",
				);
			}

			card.supplier = supplier;
		}

		if (updateCardDto.card_uuid) card.card_uuid = updateCardDto.card_uuid;
		if (updateCardDto.card_number) card.card_number = updateCardDto.card_number;
		if (updateCardDto.is_active !== undefined)
			card.is_active = updateCardDto.is_active;
		if (updateCardDto.status) card.status = updateCardDto.status;
		if (updateCardDto.battery_percentage !== undefined)
			card.battery_percentage = updateCardDto.battery_percentage;
		if (updateCardDto.expires_at) card.expires_at = updateCardDto.expires_at;

		const updatedCard = await this.cardRepository.save(card);
		this.structuredLogger.log("Card updated successfully", undefined, {
			cardId: updatedCard.id,
		});
		return updatedCard;
	}

	async remove(id: string) {
		this.structuredLogger.log("Attempting to delete card", undefined, {
			cardId: id,
		});
		const card = await this.findOne(id); // findOne will throw if not found
		await this.cardRepository.remove(card);
		this.structuredLogger.log("Card deleted successfully", undefined, {
			cardId: id,
		});
		// Original returns result of remove, which is usually void or the entity.
	}
}
