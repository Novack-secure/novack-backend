import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class DataMaskingInterceptor implements NestInterceptor {
  /**
   * Campos sensibles que deben ser enmascarados en las respuestas
   */
  private readonly sensitiveFields = [
    'phone', // Teléfono
    'address', // Dirección
    'date_of_birth', // Fecha de nacimiento
    'nif', // NIF/DNI
    'passport_number', // Número de pasaporte
    'credit_card', // Tarjeta de crédito
    'full_name', // Nombre completo (en algunos contextos)
    'phone_number', // Alternativa para teléfono
    'social_security', // Seguridad social
    'bank_account', // Número de cuenta bancaria
    'email', // Email en ciertos contextos
    'contacts', // Contactos
  ];

  /**
   * Intercepta la respuesta para enmascarar datos sensibles
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // No procesar si no hay datos o si es un buffer/stream
        if (!data || Buffer.isBuffer(data) || typeof data !== 'object') {
          return data;
        }

        // Enmascarar datos en la respuesta
        if (Array.isArray(data)) {
          return data.map((item) => this.maskSensitiveData(item));
        } else {
          return this.maskSensitiveData(data);
        }
      }),
    );
  }

  /**
   * Enmascara datos sensibles en un objeto
   * @param obj Objeto a procesar
   * @returns Objeto con datos sensibles enmascarados
   */
  private maskSensitiveData(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Crear una copia para no mutar el objeto original
    const maskedObj = { ...obj };

    // Procesar cada campo
    for (const key of Object.keys(maskedObj)) {
      const value = maskedObj[key];

      // Si es un objeto anidado, procesarlo recursivamente
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        maskedObj[key] = this.maskSensitiveData(value);
      }
      // Si es un array, procesar cada elemento
      else if (Array.isArray(value)) {
        maskedObj[key] = value.map((item) =>
          typeof item === 'object' ? this.maskSensitiveData(item) : item,
        );
      }
      // Si es un campo sensible, enmascararlo
      else if (
        this.sensitiveFields.includes(key) &&
        typeof value === 'string'
      ) {
        maskedObj[key] = this.mask(value, key);
      }
    }

    return maskedObj;
  }

  /**
   * Aplica una máscara a un valor según su tipo
   * @param value Valor a enmascarar
   * @param fieldType Tipo de campo
   * @returns Valor enmascarado
   */
  private mask(value: string, fieldType: string): string {
    if (!value) return value;

    // Diferentes estrategias de enmascaramiento según el tipo de dato
    switch (fieldType) {
      case 'email': {
        const parts = value.split('@');
        if (parts.length !== 2) return value;

        const name = parts[0];
        const domain = parts[1];

        // Mostrar el primer carácter y el último, ocultar el resto
        const maskedName =
          name.length > 2
            ? `${name.charAt(0)}${'*'.repeat(name.length - 2)}${name.charAt(name.length - 1)}`
            : name.charAt(0) + '*';

        return `${maskedName}@${domain}`;
      }

      case 'phone':
      case 'phone_number': {
        // Mostrar solo los últimos 4 dígitos
        const digits = value.replace(/\D/g, '');
        return digits.length > 4
          ? `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`
          : `${'*'.repeat(digits.length)}`;
      }

      case 'credit_card': {
        // Formato estándar: mostrar solo los últimos 4 dígitos
        const digits = value.replace(/\D/g, '');
        return digits.length > 4
          ? `${'*'.repeat(12)} ${digits.slice(-4)}`
          : `${'*'.repeat(digits.length)}`;
      }

      case 'nif':
      case 'passport_number':
      case 'social_security': {
        // Mostrar solo los últimos 3 caracteres
        return value.length > 3
          ? `${'*'.repeat(value.length - 3)}${value.slice(-3)}`
          : `${'*'.repeat(value.length)}`;
      }

      case 'bank_account': {
        // Mostrar solo los últimos 4 dígitos
        const digits = value.replace(/\D/g, '');
        return digits.length > 4
          ? `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`
          : `${'*'.repeat(digits.length)}`;
      }

      case 'address': {
        // Mostrar solo el tipo de vía y el número
        const parts = value.split(' ');
        if (parts.length <= 2) return '***';

        // Intentar conservar calle/avenida y número
        return `${parts[0]} ${parts[1]} ***`;
      }

      case 'full_name': {
        // Mostrar iniciales
        return value
          .split(' ')
          .map((part) => `${part.charAt(0)}.`)
          .join(' ');
      }

      default:
        // Para otros tipos, enmascarar el 70% central
        const length = value.length;
        const visibleChars = Math.max(Math.floor(length * 0.3), 2);
        const leftVisible = Math.ceil(visibleChars / 2);
        const rightVisible = Math.floor(visibleChars / 2);

        return length > 4
          ? `${value.substring(0, leftVisible)}${'*'.repeat(length - visibleChars)}${value.substring(length - rightVisible)}`
          : `${value.charAt(0)}${'*'.repeat(length - 1)}`;
    }
  }
}
