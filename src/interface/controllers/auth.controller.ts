import {
	Controller,
	Post,
	Body,
	UnauthorizedException,
	Req,
	HttpStatus,
	HttpCode,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiBody,
} from "@nestjs/swagger";
import {
	AuthenticateEmployeeUseCase,
	AuthenticateEmployeeDto,
} from "../../application/use-cases/auth/authenticate-employee.use-case";
import { Public } from "../../application/decorators/public.decorator";
import { Request } from "express";
import { AuthService } from "../../application/services/auth.service";
import { RefreshTokenDto } from "../../application/dtos/auth/refresh-token.dto";
import { LogoutDto } from "../../application/dtos/auth/logout.dto";
import { LoginSmsVerifyDto } from "../../application/dtos/auth/login.dto";
import { AuthenticationResultDto } from "../../application/dtos/auth/authentication-result.dto";
import { GoogleAuthDto } from "../../application/dtos/auth/google-auth.dto";

@ApiTags("Autenticación")
@Controller("auth")
export class AuthController {
	constructor(
		private readonly authenticateEmployeeUseCase: AuthenticateEmployeeUseCase,
		private readonly authService: AuthService,
	) {}

	@Post("login")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Autenticación de empleado",
		description: "Autentica un empleado con email y contraseña",
	})
	@ApiBody({ description: "Credenciales de autenticación" })
	@ApiResponse({
		status: 200,
		description: "Autenticación exitosa",
		type: AuthenticationResultDto,
	})
	@ApiResponse({
		status: 401,
		description: "Credenciales inválidas",
	})
	@ApiResponse({
		status: 400,
		description: "Datos de entrada inválidos",
	})
	async login(
		@Body() authenticateDto: AuthenticateEmployeeDto,
		@Req() req: Request,
	): Promise<any> {
		return this.authenticateEmployeeUseCase.execute(authenticateDto, req);
	}

	@Post("refresh")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Renovar token de acceso",
		description: "Renueva el token de acceso usando el refresh token",
	})
	@ApiBody({ type: RefreshTokenDto })
	@ApiResponse({
		status: 200,
		description: "Token renovado exitosamente",
		type: AuthenticationResultDto,
	})
	@ApiResponse({
		status: 401,
		description: "Refresh token inválido o expirado",
	})
	async refreshToken(
		@Body() refreshTokenDto: RefreshTokenDto,
	): Promise<AuthenticationResultDto> {
		return await this.authService.refreshToken(
			refreshTokenDto.refresh_token,
		);
	}

	@Post("logout")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Cerrar sesión",
		description: "Invalida el refresh token y cierra la sesión del usuario",
	})
	@ApiBody({ type: LogoutDto })
	@ApiResponse({
		status: 200,
		description: "Sesión cerrada exitosamente",
		schema: {
			example: {
				message: "Logout successful",
			},
		},
	})
	async logout(@Body() logoutDto: LogoutDto) {
		return await this.authService.logout(logoutDto.refresh_token);
	}

	@Post("verify-sms")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Verificar SMS OTP",
		description: "Verifica el código SMS OTP y completa el login",
	})
	@ApiBody({ type: LoginSmsVerifyDto })
	@ApiResponse({
		status: 200,
		description: "SMS OTP verificado exitosamente",
		type: AuthenticationResultDto,
	})
	@ApiResponse({
		status: 400,
		description: "Código SMS inválido o expirado",
	})
	@ApiResponse({
		status: 401,
		description: "Credenciales inválidas",
	})
	async verifySmsOtp(
		@Body() loginSmsVerifyDto: LoginSmsVerifyDto,
		@Req() req: Request,
	): Promise<AuthenticationResultDto> {
		return this.authService.verifySmsOtpAndLogin(
			loginSmsVerifyDto.email,
			loginSmsVerifyDto.sms_otp_code,
			req,
		);
	}

	@Post("google")
	@Public()
	@HttpCode(HttpStatus.OK)
	@ApiOperation({
		summary: "Autenticación con Google OAuth",
		description: "Autentica o registra un usuario usando Google OAuth",
	})
	@ApiBody({ type: GoogleAuthDto })
	@ApiResponse({
		status: 200,
		description: "Autenticación exitosa con Google",
		type: AuthenticationResultDto,
	})
	@ApiResponse({
		status: 400,
		description: "Datos de Google inválidos",
	})
	@ApiResponse({
		status: 500,
		description: "Error interno del servidor",
	})
	async googleAuth(
		@Body() googleAuthDto: GoogleAuthDto,
		@Req() req: Request,
	): Promise<any> {
		return this.authService.googleAuth(googleAuthDto, req);
	}
}