import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Employee,
  EmployeeCredentials,
  RefreshToken,
} from '../../domain/entities';
import * as bcrypt from 'bcrypt';
import { TokenService } from './token.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 10;
  private readonly LOCK_TIME_MINUTES = 15;

  constructor(
    private readonly employeeService: EmployeeService,
    private readonly tokenService: TokenService,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeCredentials)
    private readonly employeeAuthRepository: Repository<EmployeeCredentials>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async validateEmployee(email: string, password: string) {
    const employee = await this.employeeRepository.findOne({
      where: { email },
      relations: ['credentials'],
    });
    if (!employee || !employee.credentials) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { credentials } = employee;

    // Verificar si la cuenta está bloqueada
    if (credentials.locked_until && credentials.locked_until > new Date()) {
      const remainingMinutes = Math.ceil(
        (credentials.locked_until.getTime() - new Date().getTime()) /
          (1000 * 60),
      );
      throw new UnauthorizedException(
        `Cuenta bloqueada. Intente nuevamente en ${remainingMinutes} minutos`,
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      credentials.password_hash,
    );
    if (!isPasswordValid) {
      // Incrementar el contador de intentos fallidos
      credentials.login_attempts = (credentials.login_attempts || 0) + 1;

      // Si excede el máximo de intentos, bloquear la cuenta
      if (credentials.login_attempts >= this.MAX_LOGIN_ATTEMPTS) {
        credentials.locked_until = new Date(
          Date.now() + this.LOCK_TIME_MINUTES * 60 * 1000,
        );
        await this.employeeAuthRepository.save(credentials);
        throw new UnauthorizedException(
          `Demasiados intentos fallidos. Cuenta bloqueada por ${this.LOCK_TIME_MINUTES} minutos`,
        );
      }

      await this.employeeAuthRepository.save(credentials);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Restablecer los intentos fallidos si el login es exitoso
    if (credentials.login_attempts > 0) {
      credentials.login_attempts = 0;
      credentials.locked_until = null;
      credentials.last_login = new Date();
      await this.employeeAuthRepository.save(credentials);
    }
    // Return a subset of employee properties, excluding credentials for security
    const { credentials: _, ...employeeDetails } = employee;
    return employeeDetails;
  }

  async login(email: string, password: string, request?: Request) {
    const employee = await this.validateEmployee(email, password);

    // Employee object from validateEmployee already excludes credentials
    // We need to fetch the full employee again if supplier is needed and not already loaded by validateEmployee
    // For now, assuming validateEmployee returns enough info or we fetch it here if needed.
    // Let's re-fetch to ensure supplier is present, as original code did.
    const fullEmployee = await this.employeeRepository.findOne({
      where: { id: employee.id },
      relations: ['supplier'],
    });

    if (!fullEmployee) {
      throw new UnauthorizedException(
        'Employee details not found after validation.',
      );
    }

    // Generar tokens con el nuevo servicio
    const tokens = await this.tokenService.generateTokens(
      fullEmployee,
      request,
    );

    return {
      ...tokens,
      employee: {
        id: fullEmployee.id,
        first_name: fullEmployee.first_name,
        last_name: fullEmployee.last_name,
        email: fullEmployee.email,
        is_creator: fullEmployee.is_creator,
        supplier: fullEmployee.supplier,
      },
    };
  }

  async refreshToken(token: string, request?: Request) {
    return this.tokenService.refreshAccessToken(token, request);
  }

  async logout(refreshToken: string) {
    return this.tokenService.revokeToken(refreshToken);
  }

  async validateToken(token: string) {
    return this.tokenService.validateToken(token);
  }

  async verifySmsOtpAndLogin(
    userId: string,
    otp: string,
    req: Request,
  ): Promise<any> {
    // TODO: Implement this method
    throw new Error('Method not implemented.');
  }
}
