import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IEmployeeRepository } from '../../domain/repositories/employee.repository.interface';
import { Inject } from '@nestjs/common';

/**
 * Guard para verificar que el usuario solo acceda a recursos de su supplier
 * Protege endpoints que requieren verificación de supplier_id
 */
@Injectable()
export class SupplierAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(IEmployeeRepository)
    private readonly employeeRepository: IEmployeeRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Obtener el supplier_id del parámetro de ruta o del body
    const supplierId = request.params.supplierId || request.body.supplier_id;

    // Si no hay supplier_id en la request, solo verificar que el usuario esté autenticado
    if (!supplierId) {
      return true;
    }

    // Si el usuario no tiene supplier_id, es un admin o super usuario
    if (!user.supplier_id) {
      return true;
    }

    // Verificar que el supplier_id de la request coincida con el del usuario
    if (user.supplier_id !== supplierId) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a recursos de otro proveedor'
      );
    }

    return true;
  }
}







