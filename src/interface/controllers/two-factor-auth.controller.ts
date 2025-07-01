import {
	Controller,
	Post,
	Body,
	UseGuards,
	Req,
	HttpCode,
	HttpStatus,
	Query,
	BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { AuthGuard } from "src/application/guards/auth.guard";
import { TwoFactorAuthService } from "../../application/services/two-factor-auth.service";
import {
	Enable2FADto,
	Verify2FADto,
	Disable2FADto,
	BackupCodeDto,
	// Import new DTOs for SMS 2FA
	InitiateSmsVerificationDto,
	VerifySmsOtpDto,
} from "../../application/dtos/employee/two-factor-auth.dto";

@ApiTags("Autenticación de Dos Factores (2FA)") // Updated Tag for clarity
@Controller("2fa")
@UseGuards(AuthGuard)
export class TwoFactorAuthController {
	constructor(private readonly twoFactorAuthService: TwoFactorAuthService) {}

	// --- TOTP Endpoints (existing) ---

	@Post("generate")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Generar configuración 2FA",
		description:
			"Genera un nuevo secreto 2FA usando TOTP (por defecto) o Email",
	})
	@ApiQuery({
		name: "method",
		enum: ["totp", "email"],
		required: false,
		description: "Método de autenticación de dos factores",
	})
	@ApiResponse({
		status: 200,
		description: "Configuración 2FA generada exitosamente",
	})
	async generate(@Req() req, @Query("method") method?: "totp" | "email") {
		const employeeId = req.user.id;

		if (method && !["totp", "email"].includes(method)) {
			throw new BadRequestException('Método no válido. Use "totp" o "email"');
		}

		return this.twoFactorAuthService.generateTwoFactorSecret(
			employeeId,
			method as "totp" | "email",
		);
	}

	@Post("enable")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Activar 2FA",
		description:
			"Activa 2FA para el empleado actual usando el código de verificación",
	})
	@ApiResponse({
		status: 200,
		description: "2FA activado exitosamente",
	})
	async enable(@Req() req, @Body() enable2FADto: Enable2FADto) {
		const employeeId = req.user.id;
		return this.twoFactorAuthService.enable2FA(employeeId, enable2FADto.code);
	}

	@Post("verify")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Verificar código 2FA",
		description: "Verifica el código de autenticación",
	})
	@ApiResponse({
		status: 200,
		description: "Código verificado exitosamente",
	})
	async verify(@Req() req, @Body() verify2FADto: Verify2FADto) {
		const employeeId = req.user.id;
		const result = await this.twoFactorAuthService.verify2FA(
			employeeId,
			verify2FADto.code,
		);

		return { isValid: result };
	}

	@Post("disable")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Desactivar 2FA",
		description: "Desactiva 2FA para el empleado actual",
	})
	@ApiResponse({
		status: 200,
		description: "2FA desactivado exitosamente",
	})
	async disable(@Req() req, @Body() disable2FADto: Disable2FADto) {
		const employeeId = req.user.id;
		return this.twoFactorAuthService.disable2FA(employeeId, disable2FADto.code);
	}

	@Post("backup-code")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Generar código de respaldo",
		description: "Genera un nuevo código de respaldo para emergencias",
	})
	@ApiResponse({
		status: 200,
		description: "Código de respaldo generado exitosamente",
	})
	async generateBackupCode(@Req() req) {
		const employeeId = req.user.id;
		const backupCode =
			await this.twoFactorAuthService.generateBackupCode(employeeId);
		return { backupCode };
	}

	@Post("verify-backup")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Verificar código de respaldo",
		description: "Verifica un código de respaldo y lo marca como usado",
	})
	@ApiResponse({
		status: 200,
		description: "Resultado de verificación",
	})
	async verifyBackupCode(@Req() req, @Body() backupCodeDto: BackupCodeDto) {
		const employeeId = req.user.id;
		const isValid = await this.twoFactorAuthService.verifyBackupCode(
			employeeId,
			backupCodeDto.code,
		);

		return { isValid };
	}

	// --- SMS 2FA Endpoints (new) ---

	@Post("sms/initiate-verification")
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({
		summary: "Iniciar verificación de teléfono por SMS para 2FA",
	})
	@ApiResponse({
		status: 204,
		description:
			"SMS OTP enviado exitosamente al número de teléfono proporcionado.",
	})
	@ApiResponse({
		status: 400,
		description:
			"Solicitud incorrecta (ej. número de teléfono inválido, empleado no encontrado)",
	})
	@ApiResponse({
		status: 500,
		description: "Error interno al enviar SMS (ej. fallo del proveedor de SMS)",
	})
	async initiateSmsVerification(
		@Req() req,
		@Body() dto: InitiateSmsVerificationDto,
	): Promise<void> {
		const employeeId = req.user.id; // Assumes AuthGuard adds user to request
		await this.twoFactorAuthService.initiateSmsVerification(
			employeeId,
			dto.phone_number,
		);
	}

	@Post("sms/verify-phone")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Verificar OTP por SMS para confirmar número de teléfono",
	})
	@ApiResponse({
		status: 200,
		description: "Número de teléfono verificado exitosamente.",
		schema: { properties: { verified: { type: "boolean" } } },
	})
	@ApiResponse({
		status: 400,
		description: "Solicitud incorrecta (ej. OTP inválido, OTP expirado)",
	})
	async verifySmsOtp(
		@Req() req,
		@Body() dto: VerifySmsOtpDto,
	): Promise<{ verified: boolean }> {
		const employeeId = req.user.id;
		const result = await this.twoFactorAuthService.verifySmsOtpForPhoneNumber(
			employeeId,
			dto.otp,
		);
		return { verified: result };
	}

	@Post("sms/enable")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Habilitar 2FA basado en SMS para el usuario autenticado",
	})
	@ApiResponse({
		status: 200,
		description: "2FA por SMS habilitado exitosamente.",
		schema: { properties: { sms2faEnabled: { type: "boolean" } } },
	})
	@ApiResponse({
		status: 400,
		description: "Solicitud incorrecta (ej. teléfono no verificado)",
	})
	async enableSmsTwoFactor(@Req() req): Promise<{ sms2faEnabled: boolean }> {
		const employeeId = req.user.id;
		const result =
			await this.twoFactorAuthService.enableSmsTwoFactor(employeeId);
		return { sms2faEnabled: result };
	}

	@Post("sms/disable")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Deshabilitar 2FA basado en SMS para el usuario autenticado",
	})
	@ApiResponse({
		status: 200,
		description: "2FA por SMS deshabilitado exitosamente.",
		schema: { properties: { sms2faEnabled: { type: "boolean" } } },
	})
	@ApiResponse({
		status: 400,
		description: "Solicitud incorrecta (ej. SMS 2FA no está activo)",
	})
	async disableSmsTwoFactor(@Req() req): Promise<{ sms2faEnabled: boolean }> {
		const employeeId = req.user.id;
		await this.twoFactorAuthService.disableSmsTwoFactor(employeeId);
		return { sms2faEnabled: false }; // Reflecting the new state
	}
}
