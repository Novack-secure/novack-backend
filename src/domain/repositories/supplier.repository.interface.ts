import { Supplier } from "../entities/supplier.entity";
import { SupplierSubscription } from "../entities/supplier-subscription.entity";

export interface ISupplierRepository {
	/**
	 * Finds a supplier by its ID. Relations like 'subscription', 'employees' might be needed.
	 * @param id The ID of the supplier.
	 * @returns The supplier entity or null if not found.
	 */
	findById(id: string): Promise<Supplier | null>;

	/**
	 * Finds a supplier by its name.
	 * @param name The name of the supplier.
	 * @returns The supplier entity or null if not found.
	 */
	findByName(name: string): Promise<Supplier | null>;

	/**
	 * Finds all suppliers.
	 * @returns An array of supplier entities.
	 */
	findAll(): Promise<Supplier[]>;

	/**
	 * Creates a new supplier instance (in memory, not persisted).
	 * @param createSupplierData Partial data to create a supplier.
	 * @returns A new supplier instance.
	 */
	create(createSupplierData: Partial<Supplier>): Supplier; // Aligns with TypeORM's create

	/**
	 * Saves a supplier entity (creates if new, updates if existing).
	 * This should also handle saving related entities like SupplierSubscription if managed by this repository.
	 * @param supplier The supplier entity to save.
	 * @returns The saved supplier entity.
	 */
	save(supplier: Supplier): Promise<Supplier>;

	/**
	 * Removes a supplier entity.
	 * Consider implications for related entities like employees, subscriptions.
	 * @param supplier The supplier entity to remove.
	 * @returns A promise that resolves when removal is complete.
	 */
	remove(supplier: Supplier): Promise<void>;

	// Potentially methods for managing subscriptions if not in a separate SubscriptionRepository
	/**
	 * Saves a supplier subscription entity.
	 * @param subscription The supplier subscription entity to save.
	 * @returns The saved supplier subscription entity.
	 */
	saveSubscription(
		subscription: SupplierSubscription,
	): Promise<SupplierSubscription>;

	/**
	 * Creates a new supplier subscription instance.
	 * @param createSubscriptionData Partial data for the subscription.
	 * @returns A new supplier subscription instance.
	 */
	createSubscription(
		createSubscriptionData: Partial<SupplierSubscription>,
	): SupplierSubscription;
}

export const ISupplierRepository = Symbol("ISupplierRepository");
