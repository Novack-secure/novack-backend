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
  UseGuards,
  Query,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { EmployeeService } from '../../application/services/employee.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from '../../application/dtos/employee';
import { Public } from '../../application/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { SupplierAccessGuard } from '../../application/guards/supplier-access.guard';
import { AuthGuard } from '../../application/guards/auth.guard';
import { FileStorageService } from '../../application/services/file-storage.service';
import { ImageProcessingPipe } from '../../application/pipes/image-processing.pipe';
import { Express } from 'express';
import {
  CreateEmployeeUseCase,
  GetAllEmployeesUseCase,
  GetEmployeeByIdUseCase,
  UpdateEmployeeUseCase,
  DeleteEmployeeUseCase,
  UpdateEmployeeProfileImageUseCase,
} from '../../application/use-cases/employee';

@ApiTags('employees')
@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly fileStorageService: FileStorageService,
    private readonly configService: ConfigService,
    private readonly getEmployeeByIdUseCase: GetEmployeeByIdUseCase,
    private readonly updateEmployeeProfileImageUseCase: UpdateEmployeeProfileImageUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear un nuevo empleado',
    description: `Registra un nuevo empleado en el sistema.
    - Valida que el email sea único
    - Hashea la contraseña automáticamente
    - Verifica si es el creador del proveedor
    - Solo puede haber un creador por proveedor`
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
          name: 'Empresa ABC'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: `Datos de entrada inválidos. Posibles errores:
    - Email ya registrado
    - Contraseña muy corta
    - Proveedor no existe
    - Ya existe un creador para el proveedor`
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor'
  })
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.create(createEmployeeDto);
  }

  @Post('public')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear empleado público (sin autenticación)',
    description: 'Crea un empleado sin requerir autenticación. Usado para registro inicial.'
  })
  @ApiBody({ type: CreateEmployeeDto })
  @ApiResponse({
    status: 201,
    description: 'Empleado creado exitosamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  async createPublic(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.createPublic(createEmployeeDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener todos los empleados',
    description: `Retorna la lista completa de empleados.
    - Incluye información del proveedor
    - No incluye contraseñas
    - Muestra si es creador del proveedor`
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
            name: 'Empresa ABC'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del servidor'
  })
  findAll() {
    return this.employeeService.findAll();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener información del usuario actual',
    description: 'Obtiene la información del empleado autenticado actualmente.'
  })
  @ApiResponse({
    status: 200,
    description: 'Información del usuario obtenida exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@empresa.com',
        is_creator: true,
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          supplier_name: 'Empresa ABC'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  async getCurrentUser(@Req() req: any): Promise<any> {
    console.log('req.user:', req.user);
    return this.employeeService.findOne(req.user.id);
  }

  @Get('supplier/:supplierId')
  @UseGuards(AuthGuard, SupplierAccessGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener empleados por proveedor',
    description: `Retorna la lista de empleados de un proveedor específico.
    - Filtra por supplier_id
    - Incluye información del proveedor
    - No incluye contraseñas
    - Muestra si es creador del proveedor
    - Solo permite acceso a empleados del propio proveedor (seguridad)`
  })
  @ApiParam({
    name: 'supplierId',
    description: 'ID UUID del proveedor',
    example: '987fcdeb-51a2-43f7-9abc-def012345678'
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de empleados del proveedor especificado.',
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
            name: 'Empresa ABC'
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo puedes ver empleados de tu propio proveedor',
  })
  @ApiResponse({
    status: 404,
    description: 'Proveedor no encontrado'
  })
  findBySupplier(@Param('supplierId', ParseUUIDPipe) supplierId: string) {
    return this.employeeService.findBySupplier(supplierId);
  }

          @Get('search/contacts')
          @UseGuards(AuthGuard)
          @HttpCode(HttpStatus.OK)
          @ApiOperation({
            summary: 'Buscar contactos por nombre o email dentro del mismo supplier',
            description: `Busca empleados por nombre o email dentro del mismo supplier.
            - Búsqueda por nombre completo (first_name + last_name)
            - Búsqueda por email parcial
            - Solo retorna empleados del mismo supplier
            - Limitado a 20 resultados
            - Excluye al usuario actual de los resultados`
          })
          @ApiResponse({
            status: 200,
            description: 'Lista de contactos encontrados',
            schema: {
              type: 'array',
              items: {
                example: {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  first_name: 'Juan',
                  last_name: 'Pérez',
                  email: 'juan@empresa.com',
                  supplier: {
                    id: '987fcdeb-51a2-43f7-9abc-def012345678',
                    supplier_name: 'Empresa ABC'
                  }
                }
              }
            }
          })
          @ApiResponse({
            status: 401,
            description: 'No autorizado',
          })
          @ApiResponse({
            status: 403,
            description: 'Acceso denegado',
          })
          async searchContacts(
            @Query('q') query: string,
            @Req() req: any
          ) {
            try {
              console.log('🔍 searchContacts method called with query:', query);
              console.log('🔍 User from request:', req.user);
              
              if (!req.user?.supplier_id) {
                throw new BadRequestException('Usuario sin supplier asignado');
              }

              // Buscar empleados del mismo supplier
              const employees = await this.employeeService.findBySupplier(req.user.supplier_id);
              console.log('🔍 Total employees in supplier:', employees.length);
              console.log('🔍 Employee names:', employees.map(emp => `${emp.first_name} ${emp.last_name}`));
              
              // Por ahora, devolver todos los empleados del supplier (sin filtro de búsqueda)
              // Excluir al usuario actual
              const contacts = employees.filter(emp => emp.id !== req.user.id);
              
              console.log('🔍 Final contacts:', contacts.length);
              console.log('🔍 Contact names:', contacts.map(emp => `${emp.first_name} ${emp.last_name}`));
              return contacts;
            } catch (error) {
              console.error('❌ Error in searchContacts:', error);
              throw new InternalServerErrorException(`Error searching contacts: ${error.message}`);
            }
          }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener un empleado por ID',
    description: `Busca y retorna un empleado específico por su ID.
    - Incluye información del proveedor
    - No incluye contraseña
    - Muestra si es creador del proveedor`
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado',
    example: '123e4567-e89b-12d3-a456-426614174000'
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
          name: 'Empresa ABC'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado'
  })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.employeeService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar un empleado',
    description: `Actualiza la información de un empleado existente.
    - Valida que el empleado exista
    - Actualiza solo los campos proporcionados
    - Mantiene la integridad de los datos`
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado a actualizar',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({ type: UpdateEmployeeDto })
  @ApiResponse({
    status: 200,
    description: 'El empleado ha sido actualizado exitosamente.',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Juan Pérez Actualizado',
        email: 'juan.actualizado@empresa.com',
        is_creator: true,
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          name: 'Empresa ABC'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos'
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado'
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar un empleado',
    description: `Elimina un empleado del sistema.
    - Elimina también las credenciales asociadas
    - No se puede eliminar el creador del proveedor
    - Elimina en cascada las relaciones`
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado a eliminar',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: 204,
    description: 'El empleado ha sido eliminado exitosamente.'
  })
  @ApiResponse({
    status: 400,
    description: 'No se puede eliminar el creador del proveedor'
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado'
  })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.employeeService.remove(id);
  }

  @Patch(':id/profile-image')
  @UseInterceptors(FileInterceptor('profileImage'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Actualizar imagen de perfil del empleado',
    description: `Actualiza la imagen de perfil de un empleado.
    - Valida que el archivo sea una imagen
    - Procesa y redimensiona la imagen
    - Almacena en el servicio de archivos configurado
    - Actualiza la URL en la base de datos`
  })
  @ApiParam({
    name: 'id',
    description: 'ID UUID del empleado',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Archivo de imagen de perfil',
    schema: {
      type: 'object',
      properties: {
        profileImage: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPG, PNG, WebP)'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Imagen de perfil actualizada exitosamente',
    schema: {
      example: {
        message: 'Imagen de perfil actualizada correctamente.',
        url: 'https://storage.example.com/profiles/123e4567-e89b-12d3-a456-426614174000.jpg'
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo inválido o formato no soportado'
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado'
  })
  @ApiResponse({
    status: 413,
    description: 'Archivo demasiado grande'
  })
  async updateProfileImage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: /^image\/(jpeg|jpg|png|webp)$/ }),
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo de imagen');
    }

    // Verificar que el empleado existe
    const employee = await this.employeeService.findOne(id);
    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    // Procesar la imagen
    const processedImage = await new ImageProcessingPipe().transform(file, {} as any);

    // Generar nombre único para el archivo
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${id}.${fileExtension}`;
    const folderPath = 'profiles';

    // Subir a storage
    const imageUrl = await this.fileStorageService.uploadFile(
      'novack-storage',
      processedImage.buffer,
      fileName,
      processedImage.mimetype,
      folderPath,
    );

    // Actualizar en base de datos
    await this.employeeService.updateProfileImageUrl(id, imageUrl);

    return {
      message: 'Imagen de perfil actualizada correctamente.',
      url: imageUrl,
    };
  }

  @Get('search/by-uuid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Buscar empleado por UUID',
    description: `Busca un empleado específico por su UUID.
    - Solo retorna empleados del mismo supplier
    - Excluye al usuario actual de los resultados
    - Usado para búsqueda de contactos`
  })
  @ApiResponse({
    status: 200,
    description: 'Empleado encontrado exitosamente',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        first_name: 'Juan',
        last_name: 'Pérez',
        email: 'juan@empresa.com',
        supplier: {
          id: '987fcdeb-51a2-43f7-9abc-def012345678',
          supplier_name: 'Empresa ABC'
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado',
  })
  @ApiResponse({
    status: 404,
    description: 'Empleado no encontrado'
  })
  async searchByUuid(
    @Query('uuid', ParseUUIDPipe) uuid: string,
    @Req() req: any
  ) {
    return this.employeeService.findOne(uuid);
  }
}