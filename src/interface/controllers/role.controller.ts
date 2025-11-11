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
import { RoleService } from "../../application/services/role.service";
import { CreateRoleDto } from "../../application/dtos/role/create-role.dto";
import { UpdateRoleDto } from "../../application/dtos/role/update-role.dto";
import { AssignPermissionsDto } from "../../application/dtos/role/assign-permissions.dto";
import { AuthGuard } from "../../application/guards/auth.guard";
import { PermissionsGuard } from "../../application/guards/permissions.guard";
import { Permissions } from "../../application/decorators/permissions.decorator";

@ApiTags("roles")
@Controller("roles")
@UseGuards(AuthGuard, PermissionsGuard)
export class RoleController {
	constructor(private readonly roleService: RoleService) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@Permissions("roles.create")
	@ApiOperation({
		summary: "Crear un nuevo rol",
		description:
			"Crea un nuevo rol con los permisos especificados. Solo usuarios con permiso 'roles.create' pueden acceder.",
	})
	@ApiBody({ type: CreateRoleDto })
	@ApiResponse({
		status: 201,
		description: "El rol ha sido creado exitosamente.",
	})
	@ApiResponse({
		status: 400,
		description: "Datos inválidos o rol ya existe.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para crear roles.",
	})
	async create(@Body() createRoleDto: CreateRoleDto) {
		return this.roleService.create(createRoleDto);
	}

	@Get()
	@Permissions("roles.read")
	@ApiOperation({
		summary: "Obtener todos los roles",
		description:
			"Retorna la lista de todos los roles. Solo usuarios con permiso 'roles.read' pueden acceder.",
	})
	@ApiResponse({
		status: 200,
		description: "Lista de roles obtenida exitosamente.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para ver roles.",
	})
	async findAll(@Query("supplierId") supplierId?: string) {
		if (supplierId) {
			return this.roleService.findBySupplier(supplierId);
		}
		return this.roleService.findAll();
	}

	@Get("system")
	@Permissions("roles.read")
	@ApiOperation({
		summary: "Obtener roles del sistema",
		description:
			"Retorna los roles protegidos del sistema que no pueden ser eliminados.",
	})
	@ApiResponse({
		status: 200,
		description: "Lista de roles del sistema obtenida exitosamente.",
	})
	async findSystemRoles() {
		return this.roleService.findSystemRoles();
	}

	@Get(":id")
	@Permissions("roles.read")
	@ApiOperation({
		summary: "Obtener un rol por ID",
		description: "Retorna los detalles de un rol específico incluyendo sus permisos.",
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del rol",
		example: "123e4567-e89b-12d3-a456-426614174000",
	})
	@ApiResponse({
		status: 200,
		description: "Rol obtenido exitosamente.",
	})
	@ApiResponse({
		status: 404,
		description: "Rol no encontrado.",
	})
	async findOne(@Param("id", ParseUUIDPipe) id: string) {
		return this.roleService.findById(id);
	}

	@Patch(":id")
	@Permissions("roles.update")
	@ApiOperation({
		summary: "Actualizar un rol",
		description:
			"Actualiza la información de un rol. Solo usuarios con permiso 'roles.update' pueden acceder.",
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del rol a actualizar",
	})
	@ApiBody({ type: UpdateRoleDto })
	@ApiResponse({
		status: 200,
		description: "Rol actualizado exitosamente.",
	})
	@ApiResponse({
		status: 404,
		description: "Rol no encontrado.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para actualizar roles.",
	})
	async update(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() updateRoleDto: UpdateRoleDto,
	) {
		return this.roleService.update(id, updateRoleDto);
	}

	@Delete(":id")
	@HttpCode(HttpStatus.NO_CONTENT)
	@Permissions("roles.delete")
	@ApiOperation({
		summary: "Eliminar un rol",
		description:
			"Elimina un rol del sistema. Los roles del sistema no pueden ser eliminados. Solo usuarios con permiso 'roles.delete' pueden acceder.",
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del rol a eliminar",
	})
	@ApiResponse({
		status: 204,
		description: "Rol eliminado exitosamente.",
	})
	@ApiResponse({
		status: 404,
		description: "Rol no encontrado.",
	})
	@ApiResponse({
		status: 400,
		description: "No se pueden eliminar roles del sistema.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para eliminar roles.",
	})
	async remove(@Param("id", ParseUUIDPipe) id: string) {
		await this.roleService.delete(id);
	}

	@Post(":id/permissions")
	@Permissions("permissions.assign")
	@ApiOperation({
		summary: "Asignar permisos a un rol",
		description:
			"Agrega nuevos permisos a un rol sin eliminar los existentes. Solo usuarios con permiso 'permissions.assign' pueden acceder.",
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del rol",
	})
	@ApiBody({ type: AssignPermissionsDto })
	@ApiResponse({
		status: 200,
		description: "Permisos asignados exitosamente.",
	})
	@ApiResponse({
		status: 404,
		description: "Rol o permisos no encontrados.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para asignar permisos.",
	})
	async assignPermissions(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() assignPermissionsDto: AssignPermissionsDto,
	) {
		return this.roleService.assignPermissions(id, assignPermissionsDto);
	}

	@Delete(":id/permissions")
	@Permissions("permissions.assign")
	@ApiOperation({
		summary: "Remover permisos de un rol",
		description:
			"Elimina permisos específicos de un rol. Solo usuarios con permiso 'permissions.assign' pueden acceder.",
	})
	@ApiParam({
		name: "id",
		description: "ID UUID del rol",
	})
	@ApiBody({ type: AssignPermissionsDto })
	@ApiResponse({
		status: 200,
		description: "Permisos removidos exitosamente.",
	})
	@ApiResponse({
		status: 404,
		description: "Rol no encontrado.",
	})
	@ApiResponse({
		status: 403,
		description: "No tienes permisos para remover permisos.",
	})
	async removePermissions(
		@Param("id", ParseUUIDPipe) id: string,
		@Body() assignPermissionsDto: AssignPermissionsDto,
	) {
		return this.roleService.removePermissions(id, assignPermissionsDto);
	}
}
