/**
 * Implementación del repositorio de permisos
 *
 * Esta clase implementa la interfaz IPermissionRepository utilizando TypeORM
 * como tecnología de acceso a datos.
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Permission } from "../../domain/entities/permission.entity";
import { IPermissionRepository } from "../../domain/repositories/permission.repository.interface";

@Injectable()
export class PermissionRepository implements IPermissionRepository {
	constructor(
		@InjectRepository(Permission)
		private readonly permissionEntityRepository: Repository<Permission>,
	) {}

	async findAll(): Promise<Permission[]> {
		return this.permissionEntityRepository.find();
	}

	async findById(id: string): Promise<Permission | null> {
		return this.permissionEntityRepository.findOne({
			where: { id },
		});
	}

	async findByName(name: string): Promise<Permission | null> {
		return this.permissionEntityRepository.findOne({
			where: { name },
		});
	}

	async findByResource(resource: string): Promise<Permission[]> {
		return this.permissionEntityRepository.find({
			where: { resource },
		});
	}

	async findByIds(ids: string[]): Promise<Permission[]> {
		return this.permissionEntityRepository.find({
			where: { id: In(ids) },
		});
	}

	async create(permissionData: Partial<Permission>): Promise<Permission> {
		const permission = this.permissionEntityRepository.create(permissionData);
		return this.permissionEntityRepository.save(permission);
	}

	async update(
		id: string,
		permissionData: Partial<Permission>,
	): Promise<Permission> {
		const permission = await this.findById(id);
		if (!permission) {
			throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
		}

		Object.assign(permission, permissionData);
		return this.permissionEntityRepository.save(permission);
	}

	async delete(id: string): Promise<void> {
		const permission = await this.findById(id);
		if (!permission) {
			throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
		}

		await this.permissionEntityRepository.delete(id);
	}
}
