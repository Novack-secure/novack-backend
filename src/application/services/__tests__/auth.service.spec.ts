import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import {
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { StructuredLoggerService } from '../../../infrastructure/logging/structured-logger.service';
import { TokenService } from '../token.service';
import { Employee } from '../../../domain/entities';
import { Request } from 'express';
import { SmsService } from '../sms.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let mockEmployeeRepository: any;
  let mockLoggerService: any;
  let mockTokenService: any;
  let mockSmsService: any;

  // Datos de prueba
  const mockEmail = 'test@example.com';
  const mockPassword = 'password123';
  let currentMockEmployee: Employee;

  const createMockEmployeeCredentials = () => ({
    id: 'cred-123',
    employee_id: 'emp-123',
    password_hash: 'hashedPassword',
    password_salt: 'salt',
    is_email_verified: true,
    is_phone_verified: false,
    is_sms_2fa_enabled: false,
    phone_number_verified: false,
    recovery_codes: null,
    totp_secret_key: null,
    totp_secret_url: null,
    is_totp_verified: false,
    totp_verified_at: null,
    totp_enabled_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    last_login: new Date(),
    last_password_change: new Date(),
    sms_otp_code: null,
    sms_otp_code_expires_at: null,
  });

  const createMockEmployee = () => {
    const employee = new Employee();
    employee.id = 'emp-123';
    employee.email = mockEmail;
    employee.first_name = 'Test';
    employee.last_name = 'User';
    employee.phone = '+1234567890';
    employee.supplier_id = 'supp-123';
    employee.created_at = new Date();
    employee.updated_at = new Date();
    employee.credentials = createMockEmployeeCredentials() as any;
    return employee;
  };

  beforeEach(async () => {
    currentMockEmployee = createMockEmployee();

    mockEmployeeRepository = {
      findByEmailWithCredentialsAndPhone: jest
        .fn()
        .mockResolvedValue(currentMockEmployee),
      findByIdWithCredentialsAndPhone: jest
        .fn()
        .mockResolvedValue(currentMockEmployee),
      updateCredentials: jest.fn().mockResolvedValue({}),
    };

    mockLoggerService = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockTokenService = {
      generateTokens: jest.fn(),
      refreshAccessToken: jest.fn(),
      revokeToken: jest.fn(),
    };

    mockSmsService = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'IEmployeeRepository',
          useValue: mockEmployeeRepository,
        },
        {
          provide: StructuredLoggerService,
          useValue: mockLoggerService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const mockRequest = {
      headers: { 'user-agent': 'test-user-agent' },
      ip: '127.0.0.1',
    } as unknown as Request;

    it('should login successfully with valid credentials and no 2FA', async () => {
      currentMockEmployee.credentials.is_sms_2fa_enabled = false;
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(
        currentMockEmployee,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Password válida

      mockTokenService.generateTokens.mockResolvedValue({
        access_token: 'new.access.token',
        refresh_token: 'new.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      const result = await service.login(mockEmail, mockPassword, mockRequest);

      expect(result).toHaveProperty('access_token', 'new.access.token');
      expect(result.employee).toBeDefined();
      expect(
        mockEmployeeRepository.findByEmailWithCredentialsAndPhone,
      ).toHaveBeenCalledWith(mockEmail);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockPassword,
        currentMockEmployee.credentials.password_hash,
      );
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(
        currentMockEmployee,
        mockRequest,
      );
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(
        currentMockEmployee.id,
        { last_login: expect.any(Date) },
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Login successful (no SMS OTP required or passed), generating tokens...',
        undefined,
        JSON.stringify({
          userId: currentMockEmployee.id,
          email: currentMockEmployee.email,
          supplierId: currentMockEmployee.supplier_id,
        }),
      );
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(
        null,
      );
      await expect(
        service.login(mockEmail, mockPassword, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'Login failed: Invalid credentials - User not found or no credentials',
        undefined,
        JSON.stringify({ email: mockEmail }),
      );
    });

    it('should throw UnauthorizedException for incorrect password', async () => {
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(
        currentMockEmployee,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(
        service.login(mockEmail, mockPassword, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'Login failed: Invalid credentials - Password mismatch',
        undefined,
        JSON.stringify({ email: mockEmail }),
      );
    });

    it('should throw UnauthorizedException if email is not verified', async () => {
      currentMockEmployee.credentials.is_email_verified = false;
      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(
        currentMockEmployee,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(
        service.login(mockEmail, mockPassword, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'Login failed: Email not verified',
        undefined,
        JSON.stringify({ email: mockEmail }),
      );
    });

    it('should return smsOtpRequired if SMS 2FA is enabled and phone is verified', async () => {
      currentMockEmployee.credentials.is_sms_2fa_enabled = true;
      currentMockEmployee.credentials.phone_number_verified = true;
      currentMockEmployee.phone = '+1234567890'; // Ensure phone is on the employee model directly

      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(
        currentMockEmployee,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockSmsService.sendOtp.mockResolvedValue(undefined);

      const result = await service.login(mockEmail, mockPassword, mockRequest);

      expect(result).toEqual({
        message: 'SMS OTP verification required.',
        smsOtpRequired: true,
        userId: currentMockEmployee.id,
      });
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(
        currentMockEmployee.id,
        {
          sms_otp_code: expect.any(String),
          sms_otp_code_expires_at: expect.any(Date),
        },
      );
      expect(mockSmsService.sendOtp).toHaveBeenCalledWith(
        currentMockEmployee.phone,
        expect.any(String),
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'SMS OTP sent for login process step',
        undefined,
        JSON.stringify({ userId: currentMockEmployee.id }),
      );
    });

    it('should throw InternalServerErrorException if SMS 2FA enabled but no phone number', async () => {
      currentMockEmployee.credentials.is_sms_2fa_enabled = true;
      currentMockEmployee.credentials.phone_number_verified = true;
      currentMockEmployee.phone = null; // No phone

      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(
        currentMockEmployee,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login(mockEmail, mockPassword, mockRequest),
      ).rejects.toThrow(InternalServerErrorException);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'SMS 2FA enabled but no phone number for user',
        undefined,
        JSON.stringify({ userId: currentMockEmployee.id }),
      );
    });

    it('should throw InternalServerErrorException if smsService.sendOtp fails', async () => {
      currentMockEmployee.credentials.is_sms_2fa_enabled = true;
      currentMockEmployee.credentials.phone_number_verified = true;
      currentMockEmployee.phone = '+1234567890';

      mockEmployeeRepository.findByEmailWithCredentialsAndPhone.mockResolvedValue(
        currentMockEmployee,
      );
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockSmsService.sendOtp.mockRejectedValue(new Error('SMS failed'));

      await expect(
        service.login(mockEmail, mockPassword, mockRequest),
      ).rejects.toThrow(InternalServerErrorException);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'Failed to send login OTP SMS via SmsService during login attempt',
        undefined,
        JSON.stringify({ userId: currentMockEmployee.id, error: 'SMS failed' }),
      );
    });
  });

  describe('verifySmsOtpAndLogin', () => {
    const mockUserId = 'test-user-id';
    const mockOtp = '123456';
    let mockEmployeeWithOtp: Employee;

    beforeEach(() => {
      mockEmployeeWithOtp = createMockEmployee();
      mockEmployeeWithOtp.id = mockUserId;
      mockEmployeeWithOtp.credentials.sms_otp_code = mockOtp;
      mockEmployeeWithOtp.credentials.sms_otp_code_expires_at = new Date(
        Date.now() + 5 * 60 * 1000,
      );
    });

    const mockRequest = {
      headers: { 'user-agent': 'test-user-agent' },
      ip: '127.0.0.1',
    } as unknown as Request;

    it('should successfully verify OTP and login', async () => {
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(
        mockEmployeeWithOtp,
      );
      mockTokenService.generateTokens.mockResolvedValue({
        access_token: 'final.access.token',
        refresh_token: 'final.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      });

      const result = await service.verifySmsOtpAndLogin(
        mockUserId,
        mockOtp,
        mockRequest,
      );

      expect(result).toHaveProperty('access_token', 'final.access.token');
      expect(result.employee).toBeDefined();
      expect(
        mockEmployeeRepository.findByIdWithCredentialsAndPhone,
      ).toHaveBeenCalledWith(mockUserId);
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(
        mockUserId,
        {
          last_login: expect.any(Date),
          sms_otp_code: null,
          sms_otp_code_expires_at: null,
        },
      );
      expect(mockTokenService.generateTokens).toHaveBeenCalledWith(
        mockEmployeeWithOtp,
        mockRequest,
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'SMS OTP verified successfully, login completed',
        undefined,
        JSON.stringify({ userId: mockUserId }),
      );
    });

    it('should throw UnauthorizedException if employee not found', async () => {
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(
        null,
      );
      await expect(
        service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'SMS OTP login verification failed: Employee or credentials not found',
        undefined,
        JSON.stringify({
          userId: mockUserId,
          reason: 'Employee or credentials not found',
        }),
      );
    });

    it('should throw UnauthorizedException if no OTP is pending', async () => {
      if (mockEmployeeWithOtp.credentials)
        mockEmployeeWithOtp.credentials.sms_otp_code = null;
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(
        mockEmployeeWithOtp,
      );
      await expect(
        service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'SMS OTP login verification failed: No OTP pending',
        undefined,
        JSON.stringify({
          userId: mockUserId,
          reason: 'No OTP pending or already verified',
        }),
      );
    });

    it('should throw UnauthorizedException if OTP is expired', async () => {
      if (mockEmployeeWithOtp.credentials)
        mockEmployeeWithOtp.credentials.sms_otp_code_expires_at = new Date(
          Date.now() - 1000,
        );
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(
        mockEmployeeWithOtp,
      );
      await expect(
        service.verifySmsOtpAndLogin(mockUserId, mockOtp, mockRequest),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockEmployeeRepository.updateCredentials).toHaveBeenCalledWith(
        mockUserId,
        {
          sms_otp_code: null,
          sms_otp_code_expires_at: null,
        },
      );
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'SMS OTP login verification failed: OTP has expired',
        undefined,
        JSON.stringify({ userId: mockUserId, reason: 'OTP expired' }),
      );
    });

    it('should throw UnauthorizedException for invalid OTP', async () => {
      mockEmployeeRepository.findByIdWithCredentialsAndPhone.mockResolvedValue(
        mockEmployeeWithOtp,
      );
      await expect(
        service.verifySmsOtpAndLogin(mockUserId, 'wrong-otp', mockRequest),
      ).rejects.toThrow(UnauthorizedException);
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'SMS OTP login verification failed: Invalid OTP',
        undefined,
        JSON.stringify({ userId: mockUserId, reason: 'Invalid OTP' }),
      );
    });
  });

  describe('refreshToken', () => {
    const mockToken = 'valid.refresh.token';
    const mockRequest = {} as Request; // Minimal request object

    it('should return new tokens', async () => {
      mockTokenService.refreshAccessToken.mockResolvedValue({
        access_token: 'refreshed.access.token',
        refresh_token: 'refreshed.refresh.token',
        expires_in: 900,
        token_type: 'Bearer',
      });
      const result = await service.refreshToken(mockToken, mockRequest);

      expect(result).toHaveProperty('access_token', 'refreshed.access.token');
      expect(mockTokenService.refreshAccessToken).toHaveBeenCalledWith(
        mockToken,
        mockRequest,
      );
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Token refreshed successfully',
      );
    });
  });

  describe('logout', () => {
    const mockToken = 'valid.refresh.token';

    it('should call tokenService.revokeToken and log success', async () => {
      mockTokenService.revokeToken.mockResolvedValue(true);
      const result = await service.logout(mockToken);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockTokenService.revokeToken).toHaveBeenCalledWith(mockToken);
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'Refresh token revoked successfully.',
      );
    });

    it('should handle token already revoked or invalid', async () => {
      mockTokenService.revokeToken.mockResolvedValue(false);
      const result = await service.logout(mockToken);

      expect(result).toEqual({
        message: 'Logout processed; token is invalid or already revoked.',
      });
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'Failed to revoke refresh token (it may have been invalid or already revoked).',
      );
    });
  });
});
