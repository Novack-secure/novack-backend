import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module'; // Adjust path if main AppModule is elsewhere
import { ConfigService } from '@nestjs/config'; // For port, if needed
import helmet from 'helmet'; // Import helmet
import * as cookieParser from 'cookie-parser'; // Import cookie-parser

describe('AppController (E2E)', () => {
  let app: INestApplication;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = app.get(ConfigService); // Get ConfigService for port

    // Apply global configurations similar to main.ts
    // 1. Helmet
    app.use(helmet());

    // 2. Cookie Parser (if used, secrets should align with main.ts or be test-specific)
    app.use(cookieParser(configService.get<string>('COOKIE_SECRET')));

    // 3. Global Pipes (ValidationPipe)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // 4. API Versioning (if used in main.ts)
    // Example:
    // app.enableVersioning({
    //   type: VersioningType.URI,
    //   prefix: 'v',
    //   defaultVersion: '1',
    // });

    // 5. CORS (if specific config needed beyond NestJS defaults for testing)
    // app.enableCors({
    //   origin: configService.get<string>('ALLOWED_ORIGINS')?.split(',') || ['http://localhost:3000'],
    //   credentials: true,
    //   // ... other CORS options from main.ts
    // });

    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health') // Standard health check endpoint
      .expect(200)
      .then((response) => {
        // Default NestJS HealthModule structure
        expect(response.body).toBeInstanceOf(Object);
        expect(response.body.status).toEqual('ok'); // Common status
        expect(response.body.info).toBeDefined(); // Contains details of health indicators
        // Example check for a specific indicator if you have one, e.g., database
        // expect(response.body.info.database.status).toEqual('up');
      });
  });

  it('/ (GET) - Root path should return 404 if not defined', () => {
    // This test assumes your app does not have a GET handler for '/'.
    // If it does, adjust the expected status code and response.
    return request(app.getHttpServer()).get('/').expect(404);
  });

  // Example of testing a non-existent route
  it('/non-existent-route (GET) - Should return 404', () => {
    return request(app.getHttpServer())
      .get('/non-existent-route-for-e2e-test')
      .expect(404);
  });

  afterAll(async () => {
    await app.close();
  });
});
