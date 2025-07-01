import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BruteForceMiddleware } from '../brute-force.middleware';
import { LoginAttempt } from '../../../domain/entities';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

describe('BruteForceMiddleware', () => {
  let middleware: BruteForceMiddleware;
  let loginAttemptRepository: Repository<LoginAttempt>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(async () => {
    // Mock repository
    const mockRepository = {
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BruteForceMiddleware,
        {
          provide: getRepositoryToken(LoginAttempt),
          useValue: mockRepository,
        },
      ],
    }).compile();

    middleware = module.get<BruteForceMiddleware>(BruteForceMiddleware);
    loginAttemptRepository = module.get<Repository<LoginAttempt>>(
      getRepositoryToken(LoginAttempt),
    );

    // Crear el mock de Request con métodos para evaluar url y método
    mockRequest = {
      ip: '192.168.1.1',
      headers: {
        'user-agent': 'test-agent',
      },
    } as Partial<Request>;

    mockResponse = {};
    mockNext = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should allow login when attempts are below limit', async () => {
    // Configurar el mock para devolver un número bajo de intentos
    jest.spyOn(loginAttemptRepository, 'count').mockResolvedValue(3);

    // Configurar la ruta y método para esta prueba
    Object.defineProperty(mockRequest, 'path', { value: '/auth/login' });
    Object.defineProperty(mockRequest, 'method', { value: 'POST' });

    await middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(loginAttemptRepository.count).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should block login when attempts exceed limit', async () => {
    // Configurar el mock para devolver un número de intentos por encima del límite
    jest.spyOn(loginAttemptRepository, 'count').mockResolvedValue(6);
    jest
      .spyOn(loginAttemptRepository, 'create')
      .mockReturnValue({} as LoginAttempt);
    jest
      .spyOn(loginAttemptRepository, 'save')
      .mockResolvedValue({} as LoginAttempt);

    // Configurar la ruta y método para esta prueba
    Object.defineProperty(mockRequest, 'path', { value: '/auth/login' });
    Object.defineProperty(mockRequest, 'method', { value: 'POST' });

    await expect(
      middleware.use(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      ),
    ).rejects.toThrow(HttpException);

    expect(loginAttemptRepository.count).toHaveBeenCalled();
    expect(loginAttemptRepository.create).toHaveBeenCalled();
    expect(loginAttemptRepository.save).toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should skip middleware for non-login routes', async () => {
    // Configurar la ruta y método para esta prueba
    Object.defineProperty(mockRequest, 'path', { value: '/other-route' });
    Object.defineProperty(mockRequest, 'method', { value: 'POST' });

    await middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(loginAttemptRepository.count).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it('should skip middleware for non-POST methods', async () => {
    // Configurar la ruta y método para esta prueba
    Object.defineProperty(mockRequest, 'path', { value: '/auth/login' });
    Object.defineProperty(mockRequest, 'method', { value: 'GET' });

    await middleware.use(
      mockRequest as Request,
      mockResponse as Response,
      mockNext,
    );

    expect(loginAttemptRepository.count).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });
});
