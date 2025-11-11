import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from "typeorm";
import { Appointment, Visitor, Employee } from "src/domain/entities";
import { CreateAppointmentDto } from "../dtos/appointment/create-appointment.dto";
import { UpdateAppointmentDto } from "../dtos/appointment/update-appointment.dto";
import { CardService } from "./card.service";

@Injectable()
export class AppointmentService {
	private readonly logger = new Logger(AppointmentService.name);

	constructor(
		@InjectRepository(Appointment)
		private readonly appointmentRepository: Repository<Appointment>,
		@InjectRepository(Visitor)
		private readonly visitorRepository: Repository<Visitor>,
		@InjectRepository(Employee)
		private readonly employeeRepository: Repository<Employee>,
		@Inject(forwardRef(() => CardService))
		private readonly cardService: CardService,
	) {}

	async create(createDto: CreateAppointmentDto): Promise<Appointment> {
		// Verificar que el visitor existe
		const visitor = await this.visitorRepository.findOne({
			where: { id: createDto.visitor_id },
		});
		if (!visitor) {
			throw new NotFoundException(`Visitante con ID ${createDto.visitor_id} no encontrado`);
		}

		// Verificar que el host employee existe (si se proporciona)
		if (createDto.host_employee_id) {
			const hostEmployee = await this.employeeRepository.findOne({
				where: { id: createDto.host_employee_id },
			});
			if (!hostEmployee) {
				throw new NotFoundException(`Empleado con ID ${createDto.host_employee_id} no encontrado`);
			}
		}

		const appointment = this.appointmentRepository.create({
			title: createDto.title,
			description: createDto.description,
			scheduled_time: new Date(createDto.scheduled_time),
			location: createDto.location,
			visitor_id: createDto.visitor_id,
			host_employee_id: createDto.host_employee_id,
			supplier_id: createDto.supplier_id,
			status: "pendiente",
		});

		return this.appointmentRepository.save(appointment);
	}

	async findAll(supplierId?: string): Promise<Appointment[]> {
		const where = supplierId ? { supplier_id: supplierId, archived: false } : { archived: false };

		return this.appointmentRepository.find({
			where,
			relations: ["visitor", "visitor.card", "host_employee", "supplier"],
			order: { scheduled_time: "DESC" },
		});
	}

	async findOne(id: string): Promise<Appointment> {
		const appointment = await this.appointmentRepository.findOne({
			where: { id },
			relations: ["visitor", "visitor.card", "host_employee", "supplier"],
		});

		if (!appointment) {
			throw new NotFoundException(`Cita con ID ${id} no encontrada`);
		}

		return appointment;
	}

	async findByDateRange(startDate: Date, endDate: Date, supplierId?: string): Promise<Appointment[]> {
		const where = supplierId
			? {
					supplier_id: supplierId,
					scheduled_time: Between(startDate, endDate),
			  }
			: {
					scheduled_time: Between(startDate, endDate),
			  };

		return this.appointmentRepository.find({
			where,
			relations: ["visitor", "visitor.card", "host_employee"],
			order: { scheduled_time: "ASC" },
		});
	}

	async findUpcoming(limit: number = 10, supplierId?: string): Promise<Appointment[]> {
		const where = supplierId
			? {
					supplier_id: supplierId,
					status: "pendiente",
					scheduled_time: MoreThanOrEqual(new Date()),
			  }
			: {
					status: "pendiente",
					scheduled_time: MoreThanOrEqual(new Date()),
			  };

		return this.appointmentRepository.find({
			where,
			relations: ["visitor", "host_employee"],
			order: { scheduled_time: "ASC" },
			take: limit,
		});
	}

	async update(id: string, updateDto: UpdateAppointmentDto): Promise<Appointment> {
		const appointment = await this.findOne(id);

		// Si se actualiza el host employee, verificar que existe
		if (updateDto.host_employee_id) {
			const hostEmployee = await this.employeeRepository.findOne({
				where: { id: updateDto.host_employee_id },
			});
			if (!hostEmployee) {
				throw new NotFoundException(`Empleado con ID ${updateDto.host_employee_id} no encontrado`);
			}
		}

		// Actualizar campos
		if (updateDto.title) appointment.title = updateDto.title;
		if (updateDto.description) appointment.description = updateDto.description;
		if (updateDto.scheduled_time) appointment.scheduled_time = new Date(updateDto.scheduled_time);
		if (updateDto.location) appointment.location = updateDto.location;
		if (updateDto.status) appointment.status = updateDto.status;
		if (updateDto.host_employee_id) appointment.host_employee_id = updateDto.host_employee_id;
		if (updateDto.check_in_time) appointment.check_in_time = new Date(updateDto.check_in_time);
		if (updateDto.check_out_time) appointment.check_out_time = new Date(updateDto.check_out_time);

		return this.appointmentRepository.save(appointment);
	}

	async checkIn(id: string): Promise<Appointment> {
		const appointment = await this.findOne(id);

		if (appointment.status !== "pendiente") {
			throw new BadRequestException("Solo se puede hacer check-in en citas pendientes");
		}

		// Verificar si el visitante tiene tarjeta asignada
		const visitor = await this.visitorRepository.findOne({
			where: { id: appointment.visitor_id },
			relations: ["card"],
		});

		if (!visitor) {
			throw new NotFoundException(`Visitante con ID ${appointment.visitor_id} no encontrado`);
		}

		// Asignar tarjeta automáticamente si no tiene una
		if (!visitor.card) {
			try {
				const availableCards = await this.cardService.findAvailableCards();

				if (availableCards.length > 0) {
					// Asignar la primera tarjeta disponible
					await this.cardService.assignToVisitor(availableCards[0].id, visitor.id);
					this.logger.log(`Tarjeta ${availableCards[0].id} asignada automáticamente al visitante ${visitor.id} en check-in de cita ${id}`);
				} else {
					this.logger.warn(`No hay tarjetas disponibles para asignar al visitante ${visitor.id} en check-in de cita ${id}`);
				}
			} catch (error) {
				this.logger.error(`Error al asignar tarjeta en check-in: ${error.message}`);
				// No lanzamos error para que el check-in continúe aunque falle la asignación
			}
		}

		appointment.check_in_time = new Date();
		appointment.status = "en_progreso";

		return this.appointmentRepository.save(appointment);
	}

	async checkOut(id: string): Promise<Appointment> {
		const appointment = await this.findOne(id);

		if (appointment.status !== "en_progreso") {
			throw new BadRequestException("Solo se puede hacer check-out en citas en progreso");
		}

		// Verificar si el visitante tiene tarjeta asignada y liberarla
		const visitor = await this.visitorRepository.findOne({
			where: { id: appointment.visitor_id },
			relations: ["card"],
		});

		if (visitor && visitor.card) {
			try {
				await this.cardService.unassignFromVisitor(visitor.card.id);
				this.logger.log(`Tarjeta ${visitor.card.id} liberada del visitante ${visitor.id} en check-out de cita ${id}`);
			} catch (error) {
				this.logger.error(`Error al liberar tarjeta en check-out: ${error.message}`);
				// No lanzamos error para que el check-out continúe aunque falle la liberación
			}
		}

		appointment.check_out_time = new Date();
		appointment.status = "completado";

		return this.appointmentRepository.save(appointment);
	}

	async cancel(id: string): Promise<Appointment> {
		const appointment = await this.findOne(id);

		if (appointment.status === "completado") {
			throw new BadRequestException("No se puede cancelar una cita completada");
		}

		appointment.status = "cancelado";

		return this.appointmentRepository.save(appointment);
	}

	async delete(id: string): Promise<void> {
		const appointment = await this.findOne(id);
		await this.appointmentRepository.remove(appointment);
	}

	/**
	 * Archive completed appointments older than 12 hours
	 */
	async findArchived(supplierId?: string): Promise<Appointment[]> {
		const where = supplierId ? { supplier_id: supplierId, archived: true } : { archived: true };

		return this.appointmentRepository.find({
			where,
			relations: ["visitor", "visitor.card", "host_employee", "supplier"],
			order: { check_out_time: "DESC" },
		});
	}

	async archiveOldAppointments(supplierId?: string): Promise<{ archived: number }> {
		const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

		const where = supplierId
			? {
					supplier_id: supplierId,
					status: "completado",
					archived: false,
			  }
			: {
					status: "completado",
					archived: false,
			  };

		// Find all completed appointments with check_out_time older than 12 hours
		const appointmentsToArchive = await this.appointmentRepository
			.createQueryBuilder("appointment")
			.where(where)
			.andWhere("appointment.check_out_time < :twelveHoursAgo", { twelveHoursAgo })
			.getMany();

		if (appointmentsToArchive.length === 0) {
			return { archived: 0 };
		}

		// Mark them as archived
		await this.appointmentRepository
			.createQueryBuilder()
			.update(Appointment)
			.set({ archived: true })
			.whereInIds(appointmentsToArchive.map((a) => a.id))
			.execute();

		return { archived: appointmentsToArchive.length };
	}
}
