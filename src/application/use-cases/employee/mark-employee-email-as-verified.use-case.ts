import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Employee } from 'src/domain/entities/employee.entity';
import { IEmployeeRepository } from 'src/domain/repositories/employee.repository.interface';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';

@Injectable()
export class MarkEmployeeEmailAsVerifiedUseCase {
  constructor(
    @Inject(IEmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('MarkEmployeeEmailAsVerifiedUseCase');
  }

  async execute(employeeId: string): Promise<Employee> {
    this.logger.log(
      `Attempting to mark email as verified for employee id: ${employeeId}`,
      undefined,
      JSON.stringify({ employeeId }),
    );

    // Fetch employee, ensuring credentials are part of the loaded entity.
    // The IEmployeeRepository.findById should ideally load relations like 'credentials'.
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      this.logger.warn(
        `Employee not found when attempting to mark email as verified: ${employeeId}`,
        undefined,
        JSON.stringify({ employeeId }),
      );
      throw new NotFoundException(`Employee with ID "${employeeId}" not found`);
    }

    // It's important to check if employee.credentials exists before accessing its properties.
    if (!employee.credentials) {
      this.logger.error(
        `Employee credentials not found for employee: ${employeeId}. Cannot verify email.`,
        undefined,
        JSON.stringify({ employeeId }),
      );
      throw new BadRequestException(
        `Credentials not found for employee ID "${employeeId}". Email verification cannot proceed.`,
      );
    }

    if (employee.credentials.is_email_verified) {
      this.logger.log(
        `Email is already verified for employee: ${employeeId}. No action taken.`,
        undefined,
        JSON.stringify({ employeeId }),
      );
      // Return the employee as is. No re-fetch needed if no change was made.
      return employee;
    }

    // Update credentials: mark email as verified and clear verification/reset tokens.
    // This relies on the IEmployeeRepository.updateCredentials method.
    await this.employeeRepository.updateCredentials(employeeId, {
      is_email_verified: true,
      verification_token: null, // Clear the verification token as it's now used
      reset_token_expires: null, // Clear any expiry associated with the verification_token (if same field is used)
      // If reset_token_expires is for password resets only, this line might not be needed.
      // Original service cleared reset_token_expires, so replicating that.
    });

    this.logger.log(
      `Email marked as verified successfully for employee id: ${employeeId}`,
      undefined,
      JSON.stringify({ employeeId }),
    );

    // Re-fetch the employee to get the latest state, including the updated credentials.
    const updatedEmployee = await this.employeeRepository.findById(employeeId);
    if (!updatedEmployee) {
      // This state (employee existed, was updated, then not found) should be highly unlikely.
      this.logger.error(
        `Critical: Failed to re-fetch employee after marking email verified: ${employeeId}. This may indicate a data consistency issue.`,
        undefined,
        JSON.stringify({ employeeId }),
      );
      throw new NotFoundException(
        `Employee with ID "${employeeId}" could not be found after verification update.`,
      );
    }

    this.logger.log(
      `Successfully re-fetched employee after email verification: ${employeeId}`,
      undefined,
      JSON.stringify({
        employeeId,
        isEmailVerified: updatedEmployee.credentials?.is_email_verified,
      }),
    );
    return updatedEmployee;
  }
}
