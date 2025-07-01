import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware que mejora la seguridad de sesiones para prevenir
 * ataques como secuestro de sesión, CSRF y otros.
 */
@Injectable()
export class SessionSecurityMiddleware implements NestMiddleware {
  /**
   * Agrega cabeceras de seguridad y opciones de cookies para las sesiones
   */
  use(req: Request, res: Response, next: NextFunction) {
    // Prevenir clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Habilitar protección XSS integrada en navegadores modernos
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevenir MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Strict-Transport-Security
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload',
    );

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');

    // Feature-Policy/Permissions-Policy
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );

    next();
  }
}
