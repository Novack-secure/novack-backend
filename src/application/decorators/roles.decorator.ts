import { SetMetadata } from "@nestjs/common";

/**
 * Decorador para especificar los roles requeridos para acceder a un endpoint
 *
 * @example
 * @Roles("Admin", "Manager")
 * @Get()
 * findAll() {
 *   return this.service.findAll();
 * }
 */
export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
