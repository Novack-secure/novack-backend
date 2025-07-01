import {
	Controller,
	Post,
	Body,
	UnauthorizedException,
	Req,
	HttpStatus,
	HttpCode,
} from "@nestjs/common"; // Res removed as not used
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBody,
	ApiProperty,
} from "@nestjs/swagger"; // ApiProperty import for inline DTOs if needed, but we'll use external
// AuthenticationResult type import removed, will use AuthenticationResultDto
import {
	AuthenticateEmployeeUseCase,
	AuthenticateEmployeeDto,
} from "../../application/use-cases/auth/authenticate-employee.use-case";
import { Public } from "../../application/decorators/public.decorator";
import { Request } from "express"; // Response removed as not used
import { AuthService } from "../../application/services/auth.service";
// Import the DTOs from their actual location
import { RefreshTokenDto } from "../../application/dtos/auth/refresh-token.dto";
import { LogoutDto } from "../../application/dtos/auth/logout.dto";
import { LoginSmsVerifyDto } from "../../application/dtos/auth/login.dto"; // Import new DTO
import { AuthenticationResultDto } from "../../application/dtos/auth/authentication-result.dto"; // Import DTO

// Define a more complex response type for login that can include OTP requirement
const LoginResponseSchema = {
	oneOf: [
		{ $ref: `#/components/schemas/${AuthenticationResultDto.name}` }, // Use DTO name for ref
		{
			type: "object",
			properties: {
				message: { type: "string", example: "SMS OTP verification required." },
				smsOtpRequired: { type: "boolean", example: true },
				userId: {
					type: "string",
					example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
				},
			},
		},
	],
};

@ApiTags("Autenticación")
@Controller("auth")
export class AuthController {
	// Ensure AuthenticationResult is defined somewhere accessible for Swagger, e.g. in a DTO file or as a class.
	// For now, assuming it's defined in the use-case file and Swagger can pick it up or it's manually described.
	constructor(
		private readonly authenticateEmployeeUseCase: AuthenticateEmployeeUseCase,
		private readonly authService: AuthService, // Inject AuthService for refresh/logout
	) {}

	@Post("login")
	@Public()
	@ApiOperation({
		summary:
			"Autenticar empleado. Puede devolver tokens o requerir verificación OTP por SMS.",
	})
	@ApiResponse({
		status: 200,
		description:
			"Autenticación exitosa (tokens emitidos) o se requiere OTP por SMS.",
		schema: LoginResponseSchema, // Use the combined schema
	})
	@ApiResponse({
		status: 401,
		description: "Credenciales inválidas o email no verificado",
	})
	@ApiResponse({
		status: 500,
		description: "Error interno (ej. fallo al enviar SMS OTP)",
	})
	async login(
		@Body() credentials: AuthenticateEmployeeDto,
		@Req() req: Request,
	) {
		try {
			// Pass request object to use case
			return await this.authenticateEmployeeUseCase.execute(credentials, req);
		} catch (error) {
			// Use case now re-throws HttpExceptions from AuthService
			throw error;
		}
	}

	@Post("refresh-token")
	@Public()
	@ApiOperation({ summary: "Refrescar access token usando un refresh token" })
	@ApiBody({ type: RefreshTokenDto }) // Use the imported DTO
	@ApiResponse({
		status: 200,
		description: "Token refrescado exitosamente",
		type: AuthenticationResultDto,
	})
	@ApiResponse({
		status: 401,
		description: "Refresh token inválido o expirado",
	})
	async refreshToken(
		@Body() refreshTokenDto: RefreshTokenDto,
		@Req() req: Request,
	) {
		// Validation for refresh_token presence is now handled by ValidationPipe if DTO uses class-validator
		try {
			return await this.authService.refreshToken(
				refreshTokenDto.refresh_token,
				req,
			);
		} catch (error) {
			throw new UnauthorizedException(
				error.message || "Error al refrescar el token",
			);
		}
	}

	@Post("logout")
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: "Invalidar refresh token (logout)" })
	@ApiBody({ type: LogoutDto }) // Use the imported DTO
	@ApiResponse({
		status: 200,
		description: "Logout exitoso, refresh token invalidado",
	})
	// No specific 400 for missing token if class-validator handles it.
	// AuthService also has a check.
	async logout(@Body() logoutDto: LogoutDto) {
		// Validation for refresh_token presence is now handled by ValidationPipe
		return await this.authService.logout(logoutDto.refresh_token);
	}

	@Post("login/sms-verify")
	@Public() // This endpoint must be public as the user is not fully logged in yet
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Verificar OTP por SMS y completar el inicio de sesión",
	})
	@ApiBody({ type: LoginSmsVerifyDto })
	// The response here should be the AuthenticationResult upon successful OTP verification
	@ApiResponse({
		status: 200,
		description:
			"Inicio de sesión exitoso después de la verificación del OTP por SMS.",
		type: AuthenticationResultDto,
	})
	@ApiResponse({
		status: 401,
		description:
			"No autorizado (ej. OTP inválido, OTP expirado, usuario no encontrado)",
	})
	async loginSmsVerify(
		@Body() loginSmsVerifyDto: LoginSmsVerifyDto,
		@Req() req: Request,
	): Promise<AuthenticationResultDto> {
		// Pass the original request object if your TokenService needs it for generating tokens
		// The return type of authService.verifySmsOtpAndLogin should also align with AuthenticationResultDto
		return this.authService.verifySmsOtpAndLogin(
			loginSmsVerifyDto.userId,
			loginSmsVerifyDto.otp,
			req,
		);
	}
}
