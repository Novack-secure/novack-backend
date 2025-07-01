import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../../../interface/controllers/chat.controller';
import { ChatService } from '../../../application/services/chat.service';
import { AuthGuard } from '../../../application/guards/auth.guard';
import { CreateMessageDto } from '../../../application/dtos/chat/create-message.dto';
import { CreateRoomDto } from '../../../application/dtos/chat/create-room.dto';
import { ChatRoomType } from '../../../domain/entities';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: ChatService;

  // Mock de ChatService
  const mockChatService = {
    getUserRooms: jest.fn(),
    getRoomMessages: jest.fn(),
    createRoom: jest.fn(),
    addMessage: jest.fn(),
    createSupplierGroupRoom: jest.fn(),
    getOrCreatePrivateRoom: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUserRooms', () => {
    it('should call chatService.getUserRooms with user from request', async () => {
      // Mock setup
      const user = { id: 'user123', userType: 'employee' };
      const rooms = [
        {
          id: 'room1',
          name: 'Room 1',
          type: ChatRoomType.EMPLOYEE_TO_EMPLOYEE,
        },
        { id: 'room2', name: 'Room 2', type: ChatRoomType.SUPPLIER_GROUP },
      ];
      mockChatService.getUserRooms.mockResolvedValue(rooms);

      // Call controller
      const req = { user };
      const result = await controller.getUserRooms(req);

      // Verify
      expect(mockChatService.getUserRooms).toHaveBeenCalledWith(
        user.id,
        user.userType || 'employee',
      );
      expect(result).toEqual(rooms);
    });
  });

  describe('getRoomMessages', () => {
    it('should call chatService.getRoomMessages with correct parameters', async () => {
      // Mock setup
      const roomId = 'room123';
      const user = { id: 'user456', userType: 'employee' };
      const messages = [
        {
          id: 'msg1',
          content: 'Hello',
          sender_employee_id: 'emp1',
          chat_room_id: roomId,
          is_read: true,
        },
        {
          id: 'msg2',
          content: 'World',
          sender_employee_id: user.id,
          chat_room_id: roomId,
          is_read: true,
        },
      ];
      mockChatService.getRoomMessages.mockResolvedValue(messages);

      // Call controller
      const req = { user };
      const result = await controller.getRoomMessages(roomId, req);

      // Verify
      expect(mockChatService.getRoomMessages).toHaveBeenCalledWith(
        roomId,
        user.id,
        user.userType || 'employee',
      );
      expect(result).toEqual(messages);
    });

    it('should handle not found exception from service', async () => {
      // Mock setup
      const roomId = 'nonExistentRoom';
      const user = { id: 'user456', userType: 'employee' };
      mockChatService.getRoomMessages.mockRejectedValue(
        new NotFoundException('La sala de chat no existe'),
      );

      // Call controller
      const req = { user };
      await expect(controller.getRoomMessages(roomId, req)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockChatService.getRoomMessages).toHaveBeenCalledWith(
        roomId,
        user.id,
        user.userType || 'employee',
      );
    });
  });

  describe('createRoom', () => {
    it('should call chatService.createRoom with correct parameters', async () => {
      // Mock setup
      const createRoomDto: CreateRoomDto = {
        name: 'New Room',
        type: ChatRoomType.EMPLOYEE_TO_EMPLOYEE,
        employeeIds: ['emp1', 'emp2'],
      };

      const createdRoom = {
        id: 'room123',
        name: 'New Room',
        type: ChatRoomType.EMPLOYEE_TO_EMPLOYEE,
        employees: [
          { id: 'emp1', employee_name: 'Employee 1' },
          { id: 'emp2', employee_name: 'Employee 2' },
        ],
        visitors: [],
      };

      mockChatService.createRoom.mockResolvedValue(createdRoom);

      // Call controller
      const req = { user: {} };
      const result = await controller.createRoom(createRoomDto, req);

      // Verify
      expect(mockChatService.createRoom).toHaveBeenCalledWith(createRoomDto);
      expect(result).toEqual(createdRoom);
    });
  });

  describe('createMessage', () => {
    it('should call chatService.addMessage with correct parameters', async () => {
      // Mock setup
      const createMessageDto: CreateMessageDto = {
        content: 'Hello, world!',
        roomId: 'room123',
      };

      const user = { id: 'user456', userType: 'employee' };

      const createdMessage = {
        id: 'msg789',
        content: 'Hello, world!',
        chat_room_id: 'room123',
        sender_employee_id: user.id,
        sender_visitor_id: null,
        is_read: false,
        created_at: new Date(),
      };

      mockChatService.addMessage.mockResolvedValue(createdMessage);

      // Call controller
      const req = { user };
      const result = await controller.createMessage(createMessageDto, req);

      // Verify
      expect(mockChatService.addMessage).toHaveBeenCalledWith(
        createMessageDto,
        user,
      );
      expect(result).toEqual(createdMessage);
    });

    it('should handle errors when creating message', async () => {
      // Mock setup
      const createMessageDto: CreateMessageDto = {
        content: 'Hello, world!',
        roomId: 'nonExistentRoom',
      };

      const user = { id: 'user456', userType: 'employee' };

      mockChatService.addMessage.mockRejectedValue(
        new NotFoundException('La sala de chat no existe'),
      );

      // Call controller
      const req = { user };
      await expect(
        controller.createMessage(createMessageDto, req),
      ).rejects.toThrow(NotFoundException);

      expect(mockChatService.addMessage).toHaveBeenCalledWith(
        createMessageDto,
        user,
      );
    });
  });

  describe('createSupplierGroupRoom', () => {
    it('should call chatService.createSupplierGroupRoom with correct parameters', async () => {
      // Mock setup
      const supplierId = 'supplier123';

      const room = {
        id: 'room456',
        name: 'Grupo Supplier Test',
        type: ChatRoomType.SUPPLIER_GROUP,
        supplier_id: supplierId,
        employees: [],
        visitors: [],
      };

      mockChatService.createSupplierGroupRoom.mockResolvedValue(room);

      // Call controller
      const result = await controller.createSupplierGroupRoom(supplierId);

      // Verify
      expect(mockChatService.createSupplierGroupRoom).toHaveBeenCalledWith(
        supplierId,
      );
      expect(result).toEqual(room);
    });
  });

  describe('createPrivateRoom', () => {
    it('should call chatService.getOrCreatePrivateRoom with correct parameters', async () => {
      // Mock setup
      const user = { id: 'user123', userType: 'employee' };
      const targetData: {
        targetUserId: string;
        targetUserType: 'employee' | 'visitor';
      } = { targetUserId: 'user456', targetUserType: 'visitor' };

      const room = {
        id: 'privateRoom123',
        name: 'Chat: Employee - Visitor',
        type: ChatRoomType.EMPLOYEE_TO_VISITOR,
        employees: [{ id: user.id }],
        visitors: [{ id: targetData.targetUserId }],
      };

      mockChatService.getOrCreatePrivateRoom.mockResolvedValue(room);

      // Call controller
      const req = { user };
      const result = await controller.createPrivateRoom(targetData, req);

      // Verify
      expect(mockChatService.getOrCreatePrivateRoom).toHaveBeenCalledWith(
        user.id,
        user.userType || 'employee',
        targetData.targetUserId,
        targetData.targetUserType,
      );
      expect(result).toEqual(room);
    });

    it('should throw BadRequestException when target user info is missing', async () => {
      // Mock setup
      const user = { id: 'user123', userType: 'employee' };
      const targetData: {
        targetUserId: string;
        targetUserType: 'employee' | 'visitor';
      } = { targetUserId: '', targetUserType: 'employee' };

      // Call controller
      const req = { user };
      await expect(
        controller.createPrivateRoom(targetData, req),
      ).rejects.toThrow(BadRequestException);

      expect(mockChatService.getOrCreatePrivateRoom).not.toHaveBeenCalled();
    });
  });
});
