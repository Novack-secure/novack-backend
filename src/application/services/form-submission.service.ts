import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  FormSubmission,
  FormAnswer,
  FormTemplate,
  Appointment,
  Visitor,
  Employee,
} from '../../domain/entities';
import { SubmitFormDto } from '../dtos/form/submit-form.dto';
import { UpdateSubmissionStatusDto } from '../dtos/form/update-submission-status.dto';
import { CreateAppointmentFromSubmissionDto } from '../dtos/form/create-appointment-from-submission.dto';
import { SubmissionStatus } from '../../domain/entities/form-submission.entity';

@Injectable()
export class FormSubmissionService {
  constructor(
    @InjectRepository(FormSubmission)
    private readonly submissionRepository: Repository<FormSubmission>,
    @InjectRepository(FormAnswer)
    private readonly answerRepository: Repository<FormAnswer>,
    @InjectRepository(FormTemplate)
    private readonly templateRepository: Repository<FormTemplate>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  /**
   * Enviar formulario (público)
   */
  async submit(slug: string, submitDto: SubmitFormDto): Promise<FormSubmission> {
    // Buscar template por slug
    const template = await this.templateRepository.findOne({
      where: { slug, is_active: true },
      relations: ['fields', 'supplier'],
    });

    if (!template) {
      throw new NotFoundException('Form not found');
    }

    if (!template.is_public) {
      throw new BadRequestException('This form is not publicly accessible');
    }

    // Validar que todos los campos requeridos estén presentes
    const requiredFields = template.fields.filter((f) => f.is_required);
    const answeredFieldIds = submitDto.answers.map((a) => a.field_id);

    for (const requiredField of requiredFields) {
      if (!answeredFieldIds.includes(requiredField.id)) {
        throw new BadRequestException(`Required field "${requiredField.label}" is missing`);
      }
    }

    // Crear submission
    const submission = this.submissionRepository.create({
      form_template_id: template.id,
      supplier_id: template.supplier_id,
      visitor_name: submitDto.visitor_name,
      visitor_email: submitDto.visitor_email,
      visitor_phone: submitDto.visitor_phone,
      visitor_company: submitDto.visitor_company,
      status: template.requires_approval ? SubmissionStatus.PENDING : SubmissionStatus.APPROVED,
      metadata: submitDto.metadata || {},
    });

    const savedSubmission = await this.submissionRepository.save(submission);

    // Crear respuestas
    const answers = submitDto.answers.map((answerDto) =>
      this.answerRepository.create({
        form_submission_id: savedSubmission.id,
        form_field_id: answerDto.field_id,
        value: typeof answerDto.value === 'string' ? answerDto.value : null,
        value_json: typeof answerDto.value !== 'string' ? answerDto.value : null,
      }),
    );

    await this.answerRepository.save(answers);

    // TODO: Enviar notificación por email

    return this.findOne(savedSubmission.id);
  }

  /**
   * Obtener todas las submissions de un supplier
   */
  async findAll(
    supplierId: string,
    filters?: {
      status?: SubmissionStatus;
      formTemplateId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ): Promise<FormSubmission[]> {
    const query = this.submissionRepository
      .createQueryBuilder('submission')
      .leftJoinAndSelect('submission.form_template', 'template')
      .leftJoinAndSelect('submission.answers', 'answers')
      .leftJoinAndSelect('answers.form_field', 'field')
      .leftJoinAndSelect('submission.appointment', 'appointment')
      .leftJoinAndSelect('submission.approved_by_employee', 'approver')
      .where('submission.supplier_id = :supplierId', { supplierId })
      .orderBy('submission.submitted_at', 'DESC');

    if (filters?.status) {
      query.andWhere('submission.status = :status', { status: filters.status });
    }

    if (filters?.formTemplateId) {
      query.andWhere('submission.form_template_id = :formTemplateId', {
        formTemplateId: filters.formTemplateId,
      });
    }

    if (filters?.dateFrom && filters?.dateTo) {
      query.andWhere('submission.submitted_at BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
    }

    return query.getMany();
  }

  /**
   * Obtener una submission por ID
   */
  async findOne(id: string): Promise<FormSubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id },
      relations: [
        'form_template',
        'form_template.fields',
        'answers',
        'answers.form_field',
        'appointment',
        'appointment.host_employee',
        'approved_by_employee',
        'supplier',
      ],
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${id} not found`);
    }

    return submission;
  }

  /**
   * Actualizar estado de una submission
   */
  async updateStatus(
    id: string,
    updateDto: UpdateSubmissionStatusDto,
    employeeId: string,
    supplierId: string,
  ): Promise<FormSubmission> {
    const submission = await this.findOne(id);

    if (submission.supplier_id !== supplierId) {
      throw new BadRequestException('You do not have permission to update this submission');
    }

    submission.status = updateDto.status;
    submission.admin_notes = updateDto.admin_notes;

    if (updateDto.status === SubmissionStatus.APPROVED) {
      submission.approved_by = employeeId;
      submission.approved_at = new Date();
    }

    await this.submissionRepository.save(submission);

    return this.findOne(id);
  }

  /**
   * Crear appointment desde una submission
   */
  async createAppointmentFromSubmission(
    id: string,
    createDto: CreateAppointmentFromSubmissionDto,
    supplierId: string,
  ): Promise<Appointment> {
    const submission = await this.findOne(id);

    if (submission.supplier_id !== supplierId) {
      throw new BadRequestException('You do not have permission to create appointment from this submission');
    }

    if (submission.appointment) {
      throw new BadRequestException('An appointment already exists for this submission');
    }

    // Crear o buscar visitor
    let visitor = await this.visitorRepository.findOne({
      where: {
        email: submission.visitor_email,
        supplier_id: supplierId,
      },
    });

    if (!visitor) {
      visitor = this.visitorRepository.create({
        name: submission.visitor_name,
        email: submission.visitor_email,
        phone: submission.visitor_phone,
        location: createDto.location || 'Reception',
        supplier_id: supplierId,
        state: 'pendiente',
      });

      visitor = await this.visitorRepository.save(visitor);
    }

    // Crear appointment
    const appointment = this.appointmentRepository.create({
      visitor_id: visitor.id,
      supplier_id: supplierId,
      host_employee_id: createDto.host_employee_id,
      form_submission_id: submission.id,
      title: createDto.title || `Visit from ${submission.visitor_name}`,
      description: createDto.description || submission.form_template.description,
      scheduled_time: new Date(createDto.scheduled_time),
      location: createDto.location || 'Reception',
      status: 'pendiente',
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);

    // Actualizar submission
    submission.status = SubmissionStatus.APPROVED;
    await this.submissionRepository.save(submission);

    return this.appointmentRepository.findOne({
      where: { id: savedAppointment.id },
      relations: ['visitor', 'host_employee', 'supplier', 'form_submission'],
    });
  }

  /**
   * Obtener estadísticas de submissions
   */
  async getStats(supplierId: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    completed: number;
  }> {
    const [total, pending, approved, rejected, completed] = await Promise.all([
      this.submissionRepository.count({ where: { supplier_id: supplierId } }),
      this.submissionRepository.count({
        where: { supplier_id: supplierId, status: SubmissionStatus.PENDING },
      }),
      this.submissionRepository.count({
        where: { supplier_id: supplierId, status: SubmissionStatus.APPROVED },
      }),
      this.submissionRepository.count({
        where: { supplier_id: supplierId, status: SubmissionStatus.REJECTED },
      }),
      this.submissionRepository.count({
        where: { supplier_id: supplierId, status: SubmissionStatus.COMPLETED },
      }),
    ]);

    return { total, pending, approved, rejected, completed };
  }
}
