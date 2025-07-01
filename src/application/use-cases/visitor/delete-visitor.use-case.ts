import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IVisitorRepository } from 'src/domain/repositories/visitor.repository.interface'; // Fixed path
// Assuming IAppointmentRepository might be needed if appointments need explicit deletion or check.
// For this refactoring, we follow the original service's direct removal logic,
// relying on ORM cascades or current business rules not requiring explicit appointment handling here.
// import { IAppointmentRepository } from 'src/domain/repositories/appointment.repository.interface'; // Fixed path if used
import { StructuredLoggerService } from 'src/infrastructure/logging/structured-logger.service'; // Fixed path

@Injectable()
export class DeleteVisitorUseCase {
  constructor(
    @Inject(IVisitorRepository)
    private readonly visitorRepository: IVisitorRepository,
    // @Inject(IAppointmentRepository) // Uncomment if direct appointment interaction is needed
    // private readonly appointmentRepository: IAppointmentRepository,
    private readonly logger: StructuredLoggerService,
  ) {
    this.logger.setContext('DeleteVisitorUseCase');
  }

  async execute(id: string): Promise<void> {
    this.logger.log(`Attempting to delete visitor with id: ${id}`, undefined, {
      visitorId: id,
    });

    const visitor = await this.visitorRepository.findById(id);
    if (!visitor) {
      this.logger.warn(
        `Visitor not found for deletion with id: ${id}`,
        undefined,
        { visitorId: id },
      );
      throw new NotFoundException(`Visitor with ID "${id}" not found`);
    }

    // Current business logic (from original VisitorService) is to directly remove the visitor.
    // This relies on the database / ORM (TypeORM) to handle cascades for related entities
    // (like appointments) if such cascade rules are defined on the entity relationships.
    // If explicit checks or operations on related entities (e.g., appointments) were required
    // before deleting a visitor, that logic would be added here.
    // For example, checking if active appointments exist and preventing deletion,
    // or soft-deleting appointments.

    await this.visitorRepository.remove(visitor);

    this.logger.log(`Successfully deleted visitor with id: ${id}`, undefined, {
      visitorId: id,
    });
  }
}
