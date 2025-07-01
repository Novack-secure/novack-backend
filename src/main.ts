import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, HttpStatus, LogLevel } from '@nestjs/common'; // HttpStatus might be used by the filter
import { ConfigService } from '@nestjs/config';
// import { v4 as uuidv4 } from 'uuid'; // No longer directly used here for startupCorrelationId
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { StructuredLoggerService } from './infrastructure/logging/structured-logger.service';
import { GlobalExceptionFilter } from './infrastructure/filters/global-exception.filter';

async function bootstrap() {
  // Configurar nivel de logs según entorno
  const isSimpleLogging = process.env.SIMPLE_LOGGING === 'true';
  const logLevels: LogLevel[] = isSimpleLogging
    ? ['error', 'warn'] // Solo mostrar errores y advertencias en modo simple
    : ['log', 'error', 'warn', 'debug', 'verbose']; // Logs completos

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until a logger is attached
    logger: isSimpleLogging ? logLevels : undefined, // Usar logger básico si SIMPLE_LOGGING=true
  });

  // Aplicar el logger estructurado solo si no estamos en modo simple
  if (!isSimpleLogging) {
    const structuredLoggerService = await app.resolve(StructuredLoggerService);
    app.useLogger(structuredLoggerService);
  }

  app.flushLogs(); // Flush buffered logs using the newly set logger

  // Register the GlobalExceptionFilter solo si no estamos en modo simple
  if (!isSimpleLogging) {
    const structuredLoggerService = await app.resolve(StructuredLoggerService);
    app.useGlobalFilters(new GlobalExceptionFilter(structuredLoggerService));
  } else {
    // Usar un filtro global básico para los errores si estamos en modo simple
    app.useGlobalFilters(
      new GlobalExceptionFilter(new Logger('GlobalExceptionFilter')),
    );
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000); // Use config service for port

  // Usar el logger adecuado según el modo
  const logger = isSimpleLogging
    ? new Logger('Bootstrap')
    : await app.resolve(StructuredLoggerService);
  logger.log(`Aplicación iniciando en puerto ${port}`);

  const isProduction = process.env.NODE_ENV === 'production';

  // Configurar cookie parser para manejar cookies
  app.use(
    cookieParser(process.env.COOKIE_SECRET || 'secret_cookie_for_dev_only'),
  );

  // Aplicar helmet para seguridad de cabeceras HTTP
  app.use(helmet());

  // Configurar CSP para prevenir XSS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('Novack API')
      .setDescription('API REST para la aplicación de Novack')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-CSRF-TOKEN',
      'X-XSRF-TOKEN',
    ],
    exposedHeaders: ['Authorization', 'XSRF-TOKEN'],
    credentials: true,
    maxAge: 3600,
  });

  await app.listen(port);

  logger.log(`🚀 Novack API is up and running on port ${port}`);
}

bootstrap().catch((err) => {
  // Use console.error for bootstrap errors as logger might not be fully initialized
  // or if the error happens before logger setup.
  console.error('Error crítico durante el inicio de la aplicación:', err);
  process.exit(1);
});
