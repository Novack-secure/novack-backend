import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Supplier } from "../../domain/entities/supplier.entity";
import { SupplierSubscription } from "../../domain/entities/supplier-subscription.entity";
import { ISupplierRepository } from "../../domain/repositories/supplier.repository.interface";

@Injectable()
export class SupplierRepository implements ISupplierRepository {
	constructor(
		@InjectRepository(Supplier)
		private readonly supplierRepository: Repository<Supplier>,
		@InjectRepository(SupplierSubscription)
		private readonly subscriptionRepository: Repository<SupplierSubscription>,
	) {}

	async findById(id: string): Promise<Supplier | null> {
		return this.supplierRepository.findOne({
			where: { id },
			relations: ["subscription", "employees"],
		});
	}

	async findByName(name: string): Promise<Supplier | null> {
		return this.supplierRepository.findOne({
			where: { supplier_name: name },
		});
	}

	async findAll(): Promise<Supplier[]> {
		return this.supplierRepository.find();
	}

	create(createSupplierData: Partial<Supplier>): Supplier {
		return this.supplierRepository.create(createSupplierData);
	}

	async save(supplier: Supplier): Promise<Supplier> {
		return this.supplierRepository.save(supplier);
	}

	async remove(supplier: Supplier): Promise<void> {
		await this.supplierRepository.remove(supplier);
	}

	async saveSubscription(
		subscription: SupplierSubscription,
	): Promise<SupplierSubscription> {
		return this.subscriptionRepository.save(subscription);
	}

	createSubscription(
		createSubscriptionData: Partial<SupplierSubscription>,
	): SupplierSubscription {
		return this.subscriptionRepository.create(createSubscriptionData);
	}
}
