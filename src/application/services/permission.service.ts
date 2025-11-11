import {
	Injectable,
	BadRequestException,
	NotFoundException,
	Inject,
} from "@nestjs/common";
import { CreatePermissionDto } from "../dtos/permission/create-permission.dto";
import { UpdatePermissionDto } from "../dtos/permission/update-permission.dto";
import { Permission } from "../../domain/entities/permission.entity";
import { IPermissionRepository } from "../../domain/repositories/permission.repository.interface";
import { StructuredLoggerService } from "../../infrastructure/logging/structured-logger.service";

@Injectable()
export class PermissionService {
	constructor(
		@Inject("IPermissionRepository")
		private readonly permissionRepository: IPermissionRepository,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("PermissionService");
	}

	async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
		this.logger.log("Attempting to create permission", undefined, {
			name: createPermissionDto.name,
		});

		// Verificar si ya existe un permiso con el mismo nombre
		const existingPermission = await this.permissionRepository.findByName(
			createPermissionDto.name,
		);
		if (existingPermission) {
			this.logger.warn(
				"Permission creation failed: Name already exists",
				undefined,
				{
					name: createPermissionDto.name,
				},
			);
			throw new BadRequestException("Ya existe un permiso con ese nombre");
		}

		const newPermission = await this.permissionRepository.create(
			createPermissionDto,
		);

		this.logger.log("Permission created successfully", undefined, {
			permissionId: newPermission.id,
			name: newPermission.name,
		});

		return newPermission;
	}

	async findAll(): Promise<Permission[]> {
		this.logger.log("Fetching all permissions");
		return this.permissionRepository.findAll();
	}

	async findById(id: string): Promise<Permission> {
		const permission = await this.permissionRepository.findById(id);
		if (!permission) {
			throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
		}
		return permission;
	}

	async findByResource(resource: string): Promise<Permission[]> {
		this.logger.log("Fetching permissions by resource", undefined, {
			resource,
		});
		return this.permissionRepository.findByResource(resource);
	}

	async update(
		id: string,
		updatePermissionDto: UpdatePermissionDto,
	): Promise<Permission> {
		this.logger.log("Attempting to update permission", undefined, {
			permissionId: id,
		});

		const permission = await this.findById(id);

		// Si se está intentando cambiar el nombre, verificar que no exista otro permiso con ese nombre
		if (
			updatePermissionDto.name &&
			updatePermissionDto.name !== permission.name
		) {
			const existingPermission = await this.permissionRepository.findByName(
				updatePermissionDto.name,
			);
			if (existingPermission && existingPermission.id !== id) {
				throw new BadRequestException("Ya existe un permiso con ese nombre");
			}
		}

		const updatedPermission = await this.permissionRepository.update(
			id,
			updatePermissionDto,
		);

		this.logger.log("Permission updated successfully", undefined, {
			permissionId: id,
			name: updatedPermission.name,
		});

		return updatedPermission;
	}

	async delete(id: string): Promise<void> {
		this.logger.log("Attempting to delete permission", undefined, {
			permissionId: id,
		});

		await this.findById(id); // Esto lanzará error si no existe

		await this.permissionRepository.delete(id);

		this.logger.log("Permission deleted successfully", undefined, {
			permissionId: id,
		});
	}
}
