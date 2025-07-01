import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Tokens from 'csrf';

@Injectable()
export class CsrfService {
  private readonly tokens: any;

  constructor(private readonly configService: ConfigService) {
    // Crear una instancia del generador de tokens CSRF con configuración segura
    this.tokens = new Tokens({
      secretLength: 32, // Longitud del secreto
      saltLength: 10, // Longitud del salt
    });
  }

  /**
   * Genera un secreto CSRF para un usuario o sesión
   * @returns Secreto CSRF que debe ser guardado en la sesión
   */
  generateSecret(): string {
    return this.tokens.secretSync();
  }

  /**
   * Genera un token CSRF basado en un secreto
   * @param secret El secreto CSRF de la sesión
   * @returns Token CSRF para enviar al cliente
   */
  generateToken(secret: string): string {
    return this.tokens.create(secret);
  }

  /**
   * Verifica si un token CSRF es válido
   * @param secret El secreto CSRF de la sesión
   * @param token El token CSRF enviado por el cliente
   * @returns true si el token es válido, false de lo contrario
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      return this.tokens.verify(secret, token);
    } catch (error) {
      return false;
    }
  }
}
