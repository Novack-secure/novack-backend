import {
	Inject,
	Injectable,
	NotFoundException,
	BadRequestException,
} from "@nestjs/common";
import { Employee } from "src/domain/entities/employee.entity";
import { IEmployeeRepository } from "src/domain/repositories/employee.repository.interface";
import { UpdateEmployeeDto } from "src/application/dtos/employee/update-employee.dto";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UpdateEmployeeUseCase {
	constructor(
		@Inject(IEmployeeRepository)
		private readonly employeeRepository: IEmployeeRepository,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("UpdateEmployeeUseCase");
	}

	async execute(
		id: string,
		updateEmployeeDto: UpdateEmployeeDto,
	): Promise<Employee> {
		this.logger.log(
			`Attempting to update employee account for id: ${id}`,
			undefined,
			{
				employeeId: id,
				// Avoid logging entire DTO if it contains sensitive data like password
				updateData: Object.keys(updateEmployeeDto),
			},
		);

		const { password, ...employeeDataToUpdate } = updateEmployeeDto;

		// 1. Verify employee exists
		// It's important that findById loads credentials if we need to check old password,
		// or if other credential fields were updatable here (they are not in this DTO).
		// For just checking existence, a lighter find might be okay, but findById often implies full entity.
		const existingEmployee = await this.employeeRepository.findById(id);
		if (!existingEmployee) {
			this.logger.warn(
				`Employee not found for update with id: ${id}`,
				undefined,
				{ employeeId: id },
			);
			throw new NotFoundException(`Employee with ID "${id}" not found`);
		}

		// 2. Handle password update if provided
		if (password) {
			this.logger.log(
				`Password change requested for employee id: ${id}`,
				undefined,
				{ employeeId: id },
			);
			const saltRounds = 10; // Consider making configurable via ConfigService
			const hashedPassword = await bcrypt.hash(password, saltRounds);

			// Assuming IEmployeeRepository has updateCredentials method
			await this.employeeRepository.updateCredentials(id, {
				password_hash: hashedPassword,
			});
			this.logger.log(`Password updated for employee id: ${id}`, undefined, {
				employeeId: id,
			});
		}

		// 3. Handle email uniqueness if email is being changed
		if (
			employeeDataToUpdate.email &&
			employeeDataToUpdate.email !== existingEmployee.email
		) {
			this.logger.log(
				`Email change requested for employee id: ${id}. Verifying uniqueness.`,
				undefined,
				{ employeeId: id, newEmail: employeeDataToUpdate.email },
			);
			const employeeWithNewEmail = await this.employeeRepository.findByEmail(
				employeeDataToUpdate.email,
			);
			if (employeeWithNewEmail && employeeWithNewEmail.id !== id) {
				this.logger.warn(
					"Employee update failed: New email already exists for another employee.",
					undefined,
					{
						employeeId: id,
						newEmail: employeeDataToUpdate.email,
						conflictingEmployeeId: employeeWithNewEmail.id,
					},
				);
				throw new BadRequestException(
					"Ya existe un empleado con el nuevo correo electrónico proporcionado.",
				);
			}
			// If email is changed, consider if is_email_verified should be reset.
			// Current DTO and logic does not specify this, so it's not implemented here.
			// If it were required:
			// await this.employeeRepository.updateCredentials(id, { is_email_verified: false, verification_token: newVerificationToken });
			// And then trigger a new verification email.
		}

		// 4. Update other employee data
		// The employeeDataToUpdate should not contain 'password' or 'credentials' fields at this point.
		// The repository's update method should only affect columns on the Employee table.
		if (Object.keys(employeeDataToUpdate).length > 0) {
			await this.employeeRepository.update(
				id,
				employeeDataToUpdate as Partial<Employee>,
			);
			this.logger.log(`Employee core data updated for id: ${id}`, undefined, {
				employeeId: id,
				updatedFields: Object.keys(employeeDataToUpdate),
			});
		} else if (!password) {
			this.logger.log(
				`No data provided for update for employee id: ${id} (excluding password)`,
				undefined,
				{ employeeId: id },
			);
			// No actual update to core fields if only password was in DTO and it was handled, or DTO was empty.
		}

		// 5. Re-fetch the entity to return the latest state
		const resultEmployee = await this.employeeRepository.findById(id);
		if (!resultEmployee) {
			this.logger.error(
				`Failed to re-fetch employee after update for id: ${id}. This indicates a critical issue.`,
				undefined,
				JSON.stringify({ employeeId: id }),
			);
			// This case should ideally not be reached if the 'id' is valid and the employee existed.
			// It might indicate a race condition or an issue with the update/find process.
			throw new NotFoundException(
				`Employee with ID "${id}" could not be found after update operations.`,
			);
		}

		this.logger.log(
			`Employee account updated successfully and re-fetched for id: ${id}`,
			undefined,
			{ employeeId: id },
		);
		return resultEmployee;
	}
}
