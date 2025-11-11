import {
	Injectable,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "../../domain/entities/employee.entity";

/**
 * Guard para validar que el usuario tenga todos los permisos requeridos
 *
 * Este guard debe usarse después del AuthGuard para asegurar que
 * request.user esté disponible.
 *
 * @example
 * @UseGuards(AuthGuard, PermissionsGuard)
 * @Permissions("employees.read", "employees.update")
 * @Get()
 * findAll() {}
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		@InjectRepository(Employee)
		private employeeRepository: Repository<Employee>,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Obtener los permisos requeridos del decorador
		const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
			PERMISSIONS_KEY,
			[context.getHandler(), context.getClass()],
		);

		// Si no hay permisos requeridos, permitir acceso
		if (!requiredPermissions || requiredPermissions.length === 0) {
			return true;
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		// Si no hay usuario autenticado, denegar acceso
		if (!user || !user.sub) {
			throw new ForbiddenException(
				"No tienes permisos para acceder a este recurso",
			);
		}

		// Cargar el empleado con su rol y permisos
		const employee = await this.employeeRepository.findOne({
			where: { id: user.sub },
			relations: ["role", "role.permissions"],
		});

		if (!employee) {
			throw new ForbiddenException(
				"No tienes permisos para acceder a este recurso",
			);
		}

		// Si el empleado no tiene rol asignado, denegar acceso
		if (!employee.role) {
			throw new ForbiddenException(
				"No tienes un rol asignado. Contacta al administrador.",
			);
		}

		// Obtener los nombres de los permisos que tiene el usuario
		const userPermissions =
			employee.role.permissions?.map((p) => p.name) || [];

		// Verificar si el usuario tiene todos los permisos requeridos
		const hasAllPermissions = requiredPermissions.every((required) =>
			userPermissions.includes(required),
		);

		if (!hasAllPermissions) {
			const missingPermissions = requiredPermissions.filter(
				(required) => !userPermissions.includes(required),
			);
			throw new ForbiddenException(
				`Te faltan los siguientes permisos: ${missingPermissions.join(", ")}`,
			);
		}

		// Agregar los permisos al request para uso posterior
		request.userPermissions = userPermissions;

		return true;
	}
}
