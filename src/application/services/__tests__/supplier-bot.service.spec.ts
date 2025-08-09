import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { SupplierBotService } from "../../services/supplier-bot.service";
import { DeepseeClient } from "../../services/deepsee.client";
import { ISupplierRepository } from "../../../domain/repositories/supplier.repository.interface";
import { IAppointmentRepository } from "../../../domain/repositories/appointment.repository.interface";
import { IEmployeeRepository } from "../../../domain/repositories/employee.repository.interface";
import { IVisitorRepository } from "../../../domain/repositories/visitor.repository.interface";
import { ChatRoom } from "../../../domain/entities/chat-room.entity";
import { ChatMessage } from "../../../domain/entities/chat-message.entity";

describe("SupplierBotService", () => {
  it("envía prompt a Deepseek con contexto del supplier y guarda la respuesta en ChatMessage", async () => {
    const supplierRepoMock = {
      findById: jest.fn().mockResolvedValue({
        id: "sup-1",
        supplier_name: "Test Sup",
        description: "Desc",
        address: "Addr",
        phone_number: "123",
      }),
    };
    const appointmentRepoMock = {
      findBySupplierId: jest.fn().mockResolvedValue([]),
    };
    const employeeRepoMock = {
      findBySupplier: jest.fn().mockResolvedValue([]),
    };
    const visitorRepoMock = {
      findBySupplier: jest.fn().mockResolvedValue([]),
    };

    const chatRoomRepoMock = {
      findOne: jest.fn().mockResolvedValue({ id: "room-1", supplier_id: "sup-1" }),
    };
    const chatMessageRepoMock = {
      create: jest.fn().mockImplementation((x) => x),
      // Simular comportamiento de TypeORM: muta la entidad con el id generado
      save: jest.fn().mockImplementation(async (x) => {
        (x as any).id = "msg-1";
        return x;
      }),
    };

    const deepseekMock = {
      chat: jest.fn().mockResolvedValue({ text: "Respuesta del bot" }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SupplierBotService,
        { provide: ISupplierRepository, useValue: supplierRepoMock },
        { provide: IAppointmentRepository, useValue: appointmentRepoMock },
        { provide: IEmployeeRepository, useValue: employeeRepoMock },
        { provide: IVisitorRepository, useValue: visitorRepoMock },
        { provide: getRepositoryToken(ChatRoom), useValue: chatRoomRepoMock },
        { provide: getRepositoryToken(ChatMessage), useValue: chatMessageRepoMock },
        { provide: DeepseeClient, useValue: deepseekMock },
      ],
    }).compile();

    const svc = moduleRef.get(SupplierBotService);
    const result = await svc.sendMessageToBot({ roomId: "room-1", prompt: "Hola", supplierId: "sup-1" });

    expect(deepseekMock.chat).toHaveBeenCalledWith(
      expect.objectContaining({ supplierId: "sup-1", prompt: "Hola" }),
    );
    expect(chatMessageRepoMock.create).toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ id: "msg-1", chat_room_id: "room-1" }));
  });
});

