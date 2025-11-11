import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Employee } from "src/domain/entities/employee.entity";
import { IEmployeeRepository } from "src/domain/repositories/employee.repository.interface";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";

@Injectable()
export class GetEmployeeByIdUseCase {
	constructor(
		@Inject(IEmployeeRepository) // Using the Symbol as DI token, assuming it's defined
		private readonly employeeRepository: IEmployeeRepository,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("GetEmployeeByIdUseCase");
	}

	async execute(id: string): Promise<Employee> {
		this.logger.log(`Attempting to fetch employee with id: ${id}`, undefined, {
			employeeId: id,
		});

		// The repository method findById should ideally handle which relations are loaded.
		// For a GetEmployeeById use case, it's common to load essential relations like 'credentials', 'supplier'.
		const employee = await this.employeeRepository.findById(id);

		if (!employee) {
			this.logger.warn(`Employee not found with id: ${id}`, undefined, {
				employeeId: id,
			});
			throw new NotFoundException(`Employee with ID "${id}" not found`);
		}

		this.logger.log(`Successfully fetched employee with id: ${id}`, undefined, {
			employeeId: id,
			// email: employee.email // Example of logging a non-sensitive detail
		});
		return employee;
	}
}
