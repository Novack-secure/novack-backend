import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FormTemplate, FormField } from '../../domain/entities';
import { CreateFormTemplateDto } from '../dtos/form/create-form-template.dto';

@Injectable()
export class FormTemplateService {
  constructor(
    @InjectRepository(FormTemplate)
    private readonly formTemplateRepository: Repository<FormTemplate>,
    @InjectRepository(FormField)
    private readonly formFieldRepository: Repository<FormField>,
  ) {}

  /**
   * Generar slug único a partir del nombre
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
      .replace(/^-+|-+$/g, ''); // Remover guiones al inicio y final
  }

  /**
   * Asegurar que el slug sea único
   */
  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.formTemplateRepository.findOne({
        where: { slug },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }

  /**
   * Crear un nuevo formulario
   */
  async create(
    createDto: CreateFormTemplateDto,
    supplierId: string,
    createdBy: string,
  ): Promise<FormTemplate> {
    // Generar slug único
    const baseSlug = createDto.slug || this.generateSlug(createDto.name);
    const uniqueSlug = await this.ensureUniqueSlug(baseSlug);

    // Crear template
    const template = this.formTemplateRepository.create({
      name: createDto.name,
      description: createDto.description,
      slug: uniqueSlug,
      is_public: createDto.is_public ?? true,
      requires_approval: createDto.requires_approval ?? true,
      notification_emails: createDto.notification_emails || [],
      settings: createDto.settings || {},
      supplier_id: supplierId,
      created_by: createdBy,
    });

    const savedTemplate = await this.formTemplateRepository.save(template);

    // Crear campos
    if (createDto.fields && createDto.fields.length > 0) {
      const fields = createDto.fields.map((fieldDto) =>
        this.formFieldRepository.create({
          ...fieldDto,
          form_template_id: savedTemplate.id,
        }),
      );

      await this.formFieldRepository.save(fields);
    }

    // Retornar con campos cargados
    return this.findOne(savedTemplate.id);
  }

  /**
   * Obtener todos los formularios de un supplier
   */
  async findAll(supplierId: string): Promise<FormTemplate[]> {
    return this.formTemplateRepository.find({
      where: { supplier_id: supplierId },
      relations: ['fields', 'created_by_employee'],
      order: {
        created_at: 'DESC',
        fields: {
          order: 'ASC',
        },
      },
    });
  }

  /**
   * Obtener un formulario por ID
   */
  async findOne(id: string): Promise<FormTemplate> {
    const template = await this.formTemplateRepository.findOne({
      where: { id },
      relations: ['fields', 'created_by_employee', 'supplier'],
      order: {
        fields: {
          order: 'ASC',
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Form template with ID ${id} not found`);
    }

    return template;
  }

  /**
   * Obtener un formulario por slug (público)
   */
  async findBySlug(slug: string): Promise<FormTemplate> {
    const template = await this.formTemplateRepository.findOne({
      where: { slug, is_active: true },
      relations: ['fields', 'supplier'],
      order: {
        fields: {
          order: 'ASC',
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Form not found`);
    }

    if (!template.is_public) {
      throw new BadRequestException('This form is not publicly accessible');
    }

    return template;
  }

  /**
   * Actualizar un formulario
   */
  async update(
    id: string,
    updateDto: Partial<CreateFormTemplateDto>,
    supplierId: string,
  ): Promise<FormTemplate> {
    const template = await this.findOne(id);

    if (template.supplier_id !== supplierId) {
      throw new BadRequestException('You do not have permission to update this form');
    }

    // Actualizar slug si cambió el nombre
    if (updateDto.name && updateDto.name !== template.name) {
      const baseSlug = this.generateSlug(updateDto.name);
      template.slug = await this.ensureUniqueSlug(baseSlug, id);
    }

    // Actualizar campos básicos
    Object.assign(template, {
      name: updateDto.name ?? template.name,
      description: updateDto.description ?? template.description,
      is_public: updateDto.is_public ?? template.is_public,
      requires_approval: updateDto.requires_approval ?? template.requires_approval,
      notification_emails: updateDto.notification_emails ?? template.notification_emails,
      settings: updateDto.settings ?? template.settings,
    });

    await this.formTemplateRepository.save(template);

    // Actualizar campos si se proporcionaron
    if (updateDto.fields) {
      // Eliminar campos existentes
      await this.formFieldRepository.delete({ form_template_id: id });

      // Crear nuevos campos
      const fields = updateDto.fields.map((fieldDto) =>
        this.formFieldRepository.create({
          ...fieldDto,
          form_template_id: id,
        }),
      );

      await this.formFieldRepository.save(fields);
    }

    return this.findOne(id);
  }

  /**
   * Desactivar un formulario
   */
  async deactivate(id: string, supplierId: string): Promise<void> {
    const template = await this.findOne(id);

    if (template.supplier_id !== supplierId) {
      throw new BadRequestException('You do not have permission to deactivate this form');
    }

    template.is_active = false;
    await this.formTemplateRepository.save(template);
  }

  /**
   * Eliminar un formulario
   */
  async remove(id: string, supplierId: string): Promise<void> {
    const template = await this.findOne(id);

    if (template.supplier_id !== supplierId) {
      throw new BadRequestException('You do not have permission to delete this form');
    }

    // Verificar si tiene submissions
    const submissionsCount = await this.formTemplateRepository
      .createQueryBuilder('template')
      .leftJoin('template.submissions', 'submissions')
      .where('template.id = :id', { id })
      .getCount();

    if (submissionsCount > 0) {
      throw new ConflictException(
        'Cannot delete form template with existing submissions. Consider deactivating it instead.',
      );
    }

    await this.formTemplateRepository.remove(template);
  }
}
