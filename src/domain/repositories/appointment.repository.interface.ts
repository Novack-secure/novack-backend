import { Appointment } from '../entities/appointment.entity';

export interface IAppointmentRepository {
  /**
   * Saves an appointment entity (creates if new, updates if exists).
   * @param appointment The appointment entity to save.
   * @returns The saved appointment entity.
   */
  save(appointment: Appointment): Promise<Appointment>;

  /**
   * Creates a new appointment instance.
   * Note: This is typically for object instantiation. Persistence is done via save().
   * @param createAppointmentData Partial data to create an appointment.
   * @returns A new appointment instance (not yet persisted).
   */
  create(createAppointmentData: Partial<Appointment>): Appointment; // TypeORM's create is synchronous

  /**
   * Finds an appointment by its ID.
   * @param id The ID of the appointment.
   * @returns The appointment entity or null if not found.
   */
  findById(id: string): Promise<Appointment | null>;

  /**
   * Finds all appointments for a specific visitor.
   * @param visitorId The ID of the visitor.
   * @returns An array of appointment entities.
   */
  findByVisitorId(visitorId: string): Promise<Appointment[]>;

  /**
   * Finds all appointments for a specific supplier.
   * @param supplierId The ID of the supplier.
   * @returns An array of appointment entities.
   */
  findBySupplierId(supplierId: string): Promise<Appointment[]>;

  /**
   * Removes an appointment entity.
   * @param appointment The appointment entity to remove.
   * @returns A promise that resolves when removal is complete.
   */
  remove(appointment: Appointment): Promise<void>;
  // Alternatively, could be removeById(id: string): Promise<void>;

  // Add other essential methods, for example:
  // findUpcomingBySupplier(supplierId: string, date: Date): Promise<Appointment[]>;
  // findByDateRange(startDate: Date, endDate: Date, supplierId?: string): Promise<Appointment[]>;
}

export const IAppointmentRepository = Symbol('IAppointmentRepository');
