import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FormSubmissionService } from '../../application/services/form-submission.service';
import { SubmitFormDto } from '../../application/dtos/form/submit-form.dto';
import { UpdateSubmissionStatusDto } from '../../application/dtos/form/update-submission-status.dto';
import { CreateAppointmentFromSubmissionDto } from '../../application/dtos/form/create-appointment-from-submission.dto';
import { AuthGuard } from '../../application/guards/auth.guard';
import { Public } from '../../application/decorators/public.decorator';
import { SubmissionStatus } from '../../domain/entities/form-submission.entity';

@Controller('form-submissions')
export class FormSubmissionController {
  constructor(private readonly formSubmissionService: FormSubmissionService) {}

  /**
   * Enviar formulario (público)
   */
  @Public()
  @Post('public/:slug')
  @HttpCode(HttpStatus.CREATED)
  async submit(@Param('slug') slug: string, @Body() submitDto: SubmitFormDto) {
    return this.formSubmissionService.submit(slug, submitDto);
  }

  /**
   * Obtener todas las submissions del supplier con filtros (requiere autenticación)
   */
  @Get()
  @UseGuards(AuthGuard)
  async findAll(
    @Request() req,
    @Query('status') status?: SubmissionStatus,
    @Query('formTemplateId') formTemplateId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const supplierId = req.user.supplier_id;
    if (!supplierId) {
      throw new BadRequestException('Supplier ID not found in token');
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (formTemplateId) filters.formTemplateId = formTemplateId;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    return this.formSubmissionService.findAll(supplierId, filters);
  }

  /**
   * Obtener estadísticas de submissions (requiere autenticación)
   */
  @Get('stats')
  @UseGuards(AuthGuard)
  async getStats(@Request() req) {
    const supplierId = req.user.supplier_id;
    if (!supplierId) {
      throw new BadRequestException('Supplier ID not found in token');
    }
    return this.formSubmissionService.getStats(supplierId);
  }

  /**
   * Obtener una submission por ID (requiere autenticación)
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    return this.formSubmissionService.findOne(id);
  }

  /**
   * Actualizar estado de una submission (requiere autenticación)
   */
  @Patch(':id/status')
  @UseGuards(AuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateSubmissionStatusDto,
    @Request() req,
  ) {
    const employeeId = req.user.id || req.user.sub;
    const supplierId = req.user.supplier_id;

    if (!employeeId) {
      throw new BadRequestException('Employee ID not found in token');
    }
    if (!supplierId) {
      throw new BadRequestException('Supplier ID not found in token');
    }

    return this.formSubmissionService.updateStatus(id, updateDto, employeeId, supplierId);
  }

  /**
   * Crear appointment desde una submission (requiere autenticación)
   */
  @Post(':id/create-appointment')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAppointment(
    @Param('id') id: string,
    @Body() createDto: CreateAppointmentFromSubmissionDto,
    @Request() req,
  ) {
    const supplierId = req.user.supplier_id;
    if (!supplierId) {
      throw new BadRequestException('Supplier ID not found in token');
    }
    return this.formSubmissionService.createAppointmentFromSubmission(id, createDto, supplierId);
  }
}
