import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "../../domain/entities";
import { RefreshToken } from "src/domain/entities/refresh-token.entity";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import { Request } from "express";
import * as crypto from "crypto";

@Injectable()
export class TokenService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
		@InjectRepository(RefreshToken)
		private readonly refreshTokenRepository: Repository<RefreshToken>,
		@InjectRepository(Employee)
		private readonly employeeRepository: Repository<Employee>,
	) {}

	/**
	 * Genera un nuevo par de access token y refresh token
	 * @param employee Empleado para el cual generar los tokens
	 * @param request Objeto request para obtener información adicional
	 * @returns Los tokens generados
	 */
	async generateTokens(employee: Employee, request?: Request) {
		// Generar el payload con claims de seguridad mejorados
		const jwtPayload = {
			sub: employee.id,
			email: employee.email,
			name: `${employee.first_name} ${employee.last_name}`,
			supplier_id: employee.supplier?.id,
			is_creator: employee.is_creator,
			jti: uuidv4(), // JWT ID único para facilitar revocación
			iat: Math.floor(Date.now() / 1000),
		};

		// Generar access token con duración limitada
		const accessToken = this.jwtService.sign(jwtPayload, {
			expiresIn: this.configService.get("JWT_ACCESS_EXPIRATION", "15m"),
		});

		// Generar refresh token
		const refreshTokenString = this.generateRefreshTokenString();
		const refreshTokenExpiry = new Date();
		refreshTokenExpiry.setDate(
			refreshTokenExpiry.getDate() +
				parseInt(
					this.configService.get("JWT_REFRESH_EXPIRATION_DAYS", "7"),
					10,
				),
		);

		// Información de dispositivo y cliente para auditoria
		const userAgent = request?.headers["user-agent"] || null;
		const ip = request?.ip || request?.connection?.remoteAddress || null;

		// Guardar refresh token en base de datos
		const refreshToken = this.refreshTokenRepository.create({
			token: this.hashToken(refreshTokenString), // Guardar hash del token, no el token en sí
			employee_id: employee.id,
			expires_at: refreshTokenExpiry,
			user_agent: userAgent,
			ip: ip,
			device_info: {
				// Información adicional que podría ser útil para auditoría
				platform: request?.headers["sec-ch-ua-platform"] || null,
				mobile: request?.headers["sec-ch-ua-mobile"] || null,
			},
		});

		await this.refreshTokenRepository.save(refreshToken);

		return {
			access_token: accessToken,
			refresh_token: refreshTokenString,
			expires_in: 900, // 15 minutos en segundos
			token_type: "Bearer",
		};
	}

	/**
	 * Refresca el access token utilizando un refresh token válido
	 * @param refreshToken El token de refresco
	 * @param request Objeto de solicitud HTTP
	 * @returns Nuevos tokens generados
	 */
	async refreshAccessToken(refreshToken: string, request?: Request) {
		const hashedToken = this.hashToken(refreshToken);

		const storedToken = await this.refreshTokenRepository.findOne({
			where: { token: hashedToken },
			relations: ["employee"],
		});

		// Validaciones de seguridad
		if (!storedToken) {
			throw new UnauthorizedException("Token de refresco inválido");
		}

		if (storedToken.is_revoked) {
			// Posible reutilización de token, revocar todos los tokens del usuario
			await this.revokeAllUserTokens(storedToken.employee_id);
			throw new UnauthorizedException(
				"Token de refresco revocado, posible reutilización detectada",
			);
		}

		if (storedToken.expires_at < new Date()) {
			throw new UnauthorizedException("Token de refresco expirado");
		}

		// Revocamos el token actual para implementar rotación de tokens
		await this.refreshTokenRepository.update(storedToken.id, {
			is_revoked: true,
		});

		// Generar nuevos tokens
		return this.generateTokens(storedToken.employee, request);
	}

	/**
	 * Revoca un token de refresco específico
	 * @param refreshToken El token a revocar
	 */
	async revokeToken(refreshToken: string) {
		const hashedToken = this.hashToken(refreshToken);

		const result = await this.refreshTokenRepository.update(
			{ token: hashedToken, is_revoked: false },
			{ is_revoked: true },
		);

		return result.affected > 0;
	}

	/**
	 * Revoca todos los tokens de un usuario
	 * @param employeeId ID del usuario
	 */
	async revokeAllUserTokens(employeeId: string) {
		await this.refreshTokenRepository.update(
			{ employee_id: employeeId, is_revoked: false },
			{ is_revoked: true },
		);
	}

	/**
	 * Genera un string aleatorio para el refresh token
	 */
	private generateRefreshTokenString(): string {
		return uuidv4() + crypto.randomBytes(40).toString("hex");
	}

	/**
	 * Hash del token para almacenamiento seguro
	 * @param token Token a hashear
	 * @returns Token hasheado
	 */
	private hashToken(token: string): string {
		return crypto
			.createHash("sha256")
			.update(token + this.configService.get("JWT_SECRET"))
			.digest("hex");
	}

	/**
	 * Verifica si un token JWT es válido
	 * @param token Token JWT a verificar
	 * @returns Payload del token si es válido
	 */
	async validateToken(token: string) {
		try {
			const payload = await this.jwtService.verifyAsync(token);

			// Verificación adicional: comprobar que el usuario sigue existiendo
			const employeeExists = await this.employeeRepository.exists({
				where: { id: payload.sub },
			});

			if (!employeeExists) {
				throw new UnauthorizedException("Usuario no existe");
			}

			return payload;
		} catch (error) {
			throw new UnauthorizedException("Token inválido o expirado");
		}
	}
}
