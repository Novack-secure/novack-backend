/**
 * Interfaz para el repositorio de permisos
 *
 * Define los métodos que debe implementar cualquier repositorio que maneje
 * la persistencia de entidades de tipo Permission, siguiendo el principio de
 * inversión de dependencias de Clean Architecture.
 */

import { Permission } from "../entities/permission.entity";

export interface IPermissionRepository {
	findAll(): Promise<Permission[]>;
	findById(id: string): Promise<Permission | null>;
	findByName(name: string): Promise<Permission | null>;
	findByResource(resource: string): Promise<Permission[]>;
	findByIds(ids: string[]): Promise<Permission[]>;
	create(permission: Partial<Permission>): Promise<Permission>;
	update(id: string, permission: Partial<Permission>): Promise<Permission>;
	delete(id: string): Promise<void>;
}
