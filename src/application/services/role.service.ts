import {
	Injectable,
	BadRequestException,
	NotFoundException,
	Inject,
} from "@nestjs/common";
import { CreateRoleDto } from "../dtos/role/create-role.dto";
import { UpdateRoleDto } from "../dtos/role/update-role.dto";
import { AssignPermissionsDto } from "../dtos/role/assign-permissions.dto";
import { Role } from "../../domain/entities/role.entity";
import { IRoleRepository } from "../../domain/repositories/role.repository.interface";
import { IPermissionRepository } from "../../domain/repositories/permission.repository.interface";
import { StructuredLoggerService } from "../../infrastructure/logging/structured-logger.service";

@Injectable()
export class RoleService {
	constructor(
		@Inject("IRoleRepository")
		private readonly roleRepository: IRoleRepository,
		@Inject("IPermissionRepository")
		private readonly permissionRepository: IPermissionRepository,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("RoleService");
	}

	async create(createRoleDto: CreateRoleDto): Promise<Role> {
		this.logger.log("Attempting to create role", undefined, {
			name: createRoleDto.name,
			supplierId: createRoleDto.supplier_id,
		});

		// Verificar si ya existe un rol con el mismo nombre para ese supplier
		if (createRoleDto.supplier_id) {
			const existingRole = await this.roleRepository.findByName(
				createRoleDto.name,
				createRoleDto.supplier_id,
			);
			if (existingRole) {
				this.logger.warn("Role creation failed: Name already exists", undefined, {
					name: createRoleDto.name,
					supplierId: createRoleDto.supplier_id,
				});
				throw new BadRequestException(
					"Ya existe un rol con ese nombre para este proveedor",
				);
			}
		}

		const { permission_ids, ...roleData } = createRoleDto;

		// Crear el rol
		const newRole = await this.roleRepository.create(roleData);

		// Si se proporcionaron permisos, asignarlos
		if (permission_ids && permission_ids.length > 0) {
			await this.roleRepository.assignPermissions(newRole.id, permission_ids);
		}

		this.logger.log("Role created successfully", undefined, {
			roleId: newRole.id,
			name: newRole.name,
		});

		return this.roleRepository.findById(newRole.id);
	}

	async findAll(): Promise<Role[]> {
		this.logger.log("Fetching all roles");
		return this.roleRepository.findAll();
	}

	async findById(id: string): Promise<Role> {
		const role = await this.roleRepository.findById(id);
		if (!role) {
			throw new NotFoundException(`Rol con ID ${id} no encontrado`);
		}
		return role;
	}

	async findBySupplier(supplierId: string): Promise<Role[]> {
		this.logger.log("Fetching roles by supplier", undefined, { supplierId });
		return this.roleRepository.findBySupplier(supplierId);
	}

	async findSystemRoles(): Promise<Role[]> {
		this.logger.log("Fetching system roles");
		return this.roleRepository.findSystemRoles();
	}

	async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
		this.logger.log("Attempting to update role", undefined, {
			roleId: id,
		});

		const role = await this.findById(id);

		// Si se está intentando cambiar el nombre, verificar que no exista otro rol con ese nombre
		if (updateRoleDto.name && updateRoleDto.name !== role.name) {
			const existingRole = await this.roleRepository.findByName(
				updateRoleDto.name,
				role.supplier_id,
			);
			if (existingRole && existingRole.id !== id) {
				throw new BadRequestException(
					"Ya existe un rol con ese nombre para este proveedor",
				);
			}
		}

		const { permission_ids, ...roleData } = updateRoleDto;

		// Actualizar el rol
		const updatedRole = await this.roleRepository.update(id, roleData);

		// Si se proporcionaron permisos, reemplazar los existentes
		if (permission_ids !== undefined) {
			// Primero remover todos los permisos actuales
			const currentPermissionIds = role.permissions.map((p) => p.id);
			if (currentPermissionIds.length > 0) {
				await this.roleRepository.removePermissions(id, currentPermissionIds);
			}

			// Luego asignar los nuevos
			if (permission_ids.length > 0) {
				await this.roleRepository.assignPermissions(id, permission_ids);
			}
		}

		this.logger.log("Role updated successfully", undefined, {
			roleId: id,
			name: updatedRole.name,
		});

		return this.roleRepository.findById(id);
	}

	async delete(id: string): Promise<void> {
		this.logger.log("Attempting to delete role", undefined, {
			roleId: id,
		});

		await this.findById(id); // Esto lanzará error si no existe

		await this.roleRepository.delete(id);

		this.logger.log("Role deleted successfully", undefined, {
			roleId: id,
		});
	}

	async assignPermissions(
		id: string,
		assignPermissionsDto: AssignPermissionsDto,
	): Promise<Role> {
		this.logger.log("Assigning permissions to role", undefined, {
			roleId: id,
			permissionCount: assignPermissionsDto.permission_ids.length,
		});

		await this.findById(id); // Verificar que existe

		// Verificar que todos los permisos existen
		const permissions = await this.permissionRepository.findByIds(
			assignPermissionsDto.permission_ids,
		);
		if (permissions.length !== assignPermissionsDto.permission_ids.length) {
			throw new NotFoundException("Uno o más permisos no fueron encontrados");
		}

		const updatedRole = await this.roleRepository.assignPermissions(
			id,
			assignPermissionsDto.permission_ids,
		);

		this.logger.log("Permissions assigned successfully", undefined, {
			roleId: id,
		});

		return updatedRole;
	}

	async removePermissions(
		id: string,
		assignPermissionsDto: AssignPermissionsDto,
	): Promise<Role> {
		this.logger.log("Removing permissions from role", undefined, {
			roleId: id,
			permissionCount: assignPermissionsDto.permission_ids.length,
		});

		await this.findById(id); // Verificar que existe

		const updatedRole = await this.roleRepository.removePermissions(
			id,
			assignPermissionsDto.permission_ids,
		);

		this.logger.log("Permissions removed successfully", undefined, {
			roleId: id,
		});

		return updatedRole;
	}
}
