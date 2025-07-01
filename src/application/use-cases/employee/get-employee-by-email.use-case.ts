import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Employee } from 'src/domain/entities/employee.entity';
import { IEmployeeRepository } from 'src/domain/repositories/employee.repository.interface';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';

@Injectable()
export class GetEmployeeByEmailUseCase {
  constructor(
    @Inject(IEmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('GetEmployeeByEmailUseCase');
  }

  async execute(email: string): Promise<Employee | null> {
    // Avoid logging the full email directly if it's considered PII that shouldn't always be in logs,
    // or ensure logger sanitizes it. For this example, logging it as per typical debug/info needs.
    this.logger.log(
      `Attempting to fetch employee with email: ${email}`,
      undefined,
      { email },
    );

    // The repository method findByEmail should ideally handle which relations are loaded.
    // For this use case, it's common to load essential relations like 'credentials', 'supplier'.
    const employee = await this.employeeRepository.findByEmail(email);

    if (!employee) {
      this.logger.log(
        `Employee not found with email: ${email}. Returning null as per contract.`,
        undefined,
        { email },
      );
      // Maintaining the contract of original EmployeeService.findByEmail which returned null.
      // If a "must exist" behavior is needed, a different use case or a flag in this one could be used,
      // which would then throw a NotFoundException.
      return null;
    }

    this.logger.log(
      `Successfully fetched employee with email: ${email}`,
      undefined,
      {
        employeeId: employee.id,
        email,
      },
    );
    return employee;
  }
}
