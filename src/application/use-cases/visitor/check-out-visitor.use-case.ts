import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Visitor } from 'src/domain/entities/visitor.entity';
import { Appointment } from 'src/domain/entities/appointment.entity';
import { IVisitorRepository } from 'src/domain/repositories/visitor.repository.interface';
import { IAppointmentRepository } from 'src/domain/repositories/appointment.repository.interface';
import { CardService } from 'src/application/services/card.service';
import { EmailService } from 'src/application/services/email.service';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';

@Injectable()
export class CheckOutVisitorUseCase {
  constructor(
    @Inject(IVisitorRepository)
    private readonly visitorRepository: IVisitorRepository,
    @Inject(IAppointmentRepository)
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly cardService: CardService,
    private readonly emailService: EmailService,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('CheckOutVisitorUseCase');
  }

  async execute(id: string): Promise<Visitor> {
    this.logger.log(
      `Attempting to check out visitor with id: ${id}`,
      undefined,
      undefined,
      { visitorId: id },
    );
    this.logger.log(`Visitor check-out initiated`, undefined, undefined, {
      visitorId: id,
    });

    // Fetch visitor. IVisitorRepository.findById should specify if relations like 'appointments' and 'card' are loaded.
    // For robustness, we might need specific repository methods that guarantee these relations if they are not default.
    const visitor = await this.visitorRepository.findById(id);
    if (!visitor) {
      this.logger.warn(
        `Visitor not found for check-out with id: ${id}`,
        undefined,
        undefined,
        { visitorId: id },
      );
      throw new NotFoundException(`Visitor with ID "${id}" not found`);
    }

    if (visitor.state === 'completado') {
      this.logger.warn(
        `Visitor already checked out: ${id}`,
        undefined,
        undefined,
        { visitorId: id, currentState: visitor.state },
      );
      throw new BadRequestException(
        'El visitante ya ha realizado el check-out',
      );
    }

    if (!visitor.appointments || visitor.appointments.length === 0) {
      this.logger.warn(
        `No appointments found for visitor during check-out: ${id}`,
        undefined,
        undefined,
        { visitorId: id },
      );
      throw new BadRequestException(
        'El visitante no tiene citas asociadas para procesar el check-out.',
      );
    }

    // Assuming the first appointment is the relevant one for check-out, as per original service logic.
    // Explicitly fetch the appointment to ensure it's fully loaded and to avoid issues if visitor.appointments is a partial load.
    const appointmentToUpdate = await this.appointmentRepository.findById(
      visitor.appointments[0].id,
    );
    if (!appointmentToUpdate) {
      this.logger.error(
        'Associated appointment not found during checkout, though listed under visitor.',
        undefined,
        undefined,
        { visitorId: id, appointmentId: visitor.appointments[0].id },
      );
      throw new NotFoundException(
        `Cita asociada con ID "${visitor.appointments[0].id}" no encontrada.`,
      );
    }

    if (!appointmentToUpdate.check_in_time) {
      this.logger.warn(
        `Visitor has not checked in for this appointment`,
        undefined,
        undefined,
        { visitorId: id, appointmentId: appointmentToUpdate.id },
      );
      throw new BadRequestException(
        'El visitante no ha realizado el check-in para esta cita.',
      );
    }

    // Update appointment
    appointmentToUpdate.check_out_time = new Date();
    appointmentToUpdate.status = 'completado';
    await this.appointmentRepository.save(appointmentToUpdate);
    this.logger.log(
      'Appointment updated to "completado" for check-out',
      undefined,
      undefined,
      { visitorId: id, appointmentId: appointmentToUpdate.id },
    );

    // Update visitor state
    visitor.state = 'completado';
    // Any other visitor fields to update on checkout can be done here before saving.
    const updatedVisitor = await this.visitorRepository.save(visitor);
    this.logger.log(
      'Visitor state updated to "completado" for check-out',
      undefined,
      undefined,
      { visitorId: updatedVisitor.id },
    );

    // Unassign card if one is assigned
    if (visitor.card && visitor.card.id) {
      // Check if visitor.card and visitor.card.id exist
      try {
        await this.cardService.unassignFromVisitor(visitor.card.id);
        this.logger.log(
          'Card unassigned from visitor during check-out',
          undefined,
          undefined,
          { visitorId: id, cardId: visitor.card.id },
        );
      } catch (error) {
        this.logger.warn(
          `Failed to unassign card during check-out for visitor: ${id}. This will not fail the checkout.`,
          undefined,
          undefined,
          {
            visitorId: id,
            cardId: visitor.card.id,
            error: error.message,
          },
        );
        // Non-critical error, checkout process continues
      }
    }

    // Send checkout email
    try {
      await this.emailService.sendVisitorCheckoutEmail(
        updatedVisitor.email,
        updatedVisitor.name,
        appointmentToUpdate.check_in_time, // Already confirmed not null
        appointmentToUpdate.check_out_time, // Set above, confirmed not null
        updatedVisitor.location,
      );
      this.logger.log(
        'Visitor checkout email dispatch requested successfully',
        undefined,
        undefined,
        { visitorId: updatedVisitor.id, email: updatedVisitor.email },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to send visitor checkout email for: ${updatedVisitor.id}. This will not fail the checkout.`,
        undefined,
        undefined,
        {
          visitorId: updatedVisitor.id,
          email: updatedVisitor.email,
          error: error.message,
        },
      );
      // Non-critical error, checkout process continues
    }

    // Return the updated visitor. It should have the latest state.
    // If relations need to be re-fetched (e.g. appointments array on visitor), then re-fetch.
    // Assuming updatedVisitor from save is sufficient.
    return updatedVisitor;
  }
}
