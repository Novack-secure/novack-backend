import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Visitor } from "../../domain/entities/visitor.entity";
import { IVisitorRepository } from "../../domain/repositories/visitor.repository.interface";

@Injectable()
export class VisitorRepository implements IVisitorRepository {
	constructor(
		@InjectRepository(Visitor)
		private readonly ormRepository: Repository<Visitor>,
	) {}

	create(createVisitorData: Partial<Visitor>): Visitor {
		// This method in TypeORM creates an entity instance but does not save it to the database.
		// The actual saving happens in the `save` method.
		return this.ormRepository.create(createVisitorData);
	}

	async save(visitor: Visitor): Promise<Visitor> {
		return this.ormRepository.save(visitor);
	}

	async findById(id: string): Promise<Visitor | null> {
		// Relations are crucial. Use cases often need related entities.
		// Adjust these based on what `GetVisitorDetailsUseCase` and other use cases expect.
		return this.ormRepository.findOne({
			where: { id },
			relations: [
				"supplier",
				"card",
				"appointments",
				"appointments.supplier", // Example of nested relation if needed
			],
		});
	}

	async findAll(): Promise<Visitor[]> {
		// Consider if all relations are always needed for a full list, or if a lighter version is better.
		// For now, including common relations as per existing service patterns.
		return this.ormRepository.find({
			relations: ["supplier", "card", "appointments"],
			// Add order by if needed, e.g., order: { created_at: 'DESC' }
		});
	}

	async findByEmail(email: string): Promise<Visitor | null> {
		return this.ormRepository.findOne({
			where: { email },
			relations: ["supplier", "card", "appointments"], // Consistent relations
		});
	}

	async findBySupplier(supplierId: string): Promise<Visitor[]> {
		return this.ormRepository.find({
			where: { supplier: { id: supplierId } }, // Querying by related entity ID
			relations: ["supplier", "card", "appointments"], // Load relations
			order: { created_at: "DESC" }, // As per original VisitorService logic
		});
	}

	async remove(visitor: Visitor): Promise<void> {
		// `remove` operation in TypeORM can take an entity or an array of entities.
		// It typically returns void or the removed entity/entities depending on the driver and options.
		// The interface expects Promise<void>.
		await this.ormRepository.remove(visitor);
	}

	// Example of a more specific query that might be needed:
	// async findActiveBySupplierWithUpcomingAppointments(supplierId: string): Promise<Visitor[]> {
	//   return this.ormRepository.createQueryBuilder('visitor')
	//     .leftJoinAndSelect('visitor.supplier', 'supplier')
	//     .leftJoinAndSelect('visitor.appointments', 'appointment')
	//     .where('supplier.id = :supplierId', { supplierId })
	//     .andWhere('visitor.state = :state', { state: 'en_progreso' }) // Example: only active visitors
	//     .andWhere('appointment.scheduled_time >= :now', { now: new Date() }) // Example: upcoming appointments
	//     .orderBy('appointment.scheduled_time', 'ASC')
	//     .getMany();
	// }
}
