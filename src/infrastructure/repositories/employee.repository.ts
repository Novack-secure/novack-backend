/**
 * Implementación del repositorio de empleados
 *
 * Esta clase implementa la interfaz IEmployeeRepository utilizando TypeORM
 * como tecnología de acceso a datos.
 */

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Employee } from "../../domain/entities/employee.entity";
import { EmployeeCredentials } from "../../domain/entities/employee-credentials.entity";
import { IEmployeeRepository } from "../../domain/repositories/employee.repository.interface";

@Injectable()
export class EmployeeRepository implements IEmployeeRepository {
	constructor(
		@InjectRepository(Employee)
		private readonly employeeEntityRepository: Repository<Employee>,
		@InjectRepository(EmployeeCredentials)
		private readonly credentialsRepository: Repository<EmployeeCredentials>,
	) {}

	async findAll(): Promise<Employee[]> {
		return this.employeeEntityRepository.find({
			relations: ["supplier", "credentials"],
		});
	}

	async findById(id: string): Promise<Employee | null> {
		return this.employeeEntityRepository.findOne({
			where: { id },
			relations: ["supplier", "credentials"],
		});
	}

	async findByEmail(email: string): Promise<Employee | null> {
		return this.employeeEntityRepository.findOne({
			where: { email },
			relations: ["supplier", "credentials"],
		});
	}

	async findByEmailWithCredentialsAndPhone(
		email: string,
	): Promise<Employee | null> {
		return this.employeeEntityRepository.findOne({
			where: { email },
			relations: ["credentials"],
		});
	}

	async findByIdWithCredentialsAndPhone(id: string): Promise<Employee | null> {
		return this.employeeEntityRepository.findOne({
			where: { id },
			relations: ["credentials"],
		});
	}

	async findByIdWithCredentials(id: string): Promise<Employee | null> {
		return this.employeeEntityRepository.findOne({
			where: { id },
			relations: ["credentials"],
		});
	}

	async create(employeeData: Partial<Employee>): Promise<Employee> {
		const newEmployee = this.employeeEntityRepository.create(employeeData);

		// Si se proporcionan credenciales, crearlas
		if (employeeData.credentials) {
			const credentials = this.credentialsRepository.create(
				employeeData.credentials,
			);
			newEmployee.credentials =
				await this.credentialsRepository.save(credentials);
		}

		return this.employeeEntityRepository.save(newEmployee);
	}

	async update(id: string, employeeData: Partial<Employee>): Promise<Employee> {
		// Si hay credenciales para actualizar
		if (employeeData.credentials) {
			const employee = await this.findById(id);
			if (employee?.credentials) {
				await this.credentialsRepository.update(
					employee.credentials.id,
					employeeData.credentials,
				);
			}
		}

		await this.employeeEntityRepository.update(id, employeeData);
		return this.findById(id);
	}

	async delete(id: string): Promise<void> {
		// Las credenciales se eliminarán automáticamente por la relación CASCADE
		await this.employeeEntityRepository.delete(id);
	}

	async findBySupplier(supplierId: string): Promise<Employee[]> {
		return this.employeeEntityRepository.find({
			where: { supplier: { id: supplierId } },
			relations: ["supplier", "credentials"],
		});
	}

	// Métodos específicos para credenciales
	async updateCredentials(
		employeeId: string,
		credentials: Partial<EmployeeCredentials>,
	): Promise<void> {
		const employee = await this.findById(employeeId);
		if (employee?.credentials) {
			await this.credentialsRepository.update(
				employee.credentials.id,
				credentials,
			);
		}
	}

	async findByVerificationToken(token: string): Promise<Employee | null> {
		return this.employeeEntityRepository.findOne({
			where: { credentials: { verification_token: token } },
			relations: ["credentials"],
		});
	}

	async findByResetToken(token: string): Promise<Employee | null> {
		return this.employeeEntityRepository.findOne({
			where: { credentials: { reset_token: token } },
			relations: ["credentials"],
		});
	}

	async save(employee: Employee): Promise<Employee> {
		// TypeORM's save method handles both insert and update.
		// If 'employee' has an 'id' and it exists, it's an update.
		// Otherwise, it's an insert.
		// It will also cascade save related entities like 'credentials' if the Employee entity instance
		// has the 'credentials' property set and the relation is configured for cascade insert/update.
		// The Employee entity's OneToOne relation to EmployeeCredentials should have cascade: true.
		return this.employeeEntityRepository.save(employee);
	}
}
