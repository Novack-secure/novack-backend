import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { IEmployeeRepository } from "../../domain/repositories/employee.repository.interface";
import { JwtService } from "@nestjs/jwt"; // Note: JwtService seems unused in this service. Consider removing.
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import { EmailService } from "./email.service";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Added import

@Injectable()
export class EmailVerificationService {
	constructor(
		@Inject("IEmployeeRepository")
		private readonly employeeRepository: IEmployeeRepository,
		private readonly jwtService: JwtService, // Unused?
		private readonly configService: ConfigService,
		private readonly emailService: EmailService,
		private readonly logger: StructuredLoggerService, // Added logger
	) {
		this.logger.setContext("EmailVerificationService"); // Set context
	}

	/**
	 * Genera un token de verificación de email
	 */
	async generateVerificationToken(employeeId: string): Promise<string> {
		const employee = await this.employeeRepository.findById(employeeId);

		if (!employee) {
			this.logger.warn(
				"Failed to generate email verification token: Employee not found",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("Empleado no encontrado");
		}

		if (employee.credentials?.is_email_verified) {
			this.logger.warn(
				"Failed to generate email verification token: Email already verified",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("El email ya está verificado");
		}

		// Generar token único
		const verificationToken = uuidv4();

		// Establecer fecha de expiración (24 horas)
		const expiresAt = new Date();
		expiresAt.setHours(expiresAt.getHours() + 24);

		// Guardar el token en las credenciales
		await this.employeeRepository.updateCredentials(employeeId, {
			verification_token: verificationToken,
			reset_token_expires: expiresAt,
		});

		this.logger.log(
			"Email verification token generated",
			undefined,
			JSON.stringify({ employeeId }),
		);
		return verificationToken;
	}

	/**
	 * Envía un email de verificación al empleado
	 */
	async sendVerificationEmail(employeeId: string): Promise<boolean> {
		this.logger.log(
			"Attempting to send verification email",
			undefined,
			JSON.stringify({ employeeId }),
		);
		const employee = await this.employeeRepository.findById(employeeId);

		if (!employee) {
			this.logger.warn(
				"Failed to send verification email: Employee not found",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("Empleado no encontrado");
		}

		if (employee.credentials?.is_email_verified) {
			this.logger.warn(
				"Failed to send verification email: Email already verified",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("El email ya está verificado");
		}

		// Generar token (this method already logs token generation)
		const verificationToken = await this.generateVerificationToken(employeeId);

		// Construir URL de verificación
		const baseUrl = this.configService.get(
			"FRONTEND_URL",
			"http://localhost:3000",
		);
		const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;

		try {
			// Enviar email
			await this.emailService.sendEmailVerification(
				employee.email,
				`${employee.first_name} ${employee.last_name}`,
				verificationUrl,
			);
			this.logger.log(
				"Verification email dispatch request successful",
				undefined,
				JSON.stringify({ employeeId, email: employee.email }),
			);
		} catch (error) {
			this.logger.error(
				"Failed to send verification email due to EmailService error",
				undefined,
				JSON.stringify({
					employeeId,
					email: employee.email,
					error: error.message,
				}),
			);
			throw error; // Re-throw the original error from EmailService
		}

		return true;
	}

	/**
	 * Reenvía un email de verificación al empleado
	 */
	async resendVerificationEmail(employeeId: string): Promise<boolean> {
		this.logger.log(
			"Attempting to resend verification email",
			undefined,
			JSON.stringify({ employeeId }),
		);
		const employee = await this.employeeRepository.findById(employeeId);

		if (!employee) {
			// Logged by called methods or should be logged here too if direct throw
			this.logger.warn(
				"Failed to resend verification email: Employee not found",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("Empleado no encontrado");
		}

		if (employee.credentials?.is_email_verified) {
			this.logger.warn(
				"Failed to resend verification email: Email already verified",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("El email ya está verificado");
		}

		// Limpiar token anterior si existe
		if (employee.credentials?.verification_token) {
			await this.employeeRepository.updateCredentials(employeeId, {
				verification_token: null,
				reset_token_expires: null,
			});
			this.logger.log(
				"Cleared previous verification token",
				undefined,
				JSON.stringify({ employeeId }),
			);
		}

		// Generar nuevo token y enviar email
		return this.sendVerificationEmail(employeeId); // This will log its own events
	}

	/**
	 * Verifica un token de verificación de email
	 */
	async verifyEmail(token: string): Promise<boolean> {
		this.logger.log(
			"Attempting to verify email with token",
			undefined,
			JSON.stringify({ token }),
		); // Avoid logging full token in prod if sensitive
		const employee =
			await this.employeeRepository.findByVerificationToken(token);

		if (!employee || !employee.credentials) {
			this.logger.warn(
				"Email verification failed: Token invalid or expired (employee not found)",
				undefined,
				JSON.stringify({ token }),
			);
			throw new BadRequestException("Token inválido o expirado");
		}

		const now = new Date();
		if (
			employee.credentials.reset_token_expires &&
			employee.credentials.reset_token_expires < now
		) {
			this.logger.warn(
				"Email verification failed: Token expired",
				undefined,
				JSON.stringify({ token, employeeId: employee.id }),
			);
			throw new BadRequestException("El token ha expirado");
		}

		// Actualizar estado de verificación
		await this.employeeRepository.updateCredentials(employee.id, {
			is_email_verified: true,
			verification_token: null,
			reset_token_expires: null,
		});

		this.logger.log(
			"Email successfully verified",
			undefined,
			JSON.stringify({ employeeId: employee.id, email: employee.email }),
		);
		return true;
	}

	/**
	 * Comprueba si un email está verificado
	 */
	async isEmailVerified(employeeId: string): Promise<boolean> {
		const employee = await this.employeeRepository.findById(employeeId);

		if (!employee) {
			// This case might be an error or a valid check depending on context.
			// If an error, GlobalExceptionFilter will handle it.
			// For a simple check, throwing might be too much.
			// However, to align with other methods, we'll log and throw.
			this.logger.warn(
				"isEmailVerified check failed: Employee not found",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("Empleado no encontrado");
		}

		const isVerified = !!employee.credentials?.is_email_verified;
		this.logger.debug(
			"Checked email verification status",
			undefined,
			JSON.stringify({ employeeId, isVerified }),
		);
		return isVerified;
	}
}
