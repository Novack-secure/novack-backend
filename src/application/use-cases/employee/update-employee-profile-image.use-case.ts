import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Employee } from 'src/domain/entities/employee.entity';
import { IEmployeeRepository } from 'src/domain/repositories/employee.repository.interface';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';

@Injectable()
export class UpdateEmployeeProfileImageUseCase {
  constructor(
    @Inject(IEmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('UpdateEmployeeProfileImageUseCase');
  }

  async execute(id: string, imageUrl: string): Promise<Employee> {
    this.logger.log(
      `Attempting to update profile image URL for employee id: ${id}`,
      undefined,
      JSON.stringify({
        employeeId: id,
        // Logging the newImageUrl might be verbose if it's a long signed URL.
        // Consider logging only a part of it or a flag indicating it's being updated.
        // For now, logging as per instruction.
        newImageUrl: imageUrl,
      }),
    );

    // 1. Fetch the existing employee.
    const employee = await this.employeeRepository.findById(id);
    if (!employee) {
      this.logger.warn(
        `Employee not found for profile image update with id: ${id}`,
        undefined,
        JSON.stringify({ employeeId: id }),
      );
      throw new NotFoundException(`Employee with ID "${id}" not found`);
    }

    // 2. Update the profile_image_url property on the fetched entity.
    employee.profile_image_url = imageUrl;

    // 3. Save the updated entity.
    // The IEmployeeRepository.save method should handle persisting this change.
    // TypeORM's `save` method on a repository will update the entity if it has an ID and exists,
    // or insert it if it's new. Since we fetched it, it has an ID.
    await this.employeeRepository.save(employee);
    // Note: The current EmployeeRepository.update(id, data) calls save then findById.
    // Here, we're more explicit: find, modify, save. Then re-fetch for consistency.

    this.logger.log(
      `Successfully updated profile image URL in repository for employee id: ${id}`,
      undefined,
      JSON.stringify({
        employeeId: id,
        updatedImageUrlInRepo: imageUrl,
      }),
    );

    // 4. Re-fetch the entity to ensure the returned object is the latest state from the database,
    // consistent with other use cases that perform updates.
    const finalUpdatedEmployee = await this.employeeRepository.findById(id);
    if (!finalUpdatedEmployee) {
      // This should be extremely unlikely if the save operation succeeded.
      this.logger.error(
        'Critical: Failed to re-fetch employee after profile image URL update. Data inconsistency possible.',
        undefined,
        JSON.stringify({ employeeId: id }),
      );
      throw new NotFoundException(
        `Employee with ID "${id}" could not be found after the update operation.`,
      );
    }

    this.logger.log(
      `Re-fetched employee after profile image update for id: ${id}`,
      undefined,
      JSON.stringify({ employeeId: id }),
    );
    return finalUpdatedEmployee;
  }
}
