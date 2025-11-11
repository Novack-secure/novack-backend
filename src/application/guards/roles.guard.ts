import {
	Injectable,
	CanActivate,
	ExecutionContext,
	ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "../../domain/entities/employee.entity";

/**
 * Guard para validar que el usuario tenga uno de los roles requeridos
 *
 * Este guard debe usarse después del AuthGuard para asegurar que
 * request.user esté disponible.
 *
 * @example
 * @UseGuards(AuthGuard, RolesGuard)
 * @Roles("Admin", "Manager")
 * @Get()
 * findAll() {}
 */
@Injectable()
export class RolesGuard implements CanActivate {
	constructor(
		private reflector: Reflector,
		@InjectRepository(Employee)
		private employeeRepository: Repository<Employee>,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		// Obtener los roles requeridos del decorador
		const requiredRoles = this.reflector.getAllAndOverride<string[]>(
			ROLES_KEY,
			[context.getHandler(), context.getClass()],
		);

		// Si no hay roles requeridos, permitir acceso
		if (!requiredRoles || requiredRoles.length === 0) {
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

		// Cargar el empleado con su rol
		const employee = await this.employeeRepository.findOne({
			where: { id: user.sub },
			relations: ["role"],
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

		// Verificar si el empleado tiene uno de los roles requeridos
		const hasRole = requiredRoles.includes(employee.role.name);

		if (!hasRole) {
			throw new ForbiddenException(
				`Se requiere uno de los siguientes roles: ${requiredRoles.join(", ")}`,
			);
		}

		// Agregar el rol al request para uso posterior
		request.userRole = employee.role;

		return true;
	}
}
