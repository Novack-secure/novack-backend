import { Visitor } from "../entities/visitor.entity";

export interface IVisitorRepository {
	/**
	 * Saves a visitor entity (creates if new, updates if exists).
	 * @param visitor The visitor entity to save.
	 * @returns The saved visitor entity.
	 */
	save(visitor: Visitor): Promise<Visitor>;

	/**
	 * Creates a new visitor instance.
	 * Note: This is typically for object instantiation. Persistence is done via save().
	 * @param createVisitorData Partial data to create a visitor.
	 * @returns A new visitor instance (not yet persisted).
	 */
	create(createVisitorData: Partial<Visitor>): Visitor; // TypeORM's create is synchronous

	/**
	 * Finds a visitor by its ID.
	 * @param id The ID of the visitor.
	 * @returns The visitor entity or null if not found.
	 */
	findById(id: string): Promise<Visitor | null>;

	/**
	 * Finds all visitors.
	 * @returns An array of visitor entities.
	 */
	findAll(): Promise<Visitor[]>;

	/**
	 * Finds a visitor by email.
	 * @param email The email of the visitor.
	 * @returns The visitor entity or null if not found.
	 */
	findByEmail(email: string): Promise<Visitor | null>;

	/**
	 * Finds all visitors associated with a specific supplier.
	 * @param supplierId The ID of the supplier.
	 * @returns An array of visitor entities.
	 */
	findBySupplier(supplierId: string): Promise<Visitor[]>;

	/**
	 * Removes a visitor entity.
	 * @param visitor The visitor entity to remove.
	 * @returns A promise that resolves when removal is complete.
	 */
	remove(visitor: Visitor): Promise<void>;
	// Alternatively, could be removeById(id: string): Promise<void>;

	// Add any other methods essential for visitor data operations from a domain perspective
	// For example:
	// countByState(state: string): Promise<number>;
}

export const IVisitorRepository = Symbol("IVisitorRepository");
