import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  ListBucketsCommand,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly s3Client: S3Client;
  private readonly region: string;
  private readonly useFallbackStorage: boolean;
  private readonly fallbackDir: string;
  private s3Available: boolean = false;

  constructor(private readonly configService: ConfigService) {
    // --- Configuración de AWS S3 ---
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.useFallbackStorage =
      this.configService.get<string>('USE_LOCAL_STORAGE') === 'true';
    this.fallbackDir =
      this.configService.get<string>('LOCAL_STORAGE_PATH') || 'storage/uploads';

    // Configurar explícitamente las credenciales de AWS
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!accessKeyId || !secretAccessKey) {
      this.logger.warn(
        'AWS_ACCESS_KEY_ID o AWS_SECRET_ACCESS_KEY no están configurados. Se usará almacenamiento local de respaldo.',
      );
    }

    this.s3Client = new S3Client({
      region: this.region,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
            }
          : undefined,
    });

    this.logger.log(
      `Servicio de almacenamiento inicializado. Región S3: ${this.region}`,
    );

    // Crear el directorio de respaldo si no existe
    if (this.useFallbackStorage || !accessKeyId || !secretAccessKey) {
      this.ensureFallbackDirectoryExists();
    }
  }

  async onModuleInit() {
    // Verificar la conexión con S3 al iniciar el módulo
    if (!this.useFallbackStorage) {
      try {
        const command = new ListBucketsCommand({});
        await this.s3Client.send(command);
        this.s3Available = true;
        this.logger.log('Conexión exitosa con AWS S3');
      } catch (error) {
        this.s3Available = false;
        this.logger.error(
          'No se pudo conectar con AWS S3. Se usará almacenamiento local:',
          error.message,
        );
        this.ensureFallbackDirectoryExists();
      }
    }
  }

  private ensureFallbackDirectoryExists() {
    const fullPath = path.resolve(process.cwd(), this.fallbackDir);
    if (!fs.existsSync(fullPath)) {
      try {
        fs.mkdirSync(fullPath, { recursive: true });
        this.logger.log(
          `Directorio de almacenamiento local creado: ${fullPath}`,
        );
      } catch (error) {
        this.logger.error(
          `Error al crear directorio de almacenamiento local: ${error.message}`,
        );
      }
    }
  }

  /**
   * Sube un archivo a AWS S3 o al almacenamiento local de respaldo.
   * @param bucketName Nombre del bucket S3 de destino.
   * @param fileBuffer Buffer del archivo.
   * @param originalName Nombre original del archivo (para obtener extensión).
   * @param mimeType Tipo MIME del archivo.
   * @param destinationPath Prefijo/carpeta dentro del bucket (ej. 'profile/'). Asegúrate de que termine con '/'.
   * @returns La URL pública o ruta del archivo subido.
   */
  async uploadFile(
    bucketName: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    destinationPath: string = '',
  ): Promise<string> {
    if (!bucketName && this.s3Available) {
      throw new Error(
        'El nombre del bucket no fue proporcionado para la subida.',
      );
    }

    const fileExtension = originalName.split('.').pop() || '';
    const uniqueFileName = `${randomUUID()}.${fileExtension}`;

    // Si S3 está disponible y no se ha especificado usar almacenamiento local
    if (this.s3Available && !this.useFallbackStorage) {
      return this.uploadToS3(
        bucketName,
        fileBuffer,
        uniqueFileName,
        mimeType,
        destinationPath,
      );
    } else {
      return this.uploadToLocalStorage(
        fileBuffer,
        uniqueFileName,
        destinationPath,
      );
    }
  }

  /**
   * Sube un archivo a AWS S3
   */
  private async uploadToS3(
    bucketName: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    destinationPath: string,
  ): Promise<string> {
    const s3Key = `${destinationPath}${fileName}`;
    this.logger.log(
      `Subiendo archivo a S3 Bucket: ${bucketName}, Key: ${s3Key} (MIME: ${mimeType})`,
    );

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      ACL: 'public-read',
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Archivo subido correctamente a ${bucketName}/${s3Key}`);

      // Construir la URL pública
      const url = `https://${bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
      return url;
    } catch (error) {
      // No registrar como error si estamos en ambiente de pruebas
      const isRunningInJest = typeof process.env.JEST_WORKER_ID !== 'undefined';

      if (isRunningInJest) {
        // En pruebas, usar un log de nivel inferior o ninguno para evitar mensajes de error en los logs de prueba
        this.logger.debug(
          `Prueba simulando error de S3 para Bucket: ${bucketName}, Key: ${s3Key}`,
        );
      } else {
        this.logger.error(
          `Error al subir archivo a S3 (Bucket: ${bucketName}, Key: ${s3Key}):`,
          error,
        );
      }

      // Si falla S3, intentar subir al almacenamiento local como respaldo
      this.logger.log(
        'Intentando subir al almacenamiento local como respaldo...',
      );
      return this.uploadToLocalStorage(fileBuffer, fileName, destinationPath);
    }
  }

  /**
   * Guarda un archivo en el almacenamiento local de respaldo
   */
  private async uploadToLocalStorage(
    fileBuffer: Buffer,
    fileName: string,
    destinationPath: string,
  ): Promise<string> {
    // Crear subdirectorio si es necesario
    const subDir = path.resolve(
      process.cwd(),
      this.fallbackDir,
      destinationPath,
    );
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }

    const filePath = path.resolve(subDir, fileName);

    try {
      fs.writeFileSync(filePath, fileBuffer);
      this.logger.log(`Archivo guardado localmente en: ${filePath}`);

      // Devolver una ruta relativa para que sea accesible desde la aplicación
      // Esta URL dependerá de cómo expongas los archivos estáticos en tu aplicación
      const relativePath = path.join('uploads', destinationPath, fileName);
      return `/storage/${relativePath}`;
    } catch (error) {
      this.logger.error(
        `Error al guardar archivo localmente: ${error.message}`,
      );
      throw new Error(
        `No se pudo guardar el archivo en el almacenamiento local: ${error.message}`,
      );
    }
  }
}
