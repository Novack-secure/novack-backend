/**
 * Implementación del repositorio de roles
 *
 * Esta clase implementa la interfaz IRoleRepository utilizando TypeORM
 * como tecnología de acceso a datos.
 */

import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Role } from "../../domain/entities/role.entity";
import { Permission } from "../../domain/entities/permission.entity";
import { IRoleRepository } from "../../domain/repositories/role.repository.interface";

@Injectable()
export class RoleRepository implements IRoleRepository {
	constructor(
		@InjectRepository(Role)
		private readonly roleEntityRepository: Repository<Role>,
		@InjectRepository(Permission)
		private readonly permissionRepository: Repository<Permission>,
	) {}

	async findAll(): Promise<Role[]> {
		return this.roleEntityRepository.find({
			relations: ["permissions", "supplier"],
		});
	}

	async findById(id: string): Promise<Role | null> {
		return this.roleEntityRepository.findOne({
			where: { id },
			relations: ["permissions", "supplier"],
		});
	}

	async findByName(name: string, supplierId?: string): Promise<Role | null> {
		const where: any = { name };
		if (supplierId) {
			where.supplier_id = supplierId;
		}
		return this.roleEntityRepository.findOne({
			where,
			relations: ["permissions"],
		});
	}

	async findBySupplier(supplierId: string): Promise<Role[]> {
		return this.roleEntityRepository.find({
			where: { supplier_id: supplierId },
			relations: ["permissions"],
		});
	}

	async findSystemRoles(): Promise<Role[]> {
		return this.roleEntityRepository.find({
			where: { is_system_role: true },
			relations: ["permissions"],
		});
	}

	async create(roleData: Partial<Role>): Promise<Role> {
		const role = this.roleEntityRepository.create(roleData);
		return this.roleEntityRepository.save(role);
	}

	async update(id: string, roleData: Partial<Role>): Promise<Role> {
		const role = await this.findById(id);
		if (!role) {
			throw new NotFoundException(`Rol con ID ${id} no encontrado`);
		}

		// No permitir actualizar is_system_role si ya es un rol del sistema
		if (role.is_system_role && roleData.is_system_role === false) {
			throw new Error(
				"No se puede remover la marca de rol del sistema de un rol protegido",
			);
		}

		Object.assign(role, roleData);
		return this.roleEntityRepository.save(role);
	}

	async delete(id: string): Promise<void> {
		const role = await this.findById(id);
		if (!role) {
			throw new NotFoundException(`Rol con ID ${id} no encontrado`);
		}

		if (role.is_system_role) {
			throw new Error("No se pueden eliminar roles del sistema");
		}

		await this.roleEntityRepository.delete(id);
	}

	async assignPermissions(
		roleId: string,
		permissionIds: string[],
	): Promise<Role> {
		const role = await this.findById(roleId);
		if (!role) {
			throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
		}

		const permissions = await this.permissionRepository.find({
			where: { id: In(permissionIds) },
		});

		if (permissions.length !== permissionIds.length) {
			throw new NotFoundException("Uno o más permisos no fueron encontrados");
		}

		// Agregar nuevos permisos sin eliminar los existentes
		const existingPermissionIds = role.permissions.map((p) => p.id);
		const newPermissions = permissions.filter(
			(p) => !existingPermissionIds.includes(p.id),
		);

		role.permissions = [...role.permissions, ...newPermissions];
		return this.roleEntityRepository.save(role);
	}

	async removePermissions(
		roleId: string,
		permissionIds: string[],
	): Promise<Role> {
		const role = await this.findById(roleId);
		if (!role) {
			throw new NotFoundException(`Rol con ID ${roleId} no encontrado`);
		}

		// Filtrar los permisos que NO están en la lista de IDs a remover
		role.permissions = role.permissions.filter(
			(p) => !permissionIds.includes(p.id),
		);

		return this.roleEntityRepository.save(role);
	}
}
