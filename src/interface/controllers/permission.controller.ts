import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	ParseUUIDPipe,
	HttpStatus,
	HttpCode,
	UseGuards,
	Query,
} from "@nestjs/common";
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiBody,
} from "@nestjs/swagger";
import { PermissionService } from "../../application/services/permission.service";
import { CreatePermissionDto } from "../../application/dtos/permission/create-permission.dto";
import { UpdatePermissionDto } from "../../application/dtos/permission/update-permission.dto";
import { AuthGuard } from "../../application/guards/auth.guard";
import { PermissionsGuard } from "../../application/guards/permissions.guard";
import { Permissions } from "../../application/decorators/permissions.decorator";

@ApiTags("permissions")
@Controller("permissions")
@UseGuards(AuthGuard, PermissionsGuard)
export class PermissionController {
	constructor(private readonly permissionService: PermissionService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@Permissions("permissions.create")
	@ApiOperation({
		summary: "Crear un nuevo permiso",
		description:
			"Crea un nuevo permiso en el sistema. Solo usuarios con permiso 'permissions.create' pueden acceder.",
	})
	@ApiBody({ type: CreatePermissionDto })
	@ApiResponse({
		status: 201,
		description: "El permiso ha sido creado exitosamente.",
	})
	@ApiResponse({
		status: 400,
		description: "Datos inválidos o permiso ya existe.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para crear permisos.",
	})
	async create(@Body() createPermissionDto: CreatePermissionDto) {
		return this.permissionService.create(createPermissionDto);
	}

	@Get()
	@Permissions("permissions.read")
	@ApiOperation({
		summary: "Obtener todos los permisos",
		description:
			"Retorna la lista de todos los permisos disponibles en el sistema. Solo usuarios con permiso 'permissions.read' pueden acceder.",
	})
	@ApiResponse({
		status: 200,
		description: "Lista de permisos obtenida exitosamente.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para ver permisos.",
	})
	async findAll(@Query("resource") resource?: string) {
		if (resource) {
			return this.permissionService.findByResource(resource);
		}
		return this.permissionService.findAll();
	}

	@Get(":id")
	@Permissions("permissions.read")
	@ApiOperation({
		summary: "Obtener un permiso por ID",
		description: "Retorna los detalles de un permiso específico.",
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del permiso",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@ApiResponse({
		status: 200,
		description: "Permiso obtenido exitosamente.",
	})
	@ApiResponse({
		status: 404,
		description: "Permiso no encontrado.",
	})
	async findOne(@Param("id", ParseUUIDPipe) id: string) {
		return this.permissionService.findById(id);
	}

	@Patch(":id")
	@Permissions("permissions.update")
	@ApiOperation({
		summary: "Actualizar un permiso",
		description:
			"Actualiza la información de un permiso. Solo usuarios con permiso 'permissions.update' pueden acceder.",
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del permiso a actualizar",
	})
	@ApiBody({ type: UpdatePermissionDto })
	@ApiResponse({
		status: 200,
		description: "Permiso actualizado exitosamente.",
	})
	@ApiResponse({
		status: 404,
		description: "Permiso no encontrado.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para actualizar permisos.",
	})
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() updatePermissionDto: UpdatePermissionDto,
	) {
		return this.permissionService.update(id, updatePermissionDto);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@Permissions("permissions.delete")
	@ApiOperation({
		summary: "Eliminar un permiso",
		description:
			"Elimina un permiso del sistema. Solo usuarios con permiso 'permissions.delete' pueden acceder.",
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del permiso a eliminar",
	})
	@ApiResponse({
		status: 204,
		description: "Permiso eliminado exitosamente.",
	})
	@ApiResponse({
		status: 404,
		description: "Permiso no encontrado.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para eliminar permisos.",
	})
	async remove(@Param("id", ParseUUIDPipe) id: string) {
		await this.permissionService.delete(id);
	}
}
