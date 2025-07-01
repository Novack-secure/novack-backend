import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, Visitor } from 'src/domain/entities';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Visitor)
    private visitorRepository: Repository<Visitor>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client);

    if (!token) {
      throw new WsException('Token no proporcionado');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      // Guardar información del usuario en el cliente para usarlo después
      const userType = payload.userType || 'employee'; // Por defecto asumimos que es un empleado
      let user;

      // Obtener información del usuario según su tipo
      if (userType === 'employee') {
        user = await this.employeeRepository.findOne({
          where: { id: payload.sub },
        });
        if (!user) {
          throw new WsException('Empleado no encontrado');
        }
      } else {
        user = await this.visitorRepository.findOne({
          where: { id: payload.sub },
        });
        if (!user) {
          throw new WsException('Visitante no encontrado');
        }
      }

      // Guardar datos del usuario autenticado en el contexto
      const wsContext = context.switchToWs();
      wsContext.getData().user = {
        id: payload.sub,
        userType,
        ...user,
      };

      // También guardar en el socket para uso futuro
      client['user'] = {
        id: payload.sub,
        userType,
        ...user,
      };

      return true;
    } catch (e) {
      throw new WsException('Token inválido: ' + e.message);
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    // Extraer token del query param o del header de autenticación
    const token =
      client.handshake.query.token ||
      client.handshake.auth?.token ||
      client.handshake.headers.authorization?.split(' ')[1];

    return token;
  }
}
