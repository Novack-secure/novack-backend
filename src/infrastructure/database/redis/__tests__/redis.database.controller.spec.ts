import { Test, TestingModule } from '@nestjs/testing';
import { RedisDatabaseController } from '../redis.database.controller';
import { RedisDatabaseService } from '../redis.database.service';
import { AuthGuard } from '../../../../application/guards/auth.guard';

describe('RedisDatabaseController', () => {
  let controller: RedisDatabaseController;
  let service: RedisDatabaseService;

  // Mock de RedisDatabaseService
  const mockRedisDatabaseService = {
    testConnection: jest.fn(),
    getChatMessages: jest.fn(),
    getChatRoom: jest.fn(),
    getCardLocation: jest.fn(),
    getNearbyCards: jest.fn(),
    flushAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RedisDatabaseController],
      providers: [
        {
          provide: RedisDatabaseService,
          useValue: mockRedisDatabaseService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<RedisDatabaseController>(RedisDatabaseController);
    service = module.get<RedisDatabaseService>(RedisDatabaseService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('testConnection', () => {
    it('should call service.testConnection', async () => {
      // Mock setup
      mockRedisDatabaseService.testConnection.mockResolvedValue({
        status: 'ok',
        message: 'Conexión a Redis establecida',
      });

      // Call controller
      const result = await controller.testConnection();

      // Verify
      expect(mockRedisDatabaseService.testConnection).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'ok',
        message: 'Conexión a Redis establecida',
      });
    });
  });

  describe('getChatMessages', () => {
    it('should call service.getChatMessages with correct parameters', async () => {
      // Mock setup
      const roomId = 'room123';
      const limit = 20;
      const messages = [
        { id: 'msg1', content: 'Hello' },
        { id: 'msg2', content: 'World' },
      ];
      mockRedisDatabaseService.getChatMessages.mockResolvedValue(messages);

      // Call controller
      const result = await controller.getChatMessages(roomId, limit);

      // Verify
      expect(mockRedisDatabaseService.getChatMessages).toHaveBeenCalledWith(
        roomId,
        limit,
      );
      expect(result).toEqual(messages);
    });
  });

  describe('getChatRoom', () => {
    it('should call service.getChatRoom with correct parameters', async () => {
      // Mock setup
      const roomId = 'room123';
      const room = {
        id: roomId,
        name: 'Test Room',
        type: 'employee_to_employee',
      };
      mockRedisDatabaseService.getChatRoom.mockResolvedValue(room);

      // Call controller
      const result = await controller.getChatRoom(roomId);

      // Verify
      expect(mockRedisDatabaseService.getChatRoom).toHaveBeenCalledWith(roomId);
      expect(result).toEqual(room);
    });
  });

  describe('getCardLocation', () => {
    it('should call service.getCardLocation with correct parameters', async () => {
      // Mock setup
      const cardId = 'card123';
      const location = {
        id: 'loc456',
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10.5,
      };
      mockRedisDatabaseService.getCardLocation.mockResolvedValue(location);

      // Call controller
      const result = await controller.getCardLocation(cardId);

      // Verify
      expect(mockRedisDatabaseService.getCardLocation).toHaveBeenCalledWith(
        cardId,
      );
      expect(result).toEqual(location);
    });
  });

  describe('getNearbyCards', () => {
    it('should call service.getNearbyCards with correct parameters', async () => {
      // Mock setup
      const latitude = 40.7128;
      const longitude = -74.006;
      const radius = 100;
      const nearbyCards = [
        {
          id: 'card123',
          card_number: 'CARD-123',
          latitude: 40.715,
          longitude: -74.004,
          distance_meters: 50,
        },
      ];
      mockRedisDatabaseService.getNearbyCards.mockResolvedValue(nearbyCards);

      // Call controller
      const result = await controller.getNearbyCards(
        latitude,
        longitude,
        radius,
      );

      // Verify
      expect(mockRedisDatabaseService.getNearbyCards).toHaveBeenCalledWith(
        latitude,
        longitude,
        radius,
      );
      expect(result).toEqual(nearbyCards);
    });
  });

  describe('flushCache', () => {
    it('should call service.flushAll', async () => {
      // Mock setup
      mockRedisDatabaseService.flushAll.mockResolvedValue(undefined);

      // Call controller
      await controller.flushCache();

      // Verify
      expect(mockRedisDatabaseService.flushAll).toHaveBeenCalled();
    });
  });
});
