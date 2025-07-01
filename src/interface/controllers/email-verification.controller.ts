import {
	Controller,
	Post,
	Get,
	Param,
	UseGuards,
	Req,
	HttpCode,
	HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { AuthGuard } from "src/application/guards/auth.guard";
import { EmailVerificationService } from "../../application/services/email-verification.service";

@ApiTags("email-verification")
@Controller("email-verification")
export class EmailVerificationController {
	constructor(
		private readonly emailVerificationService: EmailVerificationService,
	) {}

	@Post("send")
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Enviar email de verificación",
		description:
			"Envía un email con el enlace de verificación al empleado actual",
	})
	@ApiResponse({
		status: 200,
		description: "Email de verificación enviado exitosamente",
	})
	async sendVerificationEmail(@Req() req) {
		const employeeId = req.user.id;
		return this.emailVerificationService.sendVerificationEmail(employeeId);
	}

	@Get("verify/:token")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Verificar email",
		description: "Verifica el email usando el token enviado por correo",
	})
	@ApiParam({
		name: "token",
		description: "Token de verificación enviado por email",
	})
	@ApiResponse({
		status: 200,
		description: "Email verificado exitosamente",
	})
	async verifyEmail(@Param("token") token: string) {
		return this.emailVerificationService.verifyEmail(token);
	}

	@Post("resend")
	@UseGuards(AuthGuard)
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Reenviar email de verificación",
		description: "Reenvía el email de verificación al empleado actual",
	})
	@ApiResponse({
		status: 200,
		description: "Email de verificación reenviado exitosamente",
	})
	async resendVerificationEmail(@Req() req) {
		const employeeId = req.user.id;
		return this.emailVerificationService.resendVerificationEmail(employeeId);
	}
}
