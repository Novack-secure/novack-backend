import { ConfigService } from '@nestjs/config';

// Mock de variables de entorno para pruebas
process.env.AWS_REGION = 'us-east-1';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRATION = '1d';

// Mock global de ConfigService
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn((key: string) => {
      switch (key) {
        case 'AWS_REGION':
          return process.env.AWS_REGION;
        case 'JWT_SECRET':
          return process.env.JWT_SECRET;
        case 'JWT_EXPIRATION':
          return process.env.JWT_EXPIRATION;
        default:
          return undefined;
      }
    }),
  })),
}));
