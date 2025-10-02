import { Injectable, UnauthorizedException, BadRequestException, InternalServerErrorException, Inject, forwardRef, Optional } from "@nestjs/common";
import { EmployeeService } from "./employee.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
	Employee,
	EmployeeCredentials,
} from "../../domain/entities";
import * as bcrypt from "bcryptjs";
import { TokenService } from "./token.service";
import { Request } from "express";
import { StructuredLoggerService } from "../../infrastructure/logging/structured-logger.service";
import { SmsService } from "./sms.service";

@Injectable()
export class AuthService {
	private readonly MAX_LOGIN_ATTEMPTS = 10;
	private readonly LOCK_TIME_MINUTES = 15;
	private readonly OTP_EXPIRY_MINUTES = 10;

	constructor(
		private readonly employeeService: EmployeeService,
		private readonly tokenService: TokenService,
		@InjectRepository(Employee)
		private readonly employeeRepository: Repository<Employee>,
		@InjectRepository(EmployeeCredentials)
		private readonly employeeAuthRepository: Repository<EmployeeCredentials>,
		private readonly smsService: SmsService,
		@Optional() private readonly logger?: StructuredLoggerService,
	) {
	    if (this.logger) {
	        this.logger.setContext('AuthService');
	    }
	}

	async validateEmployee(email: string, password: string) {
		const employee = await this.employeeRepository.findOne({
			where: { email },
			relations: ["credentials"],
		});
		if (!employee || !employee.credentials) {
			this.logger?.warn(
				"Login failed: Invalid credentials - User not found or no credentials",
				undefined,
				JSON.stringify({ email }),
			);
			throw new UnauthorizedException("Credenciales inválidas");
		}

		const { credentials } = employee;

		// Verificar si la cuenta está bloqueada
		if (credentials.locked_until && credentials.locked_until > new Date()) {
			const remainingMinutes = Math.ceil(
				(credentials.locked_until.getTime() - Date.now()) /
					(1000 * 60),
			);
			throw new UnauthorizedException(
				`Cuenta bloqueada. Intente nuevamente en ${remainingMinutes} minutos`,
			);
		}

		const isPasswordValid = await bcrypt.compare(
			password,
			credentials.password_hash,
		);
		if (!isPasswordValid) {
			// Incrementar el contador de intentos fallidos
			credentials.login_attempts = (credentials.login_attempts || 0) + 1;

			// Si excede el máximo de intentos, bloquear la cuenta
			if (credentials.login_attempts >= this.MAX_LOGIN_ATTEMPTS) {
				credentials.locked_until = new Date(
					Date.now() + this.LOCK_TIME_MINUTES * 60 * 1000,
				);
				await this.employeeAuthRepository.save(credentials);
				throw new UnauthorizedException(
					`Demasiados intentos fallidos. Cuenta bloqueada por ${this.LOCK_TIME_MINUTES} minutos`,
				);
			}

			await this.employeeAuthRepository.save(credentials);
			throw new UnauthorizedException("Credenciales inválidas");
		}

		// Restablecer los intentos fallidos si el login es exitoso
		if (credentials.login_attempts > 0) {
			credentials.login_attempts = 0;
			credentials.locked_until = null;
			credentials.last_login = new Date();
			await this.employeeAuthRepository.save(credentials);
		}
		// Return a subset of employee properties, excluding credentials for security
		const { credentials: _, ...employeeDetails } = employee;
		return employeeDetails;
	}

	async login(email: string, password: string, request?: Request) {
		const employee = await this.validateEmployee(email, password);

		// Obtener el empleado con credenciales y relaciones necesarias
		const employeeWithCredentials = await this.employeeRepository.findOne({
			where: { email },
			relations: ["credentials", "supplier"],
		});
		if (!employeeWithCredentials?.credentials?.is_email_verified) {
			throw new UnauthorizedException("El correo electrónico no está verificado");
		}

		// Comprobar si 2FA está habilitado
		if (employeeWithCredentials?.credentials?.is_sms_2fa_enabled && 
			employeeWithCredentials?.credentials?.phone_number_verified) {
			// Cargar también el teléfono del empleado
			const employeeWithPhone = await this.employeeRepository.findOne({
				where: { id: employeeWithCredentials.id }
			});
			if (!employeeWithPhone?.phone) {
				if (this.logger) {
					this.logger.error(
						"SMS 2FA enabled but no phone number for user",
					undefined,
					JSON.stringify({ userId: employeeWithCredentials.id }),
				);
				}
				throw new InternalServerErrorException("SMS 2FA enabled but no phone number configured");
			}
			const otp = Math.floor(100000 + Math.random() * 900000).toString();
			const otpExpiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
			try {
				employeeWithCredentials.credentials.sms_otp_code = otp;
				employeeWithCredentials.credentials.sms_otp_code_expires_at = otpExpiresAt;
				await this.employeeAuthRepository.save(employeeWithCredentials.credentials);
				await this.smsService.sendOtp(employeeWithPhone.phone, otp);
				if (this.logger) {
					this.logger.log(
						"SMS OTP sent for login process step",
						undefined,
						JSON.stringify({ userId: employeeWithCredentials.id }),
					);
				}
				return {
					message: "SMS OTP verification required.",
					smsOtpRequired: true,
					userId: employeeWithCredentials.id,
				};
			} catch (error) {
				if (this.logger) {
					this.logger.error(
						"Failed to send login OTP SMS via SmsService during login attempt",
					undefined,
					JSON.stringify({ 
						userId: employeeWithCredentials.id, 
						error: error.message || "Unknown error" 
					}),
					);
				}
				throw new InternalServerErrorException("Failed to send SMS OTP");
			}
		}

		// Si no se requiere 2FA, proceder con el login normal
		if (this.logger) {
			this.logger.log(
				"Login successful (no SMS OTP required or passed), generating tokens...",
				undefined,
				JSON.stringify({
					userId: employeeWithCredentials.id,
					email: employeeWithCredentials.email,
					supplierId: employeeWithCredentials.supplier?.id,
				}),
			);
		}

		// Actualizar última fecha de login
		const employeeCredentials = await this.employeeAuthRepository.findOne({
			where: { employee: { id: employeeWithCredentials.id } }
		});
		if (employeeCredentials) {
			employeeCredentials.last_login = new Date();
			await this.employeeAuthRepository.save(employeeCredentials);
		}

		// Generar tokens con el nuevo servicio
		const tokens = await this.tokenService.generateTokens(
			employeeWithCredentials,
			request,
		);

		return {
			...tokens,
			employee: {
				id: employeeWithCredentials.id,
				first_name: employeeWithCredentials.first_name,
				last_name: employeeWithCredentials.last_name,
				email: employeeWithCredentials.email,
				is_creator: employeeWithCredentials.is_creator,
				supplier: employeeWithCredentials.supplier,
			},
		};
	}

	/**
	 * Simplified login method that only verifies email and password exist
	 * without additional validations like email verification, 2FA, or account lockout
	 */
	async simpleLogin(email: string, password: string, request?: Request) {
		// Find employee with credentials
		const employee = await this.employeeRepository.findOne({
			where: { email },
			relations: ["credentials", "supplier"],
		});

		if (!employee || !employee.credentials) {
			if (this.logger) {
				this.logger.warn(
					"Simple login failed: User not found or no credentials",
					undefined,
					JSON.stringify({ email }),
				);
			}
			throw new UnauthorizedException("Credenciales inválidas");
		}

		// Verify password
		const isPasswordValid = await bcrypt.compare(
			password,
			employee.credentials.password_hash,
		);

		if (!isPasswordValid) {
			if (this.logger) {
				this.logger.warn(
					"Simple login failed: Invalid password",
					undefined,
					JSON.stringify({ email }),
				);
			}
			throw new UnauthorizedException("Credenciales inválidas");
		}

		// Update last login
		employee.credentials.last_login = new Date();
		await this.employeeAuthRepository.save(employee.credentials);

		// Generate tokens
		const tokens = await this.tokenService.generateTokens(employee, request);

		if (this.logger) {
			this.logger.log(
				"Simple login successful",
				undefined,
				JSON.stringify({
					userId: employee.id,
					email: employee.email,
					supplierId: employee.supplier?.id,
				}),
			);
		}

		return {
			...tokens,
			employee: {
				id: employee.id,
				first_name: employee.first_name,
				last_name: employee.last_name,
				email: employee.email,
				is_creator: employee.is_creator,
				supplier: employee.supplier,
			},
		};
	}

	// TODO: Implementar refresh token y logout cuando se resuelva el problema de RefreshToken
	async refreshToken(token: string, request?: Request) {
		throw new Error("Refresh token no implementado temporalmente");
	}

	async logout(refreshToken: string) {
		// TODO: Implementar logout cuando se resuelva el problema de RefreshToken
		return { message: "Logged out successfully" };
	}

	async validateToken(token: string) {
		return this.tokenService.validateToken(token);
	}

	async verifySmsOtpAndLogin(
		userId: string,
		otp: string,
		req: Request,
	): Promise<any> {
		// Get employee with credentials
		const employee = await this.employeeRepository.findOne({
			where: { id: userId },
			relations: ["credentials", "supplier"],
		});

		if (!employee || !employee.credentials) {
			if (this.logger) {
				this.logger.warn(
					"SMS OTP login verification failed: Employee or credentials not found",
					undefined,
					JSON.stringify({ 
						userId, 
						reason: "Employee or credentials not found" 
					}),
				);
			}
			throw new UnauthorizedException("Employee or credentials not found");
		}

		const credentials = employee.credentials;

		// Verify OTP is pending
		if (!credentials.sms_otp_code) {
			if (this.logger) {
				this.logger.warn(
					"SMS OTP login verification failed: No OTP pending",
					undefined,
					JSON.stringify({ 
						userId, 
						reason: "No OTP pending or already verified" 
					}),
				);
			}
			
			// Clear any expired OTP data
			credentials.sms_otp_code = null;
			credentials.sms_otp_code_expires_at = null;
			await this.employeeAuthRepository.save(credentials);
			
			throw new UnauthorizedException("No OTP pending");
		}

		// Verify OTP is not expired
		const now = new Date();
		if (!credentials.sms_otp_code_expires_at || credentials.sms_otp_code_expires_at < now) {
			if (this.logger) {
				this.logger.warn(
					"SMS OTP login verification failed: OTP expired",
					undefined,
					JSON.stringify({ 
						userId, 
						reason: "OTP expired" 
					}),
				);
			}
			
			// Clear expired OTP
			credentials.sms_otp_code = null;
			credentials.sms_otp_code_expires_at = null;
			await this.employeeAuthRepository.save(credentials);
			
			throw new UnauthorizedException("OTP expired");
		}

		// Verify OTP matches
		if (credentials.sms_otp_code !== otp) {
			if (this.logger) {
				this.logger.warn(
					"SMS OTP login verification failed: Invalid OTP",
					undefined,
					JSON.stringify({ 
						userId, 
						reason: "Invalid OTP" 
					}),
				);
			}
			throw new UnauthorizedException("Invalid OTP");
		}

		// Clear OTP after successful verification
		credentials.sms_otp_code = null;
		credentials.sms_otp_code_expires_at = null;
		credentials.last_login = new Date();
		await this.employeeAuthRepository.save(credentials);

		if (this.logger) {
			this.logger.log(
				"SMS OTP verified successfully, login completed",
				undefined,
				JSON.stringify({
					userId: employee.id,
					email: employee.email,
				}),
			);
		}

		// Generate tokens
		const tokens = await this.tokenService.generateTokens(employee, req);

		return {
			...tokens,
			employee: {
				id: employee.id,
				first_name: employee.first_name,
				last_name: employee.last_name,
				email: employee.email,
				is_creator: employee.is_creator,
				supplier: employee.supplier,
			},
		};
	}
}
