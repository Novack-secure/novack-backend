import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Visitor } from 'src/domain/entities/visitor.entity';
import { Appointment } from 'src/domain/entities/appointment.entity';
import { Supplier } from 'src/domain/entities/supplier.entity';
import { IVisitorRepository } from 'src/domain/repositories/visitor.repository.interface';
import { IAppointmentRepository } from 'src/domain/repositories/appointment.repository.interface';
import { ISupplierRepository } from 'src/domain/repositories/supplier.repository.interface';
import { UpdateVisitorDto } from 'src/application/dtos/visitor/update-visitor.dto';
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service';

@Injectable()
export class UpdateVisitorAndAppointmentUseCase {
  constructor(
    @Inject(IVisitorRepository)
    private readonly visitorRepository: IVisitorRepository,
    @Inject(IAppointmentRepository)
    private readonly appointmentRepository: IAppointmentRepository,
    @Inject(ISupplierRepository)
    private readonly supplierRepository: ISupplierRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('UpdateVisitorAndAppointmentUseCase');
  }

  private validateDates(check_in_time: Date, check_out_time?: Date): void {
    if (check_out_time) {
      if (new Date(check_out_time) <= new Date(check_in_time)) {
        this.logger.warn(
          'Validation failed: Check-out time must be after check-in time during update.',
          undefined,
          undefined,
          { check_in_time, check_out_time },
        );
        throw new BadRequestException(
          'La hora de salida debe ser posterior a la hora de entrada',
        );
      }
    }
  }

  async execute(
    id: string,
    updateVisitorDto: UpdateVisitorDto,
  ): Promise<Visitor> {
    this.logger.log(
      'Attempting to update visitor and associated appointment',
      undefined,
      undefined,
      { visitorId: id, updateData: updateVisitorDto },
    );

    // Fetch visitor. The IVisitorRepository.findById should define what relations are loaded (e.g., 'appointments').
    // If 'appointments' is not guaranteed, it must be fetched separately.
    const visitor = await this.visitorRepository.findById(id);
    if (!visitor) {
      this.logger.warn(
        `Visitor not found for update with id: ${id}`,
        undefined,
        undefined,
        { visitorId: id },
      );
      throw new NotFoundException(`Visitor with ID "${id}" not found`);
    }

    // Ensure there's an appointment to update.
    // This logic assumes the visitor's primary/first appointment is the target.
    if (!visitor.appointments || visitor.appointments.length === 0) {
      this.logger.warn(
        'Visitor has no associated appointments to update',
        undefined,
        undefined,
        { visitorId: id },
      );
      // This might be a valid state or an error depending on business rules.
      // If an appointment update is implied by UpdateVisitorDto, this could be an error.
      // For now, following original service logic which would throw later or handle differently.
      // If specific appointment fields are in DTO, it implies an appointment *should* exist.
      throw new BadRequestException(
        'El visitante no tiene citas asociadas para actualizar.',
      );
    }

    // Explicitly fetch the first appointment to ensure it's a full entity for updating
    const appointmentToUpdate = await this.appointmentRepository.findById(
      visitor.appointments[0].id,
    );
    if (!appointmentToUpdate) {
      this.logger.error(
        'Associated appointment not found during update despite being listed under visitor.',
        undefined,
        undefined,
        { visitorId: id, appointmentId: visitor.appointments[0].id },
      );
      throw new NotFoundException(
        `Associated appointment with ID "${visitor.appointments[0].id}" not found.`,
      );
    }

    // Update supplier if provided in DTO
    if (updateVisitorDto.supplier_id) {
      const supplier = await this.supplierRepository.findById(
        updateVisitorDto.supplier_id,
      );
      if (!supplier) {
        this.logger.warn(
          'Supplier not found during visitor update',
          undefined,
          undefined,
          { supplierId: updateVisitorDto.supplier_id, visitorId: id },
        );
        throw new BadRequestException('El proveedor especificado no existe');
      }
      visitor.supplier = supplier; // Assigning the supplier object; TypeORM should handle the FK
      visitor.supplier_id = supplier.id; // Agregado para establecer correctamente el supplier_id
      appointmentToUpdate.supplier = supplier;
      // appointmentToUpdate.supplier_id = supplier.id; // if direct id field exists on appointment
    }

    // Validate dates if they are being updated
    // Use existing dates from entities if not provided in DTO
    const newCheckInTime = updateVisitorDto.check_in_time
      ? new Date(updateVisitorDto.check_in_time)
      : appointmentToUpdate.check_in_time;
    const newCheckOutTime = updateVisitorDto.check_out_time
      ? new Date(updateVisitorDto.check_out_time)
      : appointmentToUpdate.check_out_time;

    if (updateVisitorDto.check_in_time || updateVisitorDto.check_out_time) {
      this.validateDates(newCheckInTime, newCheckOutTime);
    }

    // Update visitor fields from DTO
    // Using '??' to only update if value is provided (not null or undefined)
    visitor.name = updateVisitorDto.name ?? visitor.name;
    visitor.email = updateVisitorDto.email ?? visitor.email;
    visitor.phone = updateVisitorDto.phone ?? visitor.phone;
    visitor.location = updateVisitorDto.location ?? visitor.location;
    visitor.state = updateVisitorDto.state ?? visitor.state;
    // profile_image_url update is typically handled by a dedicated method/use case.

    const updatedVisitor = await this.visitorRepository.save(visitor);
    this.logger.log(
      'Visitor entity updated successfully',
      undefined,
      undefined,
      { visitorId: updatedVisitor.id },
    );

    // Update appointment fields from DTO
    appointmentToUpdate.title =
      updateVisitorDto.appointment ?? appointmentToUpdate.title;
    appointmentToUpdate.description =
      updateVisitorDto.appointment_description ??
      appointmentToUpdate.description;
    appointmentToUpdate.complaints =
      updateVisitorDto.complaints ?? appointmentToUpdate.complaints;
    appointmentToUpdate.check_in_time = newCheckInTime;
    appointmentToUpdate.check_out_time = newCheckOutTime; // This will be undefined if not in DTO and not on original
    appointmentToUpdate.status =
      updateVisitorDto.state ?? appointmentToUpdate.status; // Assuming appointment status mirrors visitor state

    await this.appointmentRepository.save(appointmentToUpdate);
    this.logger.log(
      'Associated appointment updated successfully',
      undefined,
      undefined,
      { appointmentId: appointmentToUpdate.id, visitorId: id },
    );

    // Re-fetch the visitor to ensure all relations and latest data are correctly populated for the return value.
    const finalVisitor = await this.visitorRepository.findById(id);
    if (!finalVisitor) {
      this.logger.error(
        'Failed to re-fetch visitor after update, though update operations were successful.',
        undefined,
        undefined,
        { visitorId: id },
      );
      throw new NotFoundException(
        `Visitor with ID "${id}" could not be found after update operations.`,
      );
    }
    this.logger.log(
      'Successfully updated visitor and appointment details.',
      undefined,
      undefined,
      { visitorId: finalVisitor.id },
    );
    return finalVisitor;
  }
}
