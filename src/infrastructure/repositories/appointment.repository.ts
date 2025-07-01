import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../../domain/entities/appointment.entity';
import { IAppointmentRepository } from '../../domain/repositories/appointment.repository.interface';

@Injectable()
export class AppointmentRepository implements IAppointmentRepository {
  constructor(
    @InjectRepository(Appointment)
    private readonly ormRepository: Repository<Appointment>,
  ) {}

  create(createAppointmentData: Partial<Appointment>): Appointment {
    return this.ormRepository.create(createAppointmentData);
  }

  async save(appointment: Appointment): Promise<Appointment> {
    return this.ormRepository.save(appointment);
  }

  async findById(id: string): Promise<Appointment | null> {
    // Load relations commonly needed when fetching a specific appointment.
    return this.ormRepository.findOne({
      where: { id },
      relations: ['visitor', 'supplier', 'visitor.card'], // Example: load visitor and its card too
    });
  }

  async findByVisitorId(visitorId: string): Promise<Appointment[]> {
    return this.ormRepository.find({
      where: { visitor: { id: visitorId } }, // Querying by related entity ID
      relations: ['visitor', 'supplier'], // Load relevant relations
      order: { scheduled_time: 'ASC' }, // Example: oldest first, or 'DESC' for newest
    });
  }

  async findBySupplierId(supplierId: string): Promise<Appointment[]> {
    return this.ormRepository.find({
      where: { supplier: { id: supplierId } }, // Querying by related entity ID
      relations: ['visitor', 'supplier'], // Load relevant relations
      order: { scheduled_time: 'ASC' }, // Example ordering
    });
  }

  async remove(appointment: Appointment): Promise<void> {
    await this.ormRepository.remove(appointment);
  }

  // Example of a more complex query:
  // async findUpcomingAppointmentsBySupplier(supplierId: string, fromDate: Date): Promise<Appointment[]> {
  //   return this.ormRepository.createQueryBuilder('appointment')
  //     .leftJoinAndSelect('appointment.visitor', 'visitor')
  //     .leftJoinAndSelect('appointment.supplier', 'supplier')
  //     .where('supplier.id = :supplierId', { supplierId })
  //     .andWhere('appointment.scheduled_time >= :fromDate', { fromDate })
  //     .andWhere('appointment.status = :status', { status: 'pendiente' }) // Example: only pending
  //     .orderBy('appointment.scheduled_time', 'ASC')
  //     .getMany();
  // }
}
