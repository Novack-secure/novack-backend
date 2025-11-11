/**
 * Interfaz para el repositorio de roles
 *
 * Define los métodos que debe implementar cualquier repositorio que maneje
 * la persistencia de entidades de tipo Role, siguiendo el principio de
 * inversión de dependencias de Clean Architecture.
 */

import { Role } from "../entities/role.entity";

export interface IRoleRepository {
	findAll(): Promise<Role[]>;
	findById(id: string): Promise<Role | null>;
	findByName(name: string, supplierId?: string): Promise<Role | null>;
	findBySupplier(supplierId: string): Promise<Role[]>;
	findSystemRoles(): Promise<Role[]>;
	create(role: Partial<Role>): Promise<Role>;
	update(id: string, role: Partial<Role>): Promise<Role>;
	delete(id: string): Promise<void>;
	assignPermissions(roleId: string, permissionIds: string[]): Promise<Role>;
	removePermissions(roleId: string, permissionIds: string[]): Promise<Role>;
}
