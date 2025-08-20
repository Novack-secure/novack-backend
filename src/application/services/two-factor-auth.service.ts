import {
	Injectable,
	BadRequestException,
	NotFoundException,
	Inject,
} from "@nestjs/common";
import { Employee } from "../../domain/entities";
import { EmailService } from "./email.service";
import { ConfigService } from "@nestjs/config";
import * as otplib from "otplib";
import { authenticator } from "otplib";
import { toDataURL } from "qrcode";
import { IEmployeeRepository } from "../../domain/repositories/employee.repository.interface";
// EmployeeCredentials is not directly used in method params or return types, so import might be optional if not used elsewhere.
// import { EmployeeCredentials } from '../../domain/entities/employee-credentials.entity';
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Added import
import { SmsService } from "../services/sms.service"; // Added import for SmsService
import { RedisDatabaseService } from "src/infrastructure/database/redis/redis.database.service";

@Injectable()
export class TwoFactorAuthService {
	constructor(
		private readonly emailService: EmailService,
		private readonly configService: ConfigService,
		@Inject("IEmployeeRepository")
		private readonly employeeRepository: IEmployeeRepository,
		private readonly logger: StructuredLoggerService, // Added logger
    private readonly smsService: SmsService, // Injected SmsService
    private readonly redis: RedisDatabaseService,
	) {
		this.logger.setContext("TwoFactorAuthService"); // Set context
	}

	/**
	 * Genera un código de 6 dígitos para las implementaciones
	 * sin autenticación TOTP (legacy)
	 */
	private generateSixDigitCode(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	/**
	 * Genera un secreto para TOTP seguro
	 */
	private generateTOTPSecret(): string {
		return otplib.authenticator.generateSecret();
	}

	/**
	 * Genera una URL de autenticación para aplicaciones como Google Authenticator
	 * @param email Email del empleado
	 * @param secret Secreto TOTP
	 * @returns URL de autenticación
	 */
	private generateAuthenticatorUrl(email: string, secret: string): string {
		const issuer = this.configService.get("APP_NAME", "SPCEDES");
		return otplib.authenticator.keyuri(email, issuer, secret);
	}

	/**
	 * Genera un secreto de autenticación de dos factores
	 */
	async generateTwoFactorSecret(
		employeeId: string,
		method: "totp" | "email" = "totp",
	): Promise<{ secret: string; qrCodeUrl: string }> {
		this.logger.log(
			"2FA secret generation initiated",
			undefined,
			JSON.stringify({ employeeId }),
		);
		const employee = await this.employeeRepository.findById(employeeId);

		if (!employee) {
			// Log before throwing, though GlobalExceptionFilter would also catch this.
			// this.logger.warn('2FA secret generation failed: Employee not found', undefined, JSON.stringify({ employeeId }));
			throw new BadRequestException("Empleado no encontrado");
		}

		const secret = authenticator.generateSecret();

		// Generar URI para el QR
		const appName = "SPCedes"; // Consider making this configurable
		const otpAuthUrl = authenticator.keyuri(employee.email, appName, secret);

		// Guardar el secreto (pero aún no activar 2FA)
		await this.employeeRepository.updateCredentials(employeeId, {
			two_factor_secret: secret,
		});

		// Generar QR code como data URL
		const qrCodeUrl = await toDataURL(otpAuthUrl);

		this.logger.log(
			"2FA secret generated successfully",
			undefined,
			JSON.stringify({ employeeId }),
		);
		return {
			secret,
			qrCodeUrl,
		};
	}

	/**
	 * Activa la autenticación de dos factores
	 */
	async enableTwoFactor(employeeId: string, token: string): Promise<boolean> {
		this.logger.log(
			"Attempting to enable 2FA",
			undefined,
			JSON.stringify({ employeeId }),
		);
		const employee = await this.employeeRepository.findById(employeeId);

		if (!employee || !employee.credentials) {
			// this.logger.warn('2FA enabling failed: Employee or credentials not found', undefined, JSON.stringify({ employeeId }));
			throw new BadRequestException("Empleado no encontrado");
		}

		if (!employee.credentials.two_factor_secret) {
			// this.logger.warn('2FA enabling failed: 2FA secret not generated', undefined, JSON.stringify({ employeeId }));
			throw new BadRequestException("No hay secreto generado para 2FA");
		}

		// Verificar el token proporcionado
		const isValid = this.verifyToken(
			employee.credentials.two_factor_secret,
			token,
		);

		if (!isValid) {
			this.logger.warn(
				"2FA enabling failed: Invalid token",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("Token inválido");
		}

		// Activar 2FA
		await this.employeeRepository.updateCredentials(employeeId, {
			two_factor_enabled: true,
		});

		this.logger.log(
			"2FA enabled successfully",
			undefined,
			JSON.stringify({ employeeId }),
		);
		return true;
	}

	/**
	 * Desactiva la autenticación de dos factores
	 */
	async disableTwoFactor(employeeId: string, token: string): Promise<boolean> {
		this.logger.log(
			"Attempting to disable 2FA",
			undefined,
			JSON.stringify({ employeeId }),
		);
		const employee = await this.employeeRepository.findById(employeeId);

		if (!employee || !employee.credentials) {
			// this.logger.warn('2FA disabling failed: Employee or credentials not found', undefined, JSON.stringify({ employeeId }));
			throw new BadRequestException("Empleado no encontrado");
		}

		if (!employee.credentials.two_factor_enabled) {
			// this.logger.warn('2FA disabling failed: 2FA not currently enabled', undefined, JSON.stringify({ employeeId }));
			throw new BadRequestException(
				"La autenticación de dos factores no está activada",
			);
		}

		// Verificar el token proporcionado
		// For disabling, some systems might require current password instead of a 2FA token.
		// Here, it's using a 2FA token, which is fine if that's the design.
		const isValid = this.verifyToken(
			employee.credentials.two_factor_secret,
			token,
		);

		if (!isValid) {
			this.logger.warn(
				"2FA disabling failed: Invalid token",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("Token inválido");
		}

		// Desactivar 2FA
		await this.employeeRepository.updateCredentials(employeeId, {
			two_factor_enabled: false,
			two_factor_secret: null, // Clear the secret when disabling
		});

		this.logger.log(
			"2FA disabled successfully",
			undefined,
			JSON.stringify({ employeeId }),
		);
		return true;
	}

	/**
	 * Verifica un token TOTP
	 */
	verifyToken(secret: string, token: string): boolean {
		// This is a utility, direct logging might be too verbose if called frequently internally.
		// Logging is done by the calling methods.
		return authenticator.verify({ token, secret });
	}

	/**
	 * Valida el token 2FA durante el proceso de login
	 */
	async validateTwoFactorToken(
		employeeId: string,
		token: string,
	): Promise<boolean> {
		this.logger.log(
			"Validating 2FA token for login",
			undefined,
			JSON.stringify({ employeeId }),
		);
		const employee = await this.employeeRepository.findById(employeeId);

		if (!employee || !employee.credentials) {
			// this.logger.warn('2FA token validation failed: Employee or credentials not found', undefined, JSON.stringify({ employeeId }));
			throw new BadRequestException("Empleado no encontrado");
		}

		if (!employee.credentials.two_factor_enabled) {
			// Si 2FA no está habilitado, no se necesita token. Consideramos validación exitosa en este contexto.
			this.logger.log(
				"2FA token validation skipped: 2FA not enabled for user",
				undefined,
				JSON.stringify({ employeeId }),
			);
			return true;
		}

		if (!employee.credentials.two_factor_secret) {
			// this.logger.error('2FA token validation failed: 2FA secret missing for enabled user', undefined, JSON.stringify({ employeeId }));
			// This state (enabled but no secret) should ideally not happen.
			throw new BadRequestException("Configuración 2FA incompleta");
		}

		// Verificar el token proporcionado
		const isValid = this.verifyToken(
			employee.credentials.two_factor_secret,
			token,
		);
		if (isValid) {
			this.logger.log(
				"2FA token validation successful",
				undefined,
				JSON.stringify({ employeeId }),
			);
		} else {
			this.logger.warn(
				"2FA token validation failed",
				undefined,
				JSON.stringify({ employeeId }),
			);
		}
		return isValid;
	}

	/**
	 * Genera un código de respaldo para casos de emergencia
	 * @param employeeId ID del empleado
	 * @returns Código de respaldo único
	 */
	async generateBackupCode(employeeId: string): Promise<string> {
		// No explicit log for initiation, as it's a direct action. Success log is key.
		const employee = await this.employeeRepository.findById(employeeId);

		if (
			!employee ||
			!employee.credentials ||
			!employee.credentials.two_factor_enabled
		) {
			// this.logger.warn('2FA backup code generation failed: 2FA not enabled or bad state', undefined, JSON.stringify({ employeeId }));
			throw new BadRequestException("2FA no está activado para este empleado");
		}

		// Generar un código de respaldo único de 10 caracteres
		const backupCode = Math.random()
			.toString(36)
			.substring(2, 12)
			.toUpperCase();

		// Preparar el array de códigos de respaldo
		const backupCodes = employee.credentials.backup_codes || [];
		backupCodes.push({
			code: backupCode,
			created_at: new Date().toISOString(),
			used: false,
		});

		// Guardar los códigos de respaldo
		await this.employeeRepository.updateCredentials(employee.id, {
			backup_codes: backupCodes,
		});

		this.logger.log(
			"2FA backup code generated",
			undefined,
			JSON.stringify({ employeeId }),
		);
		return backupCode;
	}

	/**
	 * Verifica un código de respaldo y lo marca como usado
	 * @param employeeId ID del empleado
	 * @param code Código de respaldo
	 * @returns true si es válido, false si no
	 */
	async verifyBackupCode(employeeId: string, code: string): Promise<boolean> {
		this.logger.log(
			"Attempting to verify 2FA backup code",
			undefined,
			JSON.stringify({ employeeId }),
		);
		const employee = await this.employeeRepository.findById(employeeId);

		if (
			!employee ||
			!employee.credentials ||
			!employee.credentials.two_factor_enabled ||
			!employee.credentials.backup_codes
		) {
			this.logger.warn(
				"2FA backup code verification failed: Pre-conditions not met (2FA not enabled, no codes, or no employee)",
				undefined,
				JSON.stringify({ employeeId, code }),
			);
			return false;
		}

		// Buscar el código de respaldo
		const backupCodes = [...employee.credentials.backup_codes];
		const backupCodeIndex = backupCodes.findIndex(
			(bc) => bc.code === code && !bc.used,
		);

		if (backupCodeIndex === -1) {
			this.logger.warn(
				"2FA backup code verification failed: Code not found or already used",
				undefined,
				JSON.stringify({ employeeId, code }),
			);
			return false;
		}

		// Marcar como usado
		backupCodes[backupCodeIndex].used = true;
		backupCodes[backupCodeIndex].used_at = new Date().toISOString();

		// Actualizar en la base de datos
		await this.employeeRepository.updateCredentials(employee.id, {
			backup_codes: backupCodes,
		});

		this.logger.log(
			"2FA backup code verified and used successfully",
			undefined,
			JSON.stringify({ employeeId, code }),
		);
		return true;
	}

	/**
	 * Activa la autenticación de dos factores
	 * Alias para enableTwoFactor para mantener compatibilidad con el controlador
	 */
	async enable2FA(employeeId: string, token: string): Promise<boolean> {
		// Logging is done by the aliased method `enableTwoFactor`
		// If separate logging for alias usage is desired, it can be added here.
		// For now, assuming logging in core methods is sufficient.
		// this.logger.log('Attempting to enable 2FA (via alias)', undefined, JSON.stringify({ employeeId }));
		return this.enableTwoFactor(employeeId, token);
	}

	/**
	 * Desactiva la autenticación de dos factores
	 * Alias para disableTwoFactor para mantener compatibilidad con el controlador
	 */
	async disable2FA(employeeId: string, token: string): Promise<boolean> {
		// this.logger.log('Attempting to disable 2FA (via alias)', undefined, JSON.stringify({ employeeId }));
		return this.disableTwoFactor(employeeId, token);
	}

	/**
	 * Verifica un token 2FA
	 * Alias para validateTwoFactorToken para mantener compatibilidad con el controlador
	 */
	async verify2FA(employeeId: string, token: string): Promise<boolean> {
		// this.logger.log('Validating 2FA token for login (via alias)', undefined, JSON.stringify({ employeeId }));
		return this.validateTwoFactorToken(employeeId, token);
	}

	// --- SMS 2FA Methods ---

  async initiateSmsVerification(
    employeeIdOrEmail: string,
    phoneNumber: string,
  ): Promise<void> {
    this.logger.log(
			"Initiating SMS phone verification",
			undefined,
      JSON.stringify({ employeeIdOrEmail, phoneNumber }),
		);
    const isUuidV4 = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      employeeIdOrEmail,
    );
    const employee = isUuidV4
      ? await this.employeeRepository.findById(employeeIdOrEmail)
      : await this.employeeRepository.findByEmail(employeeIdOrEmail);
		if (!employee) {
      this.logger.warn(
				"Failed to initiate SMS verification: Employee not found",
				undefined,
        JSON.stringify({ employeeIdOrEmail }),
			);
			throw new BadRequestException("Empleado no encontrado");
		}

		// It's assumed the phone number should be validated for format (e.g., E.164)
		// before calling this method, or SmsService should handle it.
		// For now, directly updating employee's phone.
    await this.employeeRepository.update(employee.id, { phone: phoneNumber });
		// Note: employeeRepository.update might not update relations or nested entities directly.
		// If 'phone' is on the Employee entity directly, this is fine.

		const otp = this.generateSixDigitCode();
		const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Guardar OTP en Redis con TTL de 10 minutos
    const ttlSeconds = 10 * 60;
    await this.redis.set(`otp:sms:${employee.id}`, otp, ttlSeconds);
    await this.redis.set(`otp:sms:email:${employee.email}`, otp, ttlSeconds);

		await this.smsService.sendOtp(phoneNumber, otp); // Assumes phoneNumber is E.164 formatted
    this.logger.log(
			"SMS OTP sent for phone verification",
			undefined,
      JSON.stringify({ employeeId: employee.id, phoneNumber }),
		);
	}

  async verifySmsOtpForPhoneNumber(
    employeeIdOrEmail: string,
    otp: string,
  ): Promise<boolean> {
    this.logger.log(
			"Attempting to verify SMS OTP for phone number",
			undefined,
      JSON.stringify({ employeeIdOrEmail }),
		);
    const isUuidV4 = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      employeeIdOrEmail,
    );
    const employee = isUuidV4
      ? await this.employeeRepository.findByIdWithCredentials(employeeIdOrEmail)
      : await (async () => {
          const byEmail = await this.employeeRepository.findByEmail(
            employeeIdOrEmail,
          );
          return byEmail
            ? await this.employeeRepository.findByIdWithCredentials(byEmail.id)
            : null;
        })();

		if (!employee || !employee.credentials) {
			this.logger.warn(
				"SMS OTP verification failed: Employee or credentials not found",
			undefined,
				JSON.stringify({ employeeId: employee.id }),
			);
			throw new BadRequestException("Empleado o credenciales no encontradas.");
		}

    const keyById = `otp:sms:${employee.id}`;
    const keyByEmail = `otp:sms:email:${employee.email}`;
    const storedOtp = (await this.redis.get<string>(keyById)) || (await this.redis.get<string>(keyByEmail));

    if (!storedOtp) {
      this.logger.warn(
        "SMS OTP verification failed: No OTP pending or already verified",
        undefined,
        JSON.stringify({ employeeId: employee.id }),
      );
      throw new BadRequestException(
        "No hay código OTP pendiente para verificación o ya ha sido verificado.",
      );
    }

    if (storedOtp !== otp) {
			this.logger.warn(
				"SMS OTP verification failed: Invalid OTP",
				undefined,
        JSON.stringify({ employeeId: employee.id }),
			);
			// Consider implementing attempt counting here to prevent brute-force attacks.
			throw new BadRequestException("Código OTP inválido.");
		}

		// OTP is valid
    await this.employeeRepository.updateCredentials(employee.id, {
			phone_number_verified: true,
		});
    await this.redis.delete(keyById, keyByEmail);
    this.logger.log(
			"SMS OTP for phone number verified successfully",
			undefined,
      JSON.stringify({ employeeId: employee.id }),
		);
		return true;
	}

  // --- Public registration (no employee required) ---

  /**
   * Inicia verificación por SMS para registro sin requerir empleado existente
   * Guarda OTP en Redis asociado al email y al teléfono, con TTL de 10 minutos
   */
  async initiateSmsVerificationPublic(
    email: string,
    phoneNumber: string,
  ): Promise<void> {
    this.logger.log(
      "Initiating PUBLIC SMS verification (registration)",
      undefined,
      JSON.stringify({ email, phoneNumber })
    );

    // Normalizar email en minúsculas
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException("Email es requerido");
    }

    const otp = this.generateSixDigitCode();
    const ttlSeconds = 10 * 60; // 10 minutos

    // Guardar OTP pendiente por email; también guardamos el teléfono para validar luego
    await this.redis.set(`otp:sms:pending:email:${normalizedEmail}`, otp, ttlSeconds);
    await this.redis.set(
      `otp:sms:pending:meta:${normalizedEmail}`,
      JSON.stringify({ phoneNumber, createdAt: new Date().toISOString() }),
      ttlSeconds,
    );

    await this.smsService.sendOtp(phoneNumber, otp);
    this.logger.log(
      "PUBLIC SMS OTP sent successfully",
      undefined,
      JSON.stringify({ email: normalizedEmail })
    );
  }

  /**
   * Verifica OTP público y marca el email (y teléfono) como verificado temporalmente en Redis
   * Crea una marca `otp:sms:verified:email:{email}` con TTL (p.ej. 30 min) que se validará al crear cuenta
   */
  async verifySmsOtpPublic(email: string, otp: string): Promise<boolean> {
    this.logger.log(
      "Attempting PUBLIC SMS OTP verification (registration)",
      undefined,
      JSON.stringify({ email })
    );
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException("Email es requerido");
    }

    const pendingKey = `otp:sms:pending:email:${normalizedEmail}`;
    const metaKey = `otp:sms:pending:meta:${normalizedEmail}`;
    const pendingOtp = await this.redis.get<any>(pendingKey);
    if (pendingOtp === null || pendingOtp === undefined) {
      throw new BadRequestException("No hay OTP pendiente o ya expiró");
    }
    if (String(pendingOtp) !== String(otp)) {
      throw new BadRequestException("Código OTP inválido");
    }

    const metaJson = await this.redis.get<string>(metaKey);
    let phoneNumber: string | undefined;
    try {
      phoneNumber = metaJson ? (JSON.parse(metaJson).phoneNumber as string) : undefined;
    } catch (e) {
      // ignore parse errors
    }

    // Marcar como verificado para uso posterior en creación de cuenta (TTL 30 min)
    const verifiedTtl = 30 * 60;
    const verifiedPayload = JSON.stringify({
      phoneNumber,
      verifiedAt: new Date().toISOString(),
    });
    await this.redis.set(`otp:sms:verified:email:${normalizedEmail}`, verifiedPayload, verifiedTtl);

    // Limpiar OTPs pendientes
    await this.redis.delete(pendingKey, metaKey);

    this.logger.log(
      "PUBLIC SMS OTP verified successfully",
      undefined,
      JSON.stringify({ email: normalizedEmail })
    );
    return true;
  }

  /**
   * Inicia verificación por EMAIL para registro (envía OTP al correo)
   */
  async initiateEmailVerificationPublic(email: string): Promise<void> {
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException("Email es requerido");
    }
    const otp = this.generateSixDigitCode();
    const ttlSeconds = 10 * 60;
    await this.redis.set(`otp:email:pending:${normalizedEmail}`, otp, ttlSeconds);
    // Enviar correo con OTP
    try {
      await this.emailService.send2FASetupEmail(normalizedEmail, normalizedEmail, null, otp);
    } catch (e) {
      // En desarrollo (o si está habilitado por config), no fallar el flujo: mantenemos el OTP y continuamos
      const allowFallback = (this.configService.get<string>("EMAIL_OTP_ALLOW_SEND_FAILURE")
        ?? (process.env.NODE_ENV !== "production" ? "true" : "false")) === "true";
      if (allowFallback) {
        this.logger.warn(
          "Fallo el envío de email OTP, pero se permite fallback. Revisa configuración del proveedor (dominio/API key).",
          undefined,
          JSON.stringify({ email: normalizedEmail, error: (e as any)?.message || "unknown" })
        );
      } else {
        throw e;
      }
    }
    this.logger.log(
      "PUBLIC EMAIL OTP sent successfully",
      undefined,
      JSON.stringify({ email: normalizedEmail })
    );
  }

  /**
   * Verifica OTP enviado por EMAIL y marca como verificado en Redis
   */
  async verifyEmailOtpPublic(email: string, otp: string): Promise<boolean> {
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException("Email es requerido");
    }
    const key = `otp:email:pending:${normalizedEmail}`;
    const pendingOtp = await this.redis.get<any>(key);
    if (pendingOtp === null || pendingOtp === undefined) {
      throw new BadRequestException("No hay OTP pendiente o ya expiró");
    }
    if (String(pendingOtp) !== String(otp)) {
      throw new BadRequestException("Código OTP inválido");
    }
    const verifiedTtl = 30 * 60;
    await this.redis.set(
      `otp:email:verified:${normalizedEmail}`,
      JSON.stringify({ verifiedAt: new Date().toISOString() }),
      verifiedTtl,
    );
    await this.redis.delete(key);
    this.logger.log(
      "PUBLIC EMAIL OTP verified successfully",
      undefined,
      JSON.stringify({ email: normalizedEmail })
    );
    return true;
  }

	async enableSmsTwoFactor(employeeId: string): Promise<boolean> {
		this.logger.log(
			"Attempting to enable SMS 2FA",
			undefined,
			JSON.stringify({ employeeId }),
		);
		const employee =
			await this.employeeRepository.findByIdWithCredentials(employeeId);

		if (!employee || !employee.credentials) {
			this.logger.warn(
				"Enable SMS 2FA failed: Employee or credentials not found",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("Empleado o credenciales no encontradas.");
		}

		if (!employee.credentials.phone_number_verified) {
			this.logger.warn(
				"Enable SMS 2FA failed: Phone number not verified",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException(
				"El número de teléfono debe ser verificado antes de habilitar SMS 2FA.",
			);
		}

		await this.employeeRepository.updateCredentials(employeeId, {
			is_sms_2fa_enabled: true,
		});
		this.logger.log(
			"SMS 2FA enabled successfully",
			undefined,
			JSON.stringify({ employeeId }),
		);
		return true;
	}

	async disableSmsTwoFactor(employeeId: string): Promise<boolean> {
		this.logger.log(
			"Attempting to disable SMS 2FA",
			undefined,
			JSON.stringify({ employeeId }),
		);
		const employee =
			await this.employeeRepository.findByIdWithCredentials(employeeId);

		if (!employee || !employee.credentials) {
			this.logger.warn(
				"Disable SMS 2FA failed: Employee or credentials not found",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("Empleado o credenciales no encontradas.");
		}

		if (!employee.credentials.is_sms_2fa_enabled) {
			this.logger.warn(
				"Disable SMS 2FA failed: SMS 2FA not currently enabled",
				undefined,
				JSON.stringify({ employeeId }),
			);
			throw new BadRequestException("SMS 2FA no está habilitado actualmente.");
		}

		await this.employeeRepository.updateCredentials(employeeId, {
			is_sms_2fa_enabled: false,
			// Optionally clear sms_otp_code and expiry if needed upon disabling
			// sms_otp_code: null,
			// sms_otp_code_expires_at: null,
		});
		this.logger.log(
			"SMS 2FA disabled successfully",
			undefined,
			JSON.stringify({ employeeId }),
		);
		return true;
	}
}
