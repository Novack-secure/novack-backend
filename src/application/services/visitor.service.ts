import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateVisitorDto } from '../dtos/visitor';
import { UpdateVisitorDto } from '../dtos/visitor';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Visitor, Appointment, Supplier } from 'src/domain/entities';
import { CardService } from './card.service';
import { EmailService } from './email.service';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service'; // Added import

@Injectable()
export class VisitorService {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    private readonly cardService: CardService,
    private readonly emailService: EmailService,
    private readonly logger: StructuredLoggerService, // Added logger
  ) {
    this.logger.setContext('VisitorService'); // Set context
  }

  private validateDates(check_in_time: Date, check_out_time?: Date) {
    if (check_out_time) {
      if (check_out_time <= check_in_time) {
        throw new BadRequestException(
          'La hora de salida debe ser posterior a la hora de entrada',
        );
      }
    }
  }

  async create(createVisitorDto: CreateVisitorDto) {
    this.logger.log('Attempting to create visitor and appointment', undefined, {
      visitorEmail: createVisitorDto.email,
      supplierId: createVisitorDto.supplier_id,
      appointmentTime: createVisitorDto.check_in_time,
    });

    const supplier = await this.supplierRepository.findOne({
      where: { id: createVisitorDto.supplier_id },
    });

    if (!supplier) {
      // Consider adding a log here if this is an important failure point not covered by GlobalExceptionFilter
      throw new BadRequestException('El proveedor no existe');
    }

    this.validateDates(
      createVisitorDto.check_in_time,
      createVisitorDto.check_out_time,
    );

    // Crear visitante
    const visitor = this.visitorRepository.create({
      name: createVisitorDto.name,
      email: createVisitorDto.email,
      phone: createVisitorDto.phone,
      location: createVisitorDto.location,
      state: 'pendiente',
      supplier,
    });

    const savedVisitor = await this.visitorRepository.save(visitor);

    // Crear cita
    const appointment = this.appointmentRepository.create({
      title: createVisitorDto.appointment,
      description: createVisitorDto.appointment_description,
      scheduled_time: new Date(), // Consider if this should be from DTO
      check_in_time: createVisitorDto.check_in_time,
      check_out_time: createVisitorDto.check_out_time,
      complaints: createVisitorDto.complaints || { invitado1: 'ninguno' },
      status: 'pendiente',
      visitor: savedVisitor,
      supplier,
    });

    await this.appointmentRepository.save(appointment);

    this.logger.log('Visitor and appointment created successfully', undefined, {
      visitorId: savedVisitor.id,
      appointmentId: appointment.id,
      email: savedVisitor.email,
    });

    // Enviar email de bienvenida
    try {
      await this.emailService.sendVisitorWelcomeEmail(
        savedVisitor.email,
        savedVisitor.name,
        appointment.check_in_time,
        savedVisitor.location,
      );
      this.logger.log('Visitor welcome email sent successfully', undefined, {
        visitorId: savedVisitor.id,
        email: savedVisitor.email,
      });
    } catch (error) {
      this.logger.warn('Failed to send visitor welcome email', undefined, {
        visitorId: savedVisitor.id,
        email: savedVisitor.email,
        error: error.message,
      });
      // console.error('Error al enviar email de bienvenida:', error); // Original console log replaced
    }

    // Intentar asignar una tarjeta
    try {
      const availableCards = await this.cardService.findAvailableCards();
      if (availableCards.length > 0) {
        await this.cardService.assignToVisitor(
          availableCards[0].id,
          savedVisitor.id,
        );
        this.logger.log('Card assigned to visitor', undefined, {
          visitorId: savedVisitor.id,
          cardId: availableCards[0].id,
        });
      } else {
        this.logger.warn('No available card to assign to visitor', undefined, {
          visitorId: savedVisitor.id,
        });
      }
    } catch (error) {
      this.logger.warn('Failed to assign card to visitor', undefined, {
        visitorId: savedVisitor.id,
        error: error.message,
      });
      // console.error('Error al asignar tarjeta:', error); // Original console log replaced
    }

    return this.findOne(savedVisitor.id); // findOne will retrieve the full entity with relations
  }

  async findAll() {
    return await this.visitorRepository.find({
      relations: ['supplier', 'card', 'appointments'],
    });
  }

  async findOne(id: string) {
    const visitor = await this.visitorRepository.findOne({
      where: { id },
      relations: ['supplier', 'card', 'appointments'],
    });

    if (!visitor) {
      throw new BadRequestException('El visitante no existe');
    }

    return visitor;
  }

  async update(id: string, updateVisitorDto: UpdateVisitorDto) {
    this.logger.log('Attempting to update visitor/appointment', undefined, {
      visitorId: id,
    });
    const visitor = await this.findOne(id);

    if (!visitor.appointments || visitor.appointments.length === 0) {
      // This case might be an exception or a valid scenario depending on business logic.
      // If it's an error, GlobalExceptionFilter will catch it.
      // For now, no specific log before throwing, as it's a validation.
      throw new BadRequestException('El visitante no tiene citas asociadas');
    }

    const appointment = visitor.appointments[0]; // Usar la primera cita

    if (updateVisitorDto.supplier_id) {
      const supplier = await this.supplierRepository.findOne({
        where: { id: updateVisitorDto.supplier_id },
      });

      if (!supplier) {
        throw new BadRequestException('El proveedor no existe');
      }

      visitor.supplier = supplier;
      appointment.supplier = supplier;
    }

    if (updateVisitorDto.check_in_time || updateVisitorDto.check_out_time) {
      this.validateDates(
        updateVisitorDto.check_in_time || appointment.check_in_time,
        updateVisitorDto.check_out_time || appointment.check_out_time,
      );
    }

    // Actualizar visitante
    if (updateVisitorDto.name) visitor.name = updateVisitorDto.name;
    if (updateVisitorDto.email) visitor.email = updateVisitorDto.email;
    if (updateVisitorDto.phone) visitor.phone = updateVisitorDto.phone;
    if (updateVisitorDto.location) visitor.location = updateVisitorDto.location;
    if (updateVisitorDto.state) visitor.state = updateVisitorDto.state;

    await this.visitorRepository.save(visitor);

    // Actualizar cita
    if (updateVisitorDto.appointment)
      appointment.title = updateVisitorDto.appointment;
    if (updateVisitorDto.appointment_description)
      appointment.description = updateVisitorDto.appointment_description;
    if (updateVisitorDto.complaints)
      appointment.complaints = updateVisitorDto.complaints;
    if (updateVisitorDto.check_in_time)
      appointment.check_in_time = updateVisitorDto.check_in_time;
    if (updateVisitorDto.check_out_time)
      appointment.check_out_time = updateVisitorDto.check_out_time;
    if (updateVisitorDto.state) appointment.status = updateVisitorDto.state;

    await this.appointmentRepository.save(appointment);

    this.logger.log('Visitor/appointment updated successfully', undefined, {
      visitorId: id,
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.log('Attempting to delete visitor', undefined, {
      visitorId: id,
    });
    const visitor = await this.findOne(id); // Ensures visitor exists before attempting removal
    await this.visitorRepository.remove(visitor);
    this.logger.log('Visitor deleted successfully', undefined, {
      visitorId: id,
    });
    // The original method returns the result of remove, which might be void or the removed entity
    // For logging purposes, we've logged success. The actual return type is determined by TypeORM.
    // No explicit return here as the original was `return await this.visitorRepository.remove(visitor);`
    // which after `await` would be `void` or similar from TypeORM's remove.
    // If the original intended to return the visitor object, it should be `return visitor;`
    // but that's not what `this.visitorRepository.remove(visitor)` does.
    // For now, maintaining no explicit return if original implies void.
  }

  async checkOut(id: string) {
    this.logger.log('Visitor check-out initiated', undefined, {
      visitorId: id,
    });
    const visitor = await this.findOne(id);

    if (visitor.state === 'completado') {
      throw new BadRequestException(
        'El visitante ya ha realizado el check-out',
      );
    }

    if (!visitor.appointments || visitor.appointments.length === 0) {
      throw new BadRequestException('El visitante no tiene citas asociadas');
    }

    const appointment = visitor.appointments[0];
    if (!appointment.check_in_time) {
      throw new BadRequestException('El visitante no ha realizado el check-in');
    }

    appointment.check_out_time = new Date();
    appointment.status = 'completado';
    visitor.state = 'completado';

    // Guardar los cambios
    await this.appointmentRepository.save(appointment);
    const updatedVisitor = await this.visitorRepository.save(visitor);

    this.logger.log('Visitor check-out completed successfully', undefined, {
      visitorId: updatedVisitor.id,
      appointmentId: appointment.id,
    });

    // Liberar la tarjeta si tiene una asignada
    if (visitor.card) {
      await this.cardService.unassignFromVisitor(visitor.card.id);
      this.logger.log(
        'Card unassigned from visitor during check-out',
        undefined,
        {
          visitorId: visitor.id,
          cardId: visitor.card.id,
        },
      );
    }

    // Enviar email de checkout
    try {
      await this.emailService.sendVisitorCheckoutEmail(
        visitor.email,
        visitor.name,
        appointment.check_in_time,
        appointment.check_out_time,
        visitor.location,
      );
      this.logger.log('Visitor checkout email sent successfully', undefined, {
        visitorId: visitor.id,
        email: visitor.email,
      });
    } catch (error) {
      this.logger.warn('Failed to send visitor checkout email', undefined, {
        visitorId: visitor.id,
        email: visitor.email,
        error: error.message,
      });
      // console.error('Error al enviar email de checkout:', error); // Original console log replaced
    }

    return updatedVisitor;
  }

  async findBySupplier(supplier_id: string) {
    const supplier = await this.supplierRepository.findOne({
      where: { id: supplier_id },
    });

    if (!supplier) {
      throw new BadRequestException('El proveedor no existe');
    }

    return await this.visitorRepository.find({
      where: { supplier: { id: supplier_id } },
      relations: ['supplier', 'card', 'appointments'],
      order: {
        created_at: 'DESC',
      },
    });
  }

  // --- NUEVO MÉTODO PARA ACTUALIZAR URL DE IMAGEN DE PERFIL ---
  async updateProfileImageUrl(id: string, imageUrl: string) {
    const visitor = await this.visitorRepository.findOneBy({ id });
    if (!visitor) {
      throw new BadRequestException('El visitante no existe');
    }

    visitor.profile_image_url = imageUrl;
    await this.visitorRepository.save(visitor);
    this.logger.log('Visitor profile image URL updated', undefined, {
      visitorId: id,
      newImageUrl: imageUrl,
    });
    return visitor; // Opcional: devolver el visitante actualizado
  }
}
