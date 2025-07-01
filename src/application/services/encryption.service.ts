import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

/**
 * Servicio para cifrado y descifrado de datos sensibles
 * Implementa cifrado AES-256 para proteger datos en reposo
 */
@Injectable()
export class EncryptionService {
  private readonly encryptionKey: string;
  private readonly ivSize = 16; // 128 bits

  constructor(private readonly configService: ConfigService) {
    // Obtener la clave de cifrado del entorno o usar una por defecto (solo para desarrollo)
    this.encryptionKey = this.configService.get<string>(
      'ENCRYPTION_KEY',
      'esta_clave_debe_cambiarse_en_produccion_con_32_bytes',
    );
  }

  /**
   * Cifra un valor utilizando AES-256
   * @param value Valor a cifrar
   * @returns Texto cifrado en formato Base64
   */
  encrypt(value: string | object): string {
    if (!value) return null;

    // Convertir objetos a JSON
    const valueToEncrypt =
      typeof value === 'object' ? JSON.stringify(value) : value;

    // Generar un IV aleatorio
    const iv = CryptoJS.lib.WordArray.random(this.ivSize);

    // Cifrar con AES modo CBC
    const encrypted = CryptoJS.AES.encrypt(
      valueToEncrypt,
      CryptoJS.enc.Utf8.parse(this.encryptionKey),
      {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
      },
    );

    // Concatenar IV y datos cifrados
    const result = iv
      .concat(encrypted.ciphertext)
      .toString(CryptoJS.enc.Base64);

    return result;
  }

  /**
   * Descifra un valor cifrado con AES-256
   * @param encryptedValue Valor cifrado en formato Base64
   * @param isObject Indica si el valor original era un objeto JSON
   * @returns Valor descifrado
   */
  decrypt(encryptedValue: string, isObject = false): string | object {
    if (!encryptedValue) return null;

    try {
      // Decodificar el valor cifrado de Base64
      const ciphertext = CryptoJS.enc.Base64.parse(encryptedValue);

      // Separar IV y datos cifrados
      const iv = ciphertext.clone();
      iv.sigBytes = this.ivSize;
      iv.clamp();

      const encrypted = ciphertext.clone();
      encrypted.words.splice(0, this.ivSize / 4);
      encrypted.sigBytes -= this.ivSize;

      // Descifrar
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: encrypted },
        CryptoJS.enc.Utf8.parse(this.encryptionKey),
        {
          iv: iv,
          padding: CryptoJS.pad.Pkcs7,
          mode: CryptoJS.mode.CBC,
        },
      );

      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

      // Si se espera un objeto, convertir de JSON
      if (isObject) {
        try {
          return JSON.parse(decryptedText);
        } catch (error) {
          return decryptedText;
        }
      }

      return decryptedText;
    } catch (error) {
      console.error('Error al descifrar:', error);
      return null;
    }
  }

  /**
   * Calcula un hash SHA-256 de un valor
   * @param value Valor a hashear
   * @returns Hash en formato hexadecimal
   */
  hash(value: string): string {
    if (!value) return null;
    return CryptoJS.SHA256(value).toString(CryptoJS.enc.Hex);
  }
}
