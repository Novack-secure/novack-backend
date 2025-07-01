import {
	Injectable,
	NestMiddleware,
	HttpException,
	HttpStatus,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MoreThanOrEqual } from "typeorm";
import { LoginAttempt } from "src/domain/entities/login-attempt.entity";

/**
 * Middleware que protege contra ataques de fuerza bruta
 * limitando el número de intentos fallidos desde una misma IP.
 */
@Injectable()
export class BruteForceMiddleware implements NestMiddleware {
	private readonly MAX_ATTEMPTS = 5;
	private readonly COOLDOWN_TIME = 15 * 60 * 1000; // 15 minutos en milisegundos

	constructor(
		@InjectRepository(LoginAttempt)
		private readonly loginAttemptRepository: Repository<LoginAttempt>,
	) {}

	async use(req: Request, res: Response, next: NextFunction) {
		// Solo aplicar a ruta de login
		if (req.path === "/auth/login" && req.method === "POST") {
			const ip = req.ip || "unknown";

			// Buscar intentos recientes de esta IP
			const now = new Date();
			const cooldownDate = new Date(now.getTime() - this.COOLDOWN_TIME);

			const attempts = await this.loginAttemptRepository.count({
				where: {
					ip_address: ip,
					created_at: MoreThanOrEqual(cooldownDate),
					success: false,
				},
			});

			if (attempts >= this.MAX_ATTEMPTS) {
				// Registrar intento bloqueado
				const attempt = this.loginAttemptRepository.create({
					ip_address: ip,
					user_agent: req.headers["user-agent"] || "unknown",
					success: false,
					blocked: true,
					created_at: now,
				});

				await this.loginAttemptRepository.save(attempt);

				// Calcular tiempo restante en minutos
				const minutes = Math.ceil(this.COOLDOWN_TIME / 60000);

				throw new HttpException(
					`Demasiados intentos fallidos. Inténtelo de nuevo en ${minutes} minutos.`,
					HttpStatus.TOO_MANY_REQUESTS,
				);
			}

			// Intento no bloqueado, continuamos
			next();
		} else {
			// No es la ruta de login, continuamos
			next();
		}
	}
}
