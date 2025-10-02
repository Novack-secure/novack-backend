import { Injectable, BadRequestException, Inject } from "@nestjs/common";
import { CreateEmployeeDto } from "../dtos/employee";
import { UpdateEmployeeDto } from "../dtos/employee";
import { Employee } from "src/domain/entities";
// EmployeeCredentials seems not to be directly used for DTOs here
// import { EmployeeCredentials } from 'src/domain/entities/employee-credentials.entity';
import * as bcrypt from "bcryptjs";
import { IEmployeeRepository } from "../../domain/repositories/employee.repository.interface";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Added import
import { RedisDatabaseService } from "../../infrastructure/database/redis/redis.database.service";

@Injectable()
export class EmployeeService {
	constructor(
		@Inject("IEmployeeRepository")
		private readonly employeeRepository: IEmployeeRepository,
		private readonly logger: StructuredLoggerService, // Added logger
		private readonly redis: RedisDatabaseService,
	) {
		this.logger.setContext("EmployeeService"); // Set context
	}

	async create(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
		this.logger.log("Attempting to create employee account", undefined, {
			email: createEmployeeDto.email,
			// Safely access supplier_id if it's part of the DTO structure
			supplierId: (createEmployeeDto as any).supplier_id,
		});

		const { password, ...employeeData } = createEmployeeDto;

		// Verificar si ya existe un empleado con el mismo email
		const existingEmployee = await this.employeeRepository.findByEmail(
			employeeData.email,
		);
		if (existingEmployee) {
			this.logger.warn(
				"Employee account creation failed: Email already exists",
				undefined,
				{ email: createEmployeeDto.email },
			);
			throw new BadRequestException("Ya existe un empleado con ese email");
		}

		// Crear hash de la contraseña
		const hashedPassword = await bcrypt.hash(password, 10);

		// Crear el empleado con sus credenciales
		const newEmployee = await this.employeeRepository.create({
			...employeeData,
			credentials: {
				password_hash: hashedPassword,
				is_email_verified: false,
				two_factor_enabled: false,
			} as any, // Usar 'any' para evitar el error de tipo
		});

		this.logger.log("Employee account created successfully", undefined, {
			employeeId: newEmployee.id,
			email: newEmployee.email,
		});
		return newEmployee;
	}

	async createPublic(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
		this.logger.log("Attempting to create public employee account", undefined, {
			email: createEmployeeDto.email,
			supplierId: (createEmployeeDto as any).supplier_id,
		});

		const { password, ...employeeData } = createEmployeeDto;
		const normalizedEmail = employeeData.email.trim().toLowerCase();

		// Verificar que el email tenga OTP verificado en Redis
		const smsVerifiedKey = `otp:sms:verified:email:${normalizedEmail}`;
		const emailVerifiedKey = `otp:email:verified:${normalizedEmail}`;
		
		const smsVerified = await this.redis.get(smsVerifiedKey);
		const emailVerified = await this.redis.get(emailVerifiedKey);
		
		if (!smsVerified && !emailVerified) {
			this.logger.warn(
				"Public employee creation failed: Email not verified by OTP",
				undefined,
				{ email: normalizedEmail }
			);
			throw new BadRequestException("El email debe ser verificado por OTP antes del registro");
		}

		// Verificar si ya existe un empleado con el mismo email
		const existingEmployee = await this.employeeRepository.findByEmail(normalizedEmail);
		if (existingEmployee) {
			this.logger.warn(
				"Public employee creation failed: Email already exists",
				undefined,
				{ email: normalizedEmail }
			);
			throw new BadRequestException("Ya existe un empleado con ese email");
		}

		// Crear hash de la contraseña
		const hashedPassword = await bcrypt.hash(password, 10);

		// Crear el empleado con sus credenciales (email verificado)
		const newEmployee = await this.employeeRepository.create({
			...employeeData,
			email: normalizedEmail, // Asegurar email normalizado
			credentials: {
				password_hash: hashedPassword,
				is_email_verified: true, // Marcar como verificado por OTP
				two_factor_enabled: false,
			} as any,
		});

		// Limpiar las claves de verificación de Redis
		if (smsVerified) {
			await this.redis.delete(smsVerifiedKey);
		}
		if (emailVerified) {
			await this.redis.delete(emailVerifiedKey);
		}

		this.logger.log("Public employee account created successfully", undefined, {
			employeeId: newEmployee.id,
			email: newEmployee.email,
		});
		return newEmployee;
	}


	async findAll(): Promise<Employee[]> {
		return this.employeeRepository.findAll();
	}

	async findOne(id: string): Promise<Employee> {
		const employee = await this.employeeRepository.findById(id);
		if (!employee) {
			// Consider adding a log here if this is an unexpected scenario for internal calls
			throw new BadRequestException("Empleado no encontrado");
		}
		return employee;
	}

	async update(
		id: string,
		updateEmployeeDto: UpdateEmployeeDto,
	): Promise<Employee> {
		this.logger.log("Attempting to update employee account", undefined, {
			employeeId: id,
		});
		const { password, ...employeeData } = updateEmployeeDto;

		// Verificar si el empleado existe
		const existingEmployee = await this.findOne(id); // findOne already throws if not found

		// Si hay una nueva contraseña, actualizarla
		if (password) {
			this.logger.log("Employee password changed", undefined, {
				employeeId: id,
			});
			const hashedPassword = await bcrypt.hash(password, 10);
			await this.employeeRepository.updateCredentials(id, {
				password_hash: hashedPassword,
			});
		}

		// Actualizar los datos del empleado
		const updatedEmployee = await this.employeeRepository.update(
			id,
			employeeData,
		);
		this.logger.log("Employee account updated successfully", undefined, {
			employeeId: id,
		});
		return updatedEmployee;
	}

	async remove(id: string): Promise<void> {
		this.logger.log("Attempting to delete employee account", undefined, {
			employeeId: id,
		});
		// Verificar si el empleado existe
		await this.findOne(id); // findOne throws if not found, ensuring we only attempt to delete existing

		// Eliminar el empleado
		await this.employeeRepository.delete(id);
		this.logger.log("Employee account deleted successfully", undefined, {
			employeeId: id,
		});
	}

	async findBySupplier(supplierId: string): Promise<Employee[]> {
		return this.employeeRepository.findBySupplier(supplierId);
	}

	async findByEmail(email: string): Promise<Employee | null> {
		return this.employeeRepository.findByEmail(email);
	}

	async verifyEmail(id: string): Promise<Employee> {
		// Verificar si el empleado existe
		await this.findOne(id); // findOne throws if not found

		// Actualizar el estado de verificación
		await this.employeeRepository.updateCredentials(id, {
			is_email_verified: true,
			verification_token: null, // Assuming token is cleared upon verification
		});

		this.logger.log("Email verified successfully", undefined, {
			employeeId: id,
		});
		return this.employeeRepository.findById(id); // Return the updated employee
	}

	async updateProfileImageUrl(id: string, imageUrl: string): Promise<Employee> {
		// Verificar si el empleado existe
		await this.findOne(id); // findOne throws if not found

		// Actualizar la URL de la imagen de perfil
		const updatedEmployee = await this.employeeRepository.update(id, {
			profile_image_url: imageUrl,
		});

		this.logger.log("Profile image URL updated", undefined, {
			employeeId: id,
			newImageUrl: imageUrl,
		});
		return updatedEmployee;
	}
}
