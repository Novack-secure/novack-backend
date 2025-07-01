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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
// EmployeeService removed
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from '../../application/dtos/employee';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileStorageService } from '../../application/services/file-storage.service';
import { ImageProcessingPipe } from '../../application/pipes/image-processing.pipe';
import { Express } from 'express';
// Import Use Cases
import {
  CreateEmployeeUseCase,
  GetAllEmployeesUseCase,
  GetEmployeeByIdUseCase,
  UpdateEmployeeUseCase,
  DeleteEmployeeUseCase,
  UpdateEmployeeProfileImageUseCase,
  // GetEmployeesBySupplierUseCase, // Not used in current controller version
  // GetEmployeeByEmailUseCase,    // Not used in current controller version
  // MarkEmployeeEmailAsVerifiedUseCase, // Not used in current controller version
} from '../../application/use-cases/employee';

@ApiTags('employees')
@Controller('employees')
export class EmployeeController {
  constructor(
    // Injected Use Cases
    private readonly createEmployeeUseCase: CreateEmployeeUseCase,
    private readonly getAllEmployeesUseCase: GetAllEmployeesUseCase,
    private readonly getEmployeeByIdUseCase: GetEmployeeByIdUseCase,
    private readonly updateEmployeeUseCase: UpdateEmployeeUseCase,
    private readonly deleteEmployeeUseCase: DeleteEmployeeUseCase,
    private readonly updateEmployeeProfileImageUseCase: UpdateEmployeeProfileImageUseCase,

    // Existing direct dependencies for specific tasks like file upload
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo empleado',
    description: `Registra un nuevo empleado en el sistema.
    - Valida que el email sea único
    - Hashea la contraseña automáticamente
    - Verifica si es el creador del proveedor
    - Solo puede haber un creador por proveedor`,
  })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiResponse({
    status: 201,
    description: 'El empleado ha sido creado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez',
        email: 'juan@empresa.com',
        is_creator: true,
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          name: 'Empresa ABC',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: `Datos de entrada inválidos. Posibles errores:
    - Email ya registrado
    - Contraseña muy corta
    - Proveedor no existe
    - Ya existe un creador para el proveedor`,
  })
  create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.createEmployeeUseCase.execute(createEmployeeDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los empleados',
    description: `Retorna la lista completa de empleados.
    - Incluye información del proveedor
    - No incluye contraseñas
    - Muestra si es creador del proveedor`,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de todos los empleados con sus relaciones.',
    schema: {
      type: 'array',
      items: {
        example: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Juan Pérez',
          email: 'juan@empresa.com',
          is_creator: true,
          supplier: {
            id: '987fcdeb-51a2-43f7-9abc-def012345678',
            name: 'Empresa ABC',
          },
        },
      },
    },
  })
  findAll() {
    return this.getAllEmployeesUseCase.execute();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener un empleado por ID',
    description: `Busca y retorna un empleado específico por su ID.
    - Incluye información del proveedor
    - No incluye contraseña
    - Muestra si es creador del proveedor`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'El empleado ha sido encontrado.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez',
        email: 'juan@empresa.com',
        is_creator: true,
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          name: 'Empresa ABC',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'ID con formato inválido.' })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado en el sistema.',
  })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.getEmployeeByIdUseCase.execute(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar un empleado',
    description: `Actualiza los datos de un empleado existente.
    - Permite actualizar datos básicos
    - Permite cambiar la contraseña
    - Valida email único si se actualiza
    - No permite modificar creador si ya existe uno`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({
    status: 200,
    description: 'El empleado ha sido actualizado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez Actualizado',
        email: 'juan.nuevo@empresa.com',
        is_creator: true,
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          name: 'Empresa ABC',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: `Datos de entrada inválidos. Posibles errores:
    - Email ya registrado
    - Contraseña muy corta
    - Proveedor no existe
    - Conflicto con creador existente`,
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado en el sistema.',
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.updateEmployeeUseCase.execute(id, updateEmployeeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un empleado',
    description: `Elimina un empleado del sistema.
    - No permite eliminar al creador del proveedor
    - La eliminación es permanente
    - No afecta al proveedor asociado`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'El empleado ha sido eliminado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: `Operación inválida. Posibles errores:
    - ID con formato inválido
    - Intento de eliminar al creador`,
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado en el sistema.',
  })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    // DeleteEmployeeUseCase returns Promise<void>, adjust controller if needed
    // For HttpCode(HttpStatus.NO_CONTENT), returning nothing is fine.
    return this.deleteEmployeeUseCase.execute(id);
  }

  @Patch(':id/profile-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('profileImage'))
  @ApiOperation({ summary: 'Subir o actualizar imagen de perfil del empleado' })
  @ApiParam({ name: 'id', description: 'ID UUID del empleado', type: String })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo de imagen de perfil (JPG, PNG, WEBP)',
    schema: {
      type: 'object',
      properties: {
        profileImage: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Imagen de perfil actualizada.' })
  @ApiResponse({
    status: 400,
    description:
      'Archivo inválido, tipo no permitido o error de procesamiento.',
  })
  @ApiResponse({ status: 404, description: 'Empleado no encontrado.' })
  async uploadProfileImage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile(ImageProcessingPipe)
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo.');
    }

    const bucketName = this.configService.get<string>(
      'AWS_S3_EMPLOYEE_BUCKET_NAME',
    );
    if (!bucketName) {
      throw new Error(
        'Nombre del bucket S3 para empleados no configurado (AWS_S3_EMPLOYEE_BUCKET_NAME).',
      );
    }

    const destinationPath = `profile/`;
    const imageUrl = await this.fileStorageService.uploadFile(
      bucketName,
      file.buffer,
      file.originalname,
      file.mimetype,
      destinationPath,
    );

    // Use the UpdateEmployeeProfileImageUseCase
    // This use case returns the updated Employee entity.
    // The controller can choose to return the full entity or a specific message.
    await this.updateEmployeeProfileImageUseCase.execute(id, imageUrl);

    return {
      message: 'Imagen de perfil actualizada correctamente.',
      url: imageUrl,
    };
  }
}
