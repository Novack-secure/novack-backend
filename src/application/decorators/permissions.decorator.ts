import { SetMetadata } from "@nestjs/common";

/**
 * Decorador para especificar los permisos requeridos para acceder a un endpoint
 *
 * @example
 * @Permissions("employees.read", "employees.update")
 * @Get()
 * findAll() {
 *   return this.service.findAll();
 * }
 */
export const PERMISSIONS_KEY = "permissions";
export const Permissions = (...permissions: string[]) =>
	SetMetadata(PERMISSIONS_KEY, permissions);
