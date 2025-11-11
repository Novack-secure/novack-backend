/**
 * Índice de repositorios
 *
 * Este archivo exporta todas las implementaciones de repositorios de infraestructura
 * para facilitar su importación y registro en los módulos.
 */

// Repositorios principales
export * from "./employee.repository";
export * from "./visitor.repository"; // Added export
export * from "./appointment.repository"; // Added export
export * from "./supplier.repository"; // Exportando el repositorio de proveedores
export * from "./role.repository";
export * from "./permission.repository";
// Otros repositorios se añadirán a medida que se implementen
// export * from './card.repository'; // Example for when it's created

/**
 * Array con todos los proveedores de repositorios para inyección de dependencias
 */
import { EmployeeRepository } from "./employee.repository";
import { VisitorRepository } from "./visitor.repository"; // Added import
import { AppointmentRepository } from "./appointment.repository"; // Added import
import { SupplierRepository } from "./supplier.repository"; // Importando el repositorio de proveedores
import { RoleRepository } from "./role.repository";
import { PermissionRepository } from "./permission.repository";

export const REPOSITORIES = [
	EmployeeRepository,
	VisitorRepository, // Added to array
	AppointmentRepository, // Added to array
	SupplierRepository, // Añadido al array
	RoleRepository,
	PermissionRepository,
	// Agregar otros repositorios aquí
	// CardRepository,
];
