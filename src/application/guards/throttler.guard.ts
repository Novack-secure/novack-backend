import { Injectable, ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Guard personalizado para prevenir ataques de fuerza bruta y DoS
 * Implementa diferentes límites de tasa para diferentes rutas
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
	protected async getTracker(req: Record<string, any>): Promise<string> {
		// Utilizar IP para rastrear las peticiones
		// Considerar también utilizar X-Forwarded-For en caso de estar tras un proxy
		const ip =
			req.ip ||
			(req.headers["x-forwarded-for"]
				? req.headers["x-forwarded-for"].split(",")[0].trim()
				: "unknown");

		// Incluir ruta en el tracker para aplicar límites diferentes por ruta
		const path = req.route?.path || req.url;

		return `${ip}-${path}`;
	}

	protected errorMessage = "Demasiadas peticiones, por favor intente más tarde";
}
