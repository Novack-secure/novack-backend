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
		const employee = await this.employeeRepository
			.createQueryBuilder("employee")
			.leftJoinAndSelect("employee.credentials", "credentials")
			.leftJoinAndSelect("employee.supplier", "supplier")
			.where("employee.email = :email", { email })
			.getOne();

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
			this.logger?.warn(
				"Login failed: Account locked",
				undefined,
				JSON.stringify({ 
					email, 
					lockedUntil: credentials.locked_until,
					loginAttempts: credentials.login_attempts 
				}),
			);
			throw new UnauthorizedException("Cuenta bloqueada temporalmente");
		}

		// Verificar contraseña
		const isPasswordValid = await bcrypt.compare(password, credentials.password_hash);
		if (!isPasswordValid) {
			// Incrementar intentos de login
			credentials.login_attempts += 1;
			
			// Bloquear cuenta si se excede el límite
			if (credentials.login_attempts >= this.MAX_LOGIN_ATTEMPTS) {
				credentials.locked_until = new Date(Date.now() + this.LOCK_TIME_MINUTES * 60 * 1000);
				this.logger?.warn(
					"Account locked due to too many failed attempts",
					undefined,
					JSON.stringify({ 
						email, 
						loginAttempts: credentials.login_attempts,
						lockedUntil: credentials.locked_until 
					}),
				);
			}
			
			await this.employeeAuthRepository.save(credentials);
			
			this.logger?.warn(
				"Login failed: Invalid password",
				undefined,
				JSON.stringify({ 
					email, 
					loginAttempts: credentials.login_attempts 
				}),
			);
			throw new UnauthorizedException("Credenciales inválidas");
		}

		// Resetear intentos de login y desbloquear cuenta
		credentials.login_attempts = 0;
		credentials.locked_until = null;
		credentials.last_login = new Date();
		await this.employeeAuthRepository.save(credentials);

		this.logger?.log(
			"Login successful",
			undefined,
			JSON.stringify({ 
				employeeId: employee.id, 
				email: employee.email 
			}),
		);

		return employee;
	}

	async login(email: string, password: string, req: Request) {
		const employee = await this.validateEmployee(email, password);
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

	async simpleLogin(email: string, password: string, req: Request) {
		return this.login(email, password, req);
	}

	async refreshToken(refreshToken: string): Promise<any> {
		// Implementar lógica de refresh token
		throw new BadRequestException("Refresh token not implemented");
	}

	async logout(refreshToken: string): Promise<any> {
		// Implementar lógica de logout
		return { message: "Logout successful" };
	}

	async verifySmsOtpAndLogin(email: string, otp: string, req: Request): Promise<any> {
		// Implementar verificación de SMS OTP
		throw new BadRequestException("SMS OTP verification not implemented");
	}

	async googleAuth(googleData: any, req: Request) {
		const { email, name, googleId, image } = googleData;

		try {
			// Buscar empleado existente por email
			let employee = await this.employeeRepository.findOne({
				where: { email },
				relations: ["credentials", "supplier"],
			});

			if (!employee) {
				// Si no existe, crear un nuevo empleado
				// Necesitamos asignar a un supplier por defecto o crear uno
				// Por ahora, vamos a buscar el primer supplier disponible
				const suppliers = await this.employeeRepository
					.createQueryBuilder("employee")
					.leftJoinAndSelect("employee.supplier", "supplier")
					.where("employee.is_creator = :isCreator", { isCreator: true })
					.getMany();

				if (suppliers.length === 0) {
					throw new BadRequestException("No hay suppliers disponibles para asignar el usuario");
				}

				// Usar el primer supplier disponible
				const defaultSupplier = suppliers[0].supplier;

				// Crear nuevo empleado
				employee = this.employeeRepository.create({
					email,
					first_name: name.split(" ")[0] || name,
					last_name: name.split(" ").slice(1).join(" ") || "",
					supplier: defaultSupplier,
					profile_image_url: image,
					is_creator: false,
				});

				employee = await this.employeeRepository.save(employee);

				// Crear credenciales para Google Auth
				const credentials = this.employeeAuthRepository.create({
					employee,
					google_id: googleId,
					last_login: new Date(),
				});

				await this.employeeAuthRepository.save(credentials);

				if (this.logger) {
					this.logger.log(
						"New employee created via Google Auth",
						undefined,
						JSON.stringify({
							employeeId: employee.id,
							email: employee.email,
							supplierId: defaultSupplier.id,
						}),
					);
				}
			} else {
				// Actualizar credenciales existentes con Google ID
				if (employee.credentials) {
					employee.credentials.google_id = googleId;
					employee.credentials.last_login = new Date();
					if (image) {
						employee.profile_image_url = image;
					}
					await this.employeeAuthRepository.save(employee.credentials);
					await this.employeeRepository.save(employee);
				}
			}

			// Generar tokens
			const tokens = await this.tokenService.generateTokens(employee, req);

			if (this.logger) {
				this.logger.log(
					"Google authentication successful",
					undefined,
					JSON.stringify({
						employeeId: employee.id,
						email: employee.email,
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
		} catch (error) {
			if (this.logger) {
				this.logger.error(
					"Google authentication failed",
					error.stack,
					JSON.stringify({
						email,
						error: error.message,
					}),
				);
			}
			throw new InternalServerErrorException("Error en autenticación con Google");
		}
	}
}