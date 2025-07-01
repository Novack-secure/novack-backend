import { Controller, Get, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { CsrfService } from "../../application/services/csrf.service";
import { Public } from "../../application/decorators/public.decorator";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("csrf")
@Controller("csrf")
export class CsrfController {
	constructor(private readonly csrfService: CsrfService) {}

	@Public()
	@Get("token")
	@ApiOperation({ summary: "Obtener un nuevo token CSRF" })
	@ApiResponse({
		status: 200,
		description: "Token CSRF generado exitosamente",
	})
	getToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		// Generar un nuevo secreto CSRF si no existe
		if (!req.session.csrfSecret) {
			req.session.csrfSecret = this.csrfService.generateSecret();
		}

		// Generar un token basado en el secreto
		const token = this.csrfService.generateToken(req.session.csrfSecret);

		// Establecer una cookie con el token CSRF (opcional, para aplicaciones frontend)
		res.cookie("XSRF-TOKEN", token, {
			httpOnly: false, // Debe ser accesible por JavaScript
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
		});

		return { csrf_token: token };
	}
}
