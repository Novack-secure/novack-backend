import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from 'src/application/services/auth.service';
import { UnauthorizedException } from '@nestjs/common';
import {
  LoginDto,
  LoginSmsVerifyDto,
} from 'src/application/dtos/auth/login.dto'; // LoginSmsVerifyDto was also missing
import { RefreshTokenDto } from 'src/application/dtos/auth/refresh-token.dto';
import { LogoutDto } from 'src/application/dtos/auth/logout.dto';
import { AuthenticateEmployeeUseCase } from 'src/application/use-cases/auth/authenticate-employee.use-case';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;
  let mockAuthenticateEmployeeUseCase: Partial<AuthenticateEmployeeUseCase>;

  // Define a comprehensive mock request object at the top level of the describe block
  const mockRequestBase = {
    headers: { 'user-agent': 'jest-test' },
    ip: '127.0.0.1',
    cookies: {},
    signedCookies: {},
    get: jest.fn((name: string) => mockRequestBase.headers[name.toLowerCase()]), // Allow access to headers via get
    header: jest.fn(
      (name: string) => mockRequestBase.headers[name.toLowerCase()],
    ),
    accepts: jest.fn(),
    is: jest.fn(),
    params: {},
    query: {},
    body: {},
    method: 'POST', // Default method
    url: '/', // Default URL
    route: { path: '/' },
    user: null,
    app: {} as any,
    res: {} as any,
    next: jest.fn(),
    aborted: false,
    httpVersion: '1.1',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    complete: true,
    connection: {} as any,
    socket: {} as any,
    trailers: {},
    rawTrailers: [],
    setTimeout: jest.fn() as any,
    statusCode: 200,
    statusMessage: 'OK',
    destroy: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    isAuthenticated: jest.fn(),
    isUnauthenticated: jest.fn(),
    session: {} as any,
    flash: jest.fn(),
  } as any; // Cast to any for simplicity in test setup

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      verifySmsOtpAndLogin: jest.fn(),
    };

    mockAuthenticateEmployeeUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: AuthenticateEmployeeUseCase,
          useValue: mockAuthenticateEmployeeUseCase,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    // mockRequestBase is now defined at the describe level

    const mockResponse = {
      access_token: 'test-token',
      refresh_token: 'test-refresh-token',
      expires_in: 900,
      token_type: 'Bearer',
      employee: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    it('should return token and employee data on successful login', async () => {
      (
        mockAuthenticateEmployeeUseCase.execute as jest.Mock
      ).mockResolvedValueOnce(mockResponse);
      const req = {
        ...mockRequestBase,
        body: loginDto,
        url: '/auth/login',
        method: 'POST',
      };

      const result = await controller.login(loginDto, req);

      expect(result).toEqual(mockResponse);
      expect(mockAuthenticateEmployeeUseCase.execute).toHaveBeenCalledWith(
        loginDto,
        req,
      );
    });

    it('should throw UnauthorizedException on login failure', async () => {
      const errorMessage = 'Credenciales inválidas';
      const error = new UnauthorizedException(errorMessage);
      (
        mockAuthenticateEmployeeUseCase.execute as jest.Mock
      ).mockRejectedValueOnce(error);
      const req = {
        ...mockRequestBase,
        body: loginDto,
        url: '/auth/login',
        method: 'POST',
      };

      // En este caso, necesitamos usar un único expect y guardar la promesa para que el test no la resuelva antes de tiempo
      await expect(controller.login(loginDto, req)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refresh_token: 'valid-refresh-token',
    };

    // mockRequestBase is now defined at the describe level

    const mockResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 900,
      token_type: 'Bearer',
    };

    it('should return new tokens on successful refresh', async () => {
      (mockAuthService.refreshToken as jest.Mock).mockResolvedValueOnce(
        mockResponse,
      );
      const req = {
        ...mockRequestBase,
        body: refreshTokenDto,
        url: '/auth/refresh',
        method: 'POST',
      };

      const result = await controller.refreshToken(refreshTokenDto, req);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        refreshTokenDto.refresh_token,
        req,
      );
    });
  });

  describe('logout', () => {
    const logoutDto: LogoutDto = {
      refresh_token: 'valid-refresh-token',
    };

    it('should successfully logout', async () => {
      (mockAuthService.logout as jest.Mock).mockResolvedValueOnce({
        message: 'Logged out successfully',
      });

      const result = await controller.logout(logoutDto);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockAuthService.logout).toHaveBeenCalledWith(
        logoutDto.refresh_token,
      );
    });
  });
});
