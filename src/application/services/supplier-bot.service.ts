import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Supplier, Appointment, Employee, Visitor, ChatRoom, ChatMessage } from "src/domain/entities";
import { DeepseeClient } from "./deepsee.client";
import { IAppointmentRepository } from "src/domain/repositories/appointment.repository.interface";
import { IEmployeeRepository } from "src/domain/repositories/employee.repository.interface";
import { IVisitorRepository } from "src/domain/repositories/visitor.repository.interface";
import { ISupplierRepository } from "src/domain/repositories/supplier.repository.interface";

@Injectable()
export class SupplierBotService {
  constructor(
    @Inject(ISupplierRepository) private readonly supplierRepo: ISupplierRepository,
    @Inject(IAppointmentRepository) private readonly appointmentRepo: IAppointmentRepository,
    @Inject(IEmployeeRepository) private readonly employeeRepo: IEmployeeRepository,
    @Inject(IVisitorRepository) private readonly visitorRepo: IVisitorRepository,
    @InjectRepository(ChatRoom) private readonly chatRoomRepo: Repository<ChatRoom>,
    @InjectRepository(ChatMessage) private readonly chatMessageRepo: Repository<ChatMessage>,
    private readonly deepsee: DeepseeClient,
  ) {}

  private async buildSupplierContext(supplierId: string) {
    const supplier = await this.supplierRepo.findById(supplierId);
    const appointments = await this.appointmentRepo.findBySupplierId(supplierId);
    const employees = await this.employeeRepo.findBySupplier(supplierId);
    const visitors = await this.visitorRepo.findBySupplier(supplierId);

    return {
      supplier: supplier ? {
        id: supplier.id,
        name: supplier.supplier_name,
        description: supplier.description,
        address: supplier.address,
        phone: supplier.phone_number,
      } : null,
      stats: {
        appointmentsCount: appointments.length,
        employeesCount: employees.length,
        visitorsCount: visitors.length,
      },
      appointments: appointments.map(a => ({
        id: a.id,
        title: a.title,
        status: a.status,
        scheduled_time: a.scheduled_time,
        visitor: a.visitor ? { id: a.visitor.id, name: a.visitor.name, email: a.visitor.email } : null,
      })),
    };
  }

  async sendMessageToBot({ roomId, prompt, supplierId }: { roomId: string; prompt: string; supplierId: string; }) {
    const room = await this.chatRoomRepo.findOne({ where: { id: roomId } });
    if (!room) throw new Error("Sala no existe");
    if (room.supplier_id && room.supplier_id !== supplierId) throw new Error("Sala no pertenece al supplier");

    // Guardar mensaje del usuario (se espera guardado previo en flujo de chat)
    const context = await this.buildSupplierContext(supplierId);

    const response = await this.deepsee.chat({ supplierId, prompt, context });

    // Persistir respuesta del bot como mensaje especial (sin sender humano)
    const botMessage = this.chatMessageRepo.create({
      content: response.text,
      chat_room_id: roomId,
      is_read: false,
    });
    await this.chatMessageRepo.save(botMessage);

    return botMessage;
  }
}

