import {
	Injectable,
	NestMiddleware,
	UnauthorizedException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { CsrfService } from "../services/csrf.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
	constructor(
		private readonly csrfService: CsrfService,
		private readonly configService: ConfigService,
	) {}

	use(req: Request, res: Response, next: NextFunction) {
		// Excluir métodos que no necesitan protección CSRF
		if (
			req.method === "GET" ||
			req.method === "HEAD" ||
			req.method === "OPTIONS"
		) {
			return next();
		}

		// Verificar si la ruta debe ser excluida (por ejemplo, APIs para dispositivos móviles o externas)
		const excludedRoutes = this.configService.get<string[]>(
			"CSRF_EXCLUDED_ROUTES",
			[],
		);
		if (excludedRoutes.some((route) => req.path.startsWith(route))) {
			return next();
		}

		// Obtener el secreto de la sesión
		const secret = req.session?.csrfSecret;
		if (!secret) {
			throw new UnauthorizedException("Sesión no válida");
		}

		// Obtener el token CSRF del header o del body
		const token =
			(req.headers["x-csrf-token"] as string) ||
			(req.headers["x-xsrf-token"] as string) ||
			req.body._csrf;

		if (!token) {
			throw new UnauthorizedException("Token CSRF no proporcionado");
		}

		// Verificar el token
		if (!this.csrfService.verifyToken(secret, token)) {
			throw new UnauthorizedException("Token CSRF inválido");
		}

		// Si todo está bien, continuar
		next();
	}
}
