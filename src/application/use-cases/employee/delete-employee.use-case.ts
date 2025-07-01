import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IEmployeeRepository } from 'src/domain/repositories/employee.repository.interface';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';

@Injectable()
export class DeleteEmployeeUseCase {
  constructor(
    @Inject(IEmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('DeleteEmployeeUseCase');
  }

  async execute(id: string): Promise<void> {
    this.logger.log(
      `Attempting to delete employee with id: ${id}`,
      undefined,
      JSON.stringify({ employeeId: id }),
    );

    // First, verify the employee exists.
    // The findById method might also load relations if necessary for any pre-delete business logic,
    // though for a simple delete, just confirming existence is often enough.
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      this.logger.warn(
        `Employee not found for deletion with id: ${id}`,
        undefined,
        JSON.stringify({ employeeId: id }),
      );
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    // Business rules before deletion would be checked here. For example:
    // if (employee.is_creator && await this.isLastAdminForSupplier(employee.supplier_id)) {
    //   this.logger.warn(`Attempt to delete last admin employee for supplier failed`, undefined, JSON.stringify({ employeeId: id, supplierId: employee.supplier_id }));
    //   throw new BadRequestException('Cannot delete the last admin of a supplier.');
    // }
    // For this refactoring, we are replicating the existing service logic which was a direct delete.

    // The IEmployeeRepository.delete method is expected to take an ID string.
    // If it were to take an entity, we would pass `employee`.
    // The existing EmployeeRepository.delete(id: string) is suitable.
    await this.employeeRepository.delete(id);

    this.logger.log(
      `Successfully deleted employee with id: ${id}`,
      undefined,
      JSON.stringify({ employeeId: id }),
    );
  }

  // Example of a helper method for a business rule, if needed:
  // private async isLastAdminForSupplier(supplierId: string): Promise<boolean> {
  //   const adminEmployees = await this.employeeRepository.findAdminsBySupplier(supplierId);
  //   return adminEmployees.length === 1;
  // }
}
