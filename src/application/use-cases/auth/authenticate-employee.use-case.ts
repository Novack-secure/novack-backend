/**
 * Caso de uso: Autenticar empleado
 *
 * Implementa la lógica de autenticación de empleados usando sus credenciales.
 */

import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
// JwtService is no longer directly used here for signing if AuthService handles it via TokenService
// import { JwtService } from '@nestjs/jwt';
// bcrypt is also not directly used here anymore
// import * as bcrypt from 'bcrypt';
// IEmployeeRepository is also not directly used here anymore
// import { IEmployeeRepository } from '../../../domain/repositories/employee.repository.interface';
import { Employee } from '../../../domain/entities';
import { AuthService } from '../../services/auth.service'; // Import AuthService
import { Request } from 'express'; // Import Request

export interface AuthenticateEmployeeDto {
  email: string;
  password: string;
}

// Update AuthenticationResult to match the output of TokenService via AuthService
export interface AuthenticationResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  employee: Partial<Employee>; // Or a specific Employee DTO
}

@Injectable()
export class AuthenticateEmployeeUseCase {
  constructor(
    // Remove direct dependencies if AuthService encapsulates all logic
    // @Inject('IEmployeeRepository')
    // private readonly employeeRepository: IEmployeeRepository,
    // private readonly jwtService: JwtService,
    private readonly authService: AuthService, // Inject AuthService
  ) {}

  // Add Request to the signature
  async execute(
    credentials: AuthenticateEmployeeDto,
    req: Request,
  ): Promise<AuthenticationResult> {
    try {
      // Delegate to AuthService.login, which now uses TokenService
      const authResult = await this.authService.login(
        credentials.email,
        credentials.password,
        req,
      );

      // The authResult from authService.login now includes the full token set and employee
      // Ensure the employee object is shaped as needed (e.g., omitting sensitive fields)
      // AuthService already returns 'employee' which might be the full entity.
      // Let's assume it's fine for now, or a DTO mapping would occur here or in AuthService.
      return authResult as AuthenticationResult;
    } catch (error) {
      // The AuthService.login method already throws UnauthorizedException or other HttpExceptions
      // Re-throwing them is standard.
      throw error;
    }
  }
}
