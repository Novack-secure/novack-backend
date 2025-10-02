import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "../../domain/entities";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import { Request } from "express";

@Injectable()
export class TokenService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		@InjectRepository(Employee)
		private readonly employeeRepository: Repository<Employee>,
	) {}

	/**
	 * Genera un nuevo access token
	 * @param employee Empleado para el cual generar el token
	 * @param request Objeto request para obtener información adicional
	 * @returns El token generado
	 */
	async generateTokens(employee: Employee, request?: Request) {
		// Generar el payload con claims de seguridad mejorados
		const jwtPayload = {
			sub: employee.id,
			email: employee.email,
			name: `${employee.first_name} ${employee.last_name}`,
			supplier_id: employee.supplier?.id || employee.supplier_id,
			is_creator: employee.is_creator,
			jti: uuidv4(), // JWT ID único para cada token
			iat: Math.floor(Date.now() / 1000), // Issued at
		};

		// Generar access token con expiración de 15 minutos
		const accessToken = this.jwtService.sign(jwtPayload, {
			expiresIn: "15m",
		});

		// TODO: Actualizar último login del empleado en credentials si es necesario

		return {
			access_token: accessToken,
			expires_in: 900, // 15 minutos en segundos
		};
	}

	/**
	 * Valida un access token
	 * @param token Token a validar
	 * @returns Payload del token si es válido
	 */
	async validateToken(token: string) {
		try {
			const payload = this.jwtService.verify(token);
			return payload;
		} catch (error) {
			throw new UnauthorizedException("Token inválido o expirado");
		}
	}

	/**
	 * Obtiene el empleado desde el payload del token
	 * @param payload Payload del JWT
	 * @returns Empleado encontrado
	 */
	async getEmployeeFromPayload(payload: any): Promise<Employee> {
		const employee = await this.employeeRepository.findOne({
			where: { id: payload.sub },
			relations: ["supplier", "credentials"],
		});

		if (!employee) {
			throw new UnauthorizedException("Empleado no encontrado");
		}

		return employee;
	}
}