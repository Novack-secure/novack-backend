import { Injectable, Inject, BadRequestException } from "@nestjs/common";
import { IEmployeeRepository } from "src/domain/repositories/employee.repository.interface"; // Fixed path
import { Employee } from "src/domain/entities"; // Fixed path
import { CreateEmployeeDto } from "src/application/dtos/employee/create-employee.dto"; // Fixed path
import * as bcrypt from "bcrypt";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Fixed path

@Injectable()
export class CreateEmployeeUseCase {
	constructor(
		@Inject(IEmployeeRepository) // Assuming IEmployeeRepository is the DI token
		private readonly employeeRepository: IEmployeeRepository,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("CreateEmployeeUseCase");
	}

	async execute(createEmployeeDto: CreateEmployeeDto): Promise<Employee> {
		this.logger.log("Attempting to create employee account", undefined, {
			email: createEmployeeDto.email,
			supplierId: createEmployeeDto.supplier_id, // Ensure supplier_id is part of CreateEmployeeDto
		});

		const { password, ...employeeData } = createEmployeeDto;

		const existingEmployee = await this.employeeRepository.findByEmail(
			employeeData.email,
		);
		if (existingEmployee) {
			this.logger.warn(
				"Employee account creation failed: Email already exists",
				undefined,
				{
					email: createEmployeeDto.email,
				},
			);
			// Note: Original EmployeeService used BadRequestException here.
			// The old use case threw a generic Error. Standardizing to BadRequestException.
			throw new BadRequestException(
				"Ya existe un empleado con este correo electrónico",
			);
		}

		const saltRounds = 10; // Consider making this configurable via ConfigService
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		// Prepare data for repository create method, ensuring credentials are structured correctly.
		// The IEmployeeRepository.create method is expected to handle the actual creation
		// of the Employee and its associated EmployeeCredentials.
		const newEmployeeData = {
			...employeeData, // Contains first_name, last_name, email, is_creator, supplier_id etc. from DTO
			credentials: {
				password_hash: hashedPassword,
				is_email_verified: false, // Default for new user
				two_factor_enabled: false, // Default for new user (TOTP 2FA)
				// Assuming other EmployeeCredentials defaults (like for SMS 2FA) are handled by entity definition
				// or are not set during initial creation.
			},
		};

		// Type casting to Partial<Employee> might be needed if createEmployeeDto doesn't perfectly align
		// or if the credentials part makes it not a direct Employee shape.
		// The repository's `create` method should be robust enough to handle this structure.
		const newEmployee = await this.employeeRepository.create(
			newEmployeeData as Partial<Employee>,
		);

		this.logger.log("Employee account created successfully", undefined, {
			employeeId: newEmployee.id,
			email: newEmployee.email,
		});
		return newEmployee;
	}
}
