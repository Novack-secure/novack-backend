import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FormTemplateService } from '../../application/services/form-template.service';
import { CreateFormTemplateDto } from '../../application/dtos/form/create-form-template.dto';
import { AuthGuard } from '../../application/guards/auth.guard';
import { Public } from '../../application/decorators/public.decorator';

@Controller('form-templates')
export class FormTemplateController {
  constructor(private readonly formTemplateService: FormTemplateService) {}

  /**
   * Crear nuevo formulario (requiere autenticación)
   */
  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateFormTemplateDto, @Request() req) {
    const employeeId = req.user.id || req.user.sub;
    const supplierId = req.user.supplier_id;

    if (!employeeId) {
      throw new BadRequestException('Employee ID not found in token');
    }
    if (!supplierId) {
      throw new BadRequestException('Supplier ID not found in token');
    }

    return this.formTemplateService.create(createDto, supplierId, employeeId);
  }

  /**
   * Obtener todos los formularios del supplier (requiere autenticación)
   */
  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Request() req) {
    const supplierId = req.user.supplier_id;
    if (!supplierId) {
      throw new BadRequestException('Supplier ID not found in token');
    }
    return this.formTemplateService.findAll(supplierId);
  }

  /**
   * Obtener formulario por slug (público)
   */
  @Public()
  @Get('public/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.formTemplateService.findBySlug(slug);
  }

  /**
   * Obtener formulario por ID (requiere autenticación)
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    return this.formTemplateService.findOne(id);
  }

  /**
   * Actualizar formulario (requiere autenticación)
   */
  @Patch(':id')
  @UseGuards(AuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateFormTemplateDto>,
    @Request() req,
  ) {
    const supplierId = req.user.supplier_id;
    if (!supplierId) {
      throw new BadRequestException('Supplier ID not found in token');
    }
    return this.formTemplateService.update(id, updateDto, supplierId);
  }

  /**
   * Desactivar formulario (requiere autenticación)
   */
  @Patch(':id/deactivate')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id') id: string, @Request() req) {
    const supplierId = req.user.supplier_id;
    if (!supplierId) {
      throw new BadRequestException('Supplier ID not found in token');
    }
    await this.formTemplateService.deactivate(id, supplierId);
  }

  /**
   * Eliminar formulario (requiere autenticación)
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req) {
    const supplierId = req.user.supplier_id;
    if (!supplierId) {
      throw new BadRequestException('Supplier ID not found in token');
    }
    await this.formTemplateService.remove(id, supplierId);
  }
}
