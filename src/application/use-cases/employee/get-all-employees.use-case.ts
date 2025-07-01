import { Inject, Injectable } from "@nestjs/common";
import { Employee } from "src/domain/entities/employee.entity"; // Fixed path
import { IEmployeeRepository } from "src/domain/repositories/employee.repository.interface"; // Fixed path
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service"; // Fixed path

@Injectable()
export class GetAllEmployeesUseCase {
	constructor(
		@Inject(IEmployeeRepository) // Use the DI token Symbol
		private readonly employeeRepository: IEmployeeRepository,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("GetAllEmployeesUseCase");
	}

	async execute(): Promise<Employee[]> {
		this.logger.log("Attempting to fetch all employees.");

		// The repository method findAll should ideally handle which relations are loaded.
		// For a GetAllEmployees use case, it's common to load essential relations
		// or provide pagination/filtering options in a more advanced scenario.
		// For now, a simple findAll is implemented.
		const employees = await this.employeeRepository.findAll();

		this.logger.log(
			`Successfully fetched ${employees.length} employees.`,
			undefined,
			{ count: employees.length },
		);
		return employees;
	}
}
