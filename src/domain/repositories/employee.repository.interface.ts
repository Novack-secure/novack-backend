/**
 * Interfaz para el repositorio de empleados
 *
 * Define los métodos que debe implementar cualquier repositorio que maneje
 * la persistencia de entidades de tipo Employee, siguiendo el principio de
 * inversión de dependencias de Clean Architecture.
 */

import { Employee } from '../entities/employee.entity';
import { EmployeeCredentials } from '../entities/employee-credentials.entity';

export interface IEmployeeRepository {
  findAll(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  findByEmail(email: string): Promise<Employee | null>;
  create(employee: Partial<Employee>): Promise<Employee>;
  update(id: string, employee: Partial<Employee>): Promise<Employee>;
  delete(id: string): Promise<void>;
  findBySupplier(supplierId: string): Promise<Employee[]>;
  updateCredentials(
    employeeId: string,
    credentials: Partial<EmployeeCredentials>,
  ): Promise<void>;
  findByVerificationToken(token: string): Promise<Employee | null>;
  findByResetToken(token: string): Promise<Employee | null>;

  /**
   * Busca un empleado por email incluyendo sus credenciales y número de teléfono
   * @param email El email del empleado
   * @returns El empleado con sus credenciales o null si no se encuentra
   */
  findByEmailWithCredentialsAndPhone(email: string): Promise<Employee | null>;

  /**
   * Busca un empleado por ID incluyendo sus credenciales y número de teléfono
   * @param id El ID del empleado
   * @returns El empleado con sus credenciales o null si no se encuentra
   */
  findByIdWithCredentialsAndPhone(id: string): Promise<Employee | null>;

  /**
   * Busca un empleado por ID incluyendo sus credenciales
   * @param id El ID del empleado
   * @returns El empleado con sus credenciales o null si no se encuentra
   */
  findByIdWithCredentials(id: string): Promise<Employee | null>;

  /**
   * Saves an employee entity. If the entity has an ID and exists in the database, it's updated.
   * Otherwise, it's inserted. This method should handle cascading saves for related entities
   * like EmployeeCredentials if they are part of the Employee aggregate and configured with cascades.
   * @param employee The employee entity to save.
   * @returns The saved employee entity.
   */
  save(employee: Employee): Promise<Employee>;
}

export const IEmployeeRepository = Symbol('IEmployeeRepository');
