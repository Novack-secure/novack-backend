import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FileStorageService } from '../file-storage.service';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Mock completo del módulo AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  class MockS3Client {
    send = jest.fn();
  }
  class PutObjectCommand {
    constructor(params) {
      return { ...params };
    }
  }
  class ListBucketsCommand {
    constructor(params) {
      return { ...params };
    }
  }
  return {
    S3Client: MockS3Client,
    PutObjectCommand,
    ListBucketsCommand,
  };
});

jest.mock('fs');
jest.mock('path');

describe('FileStorageService', () => {
  let service: FileStorageService;
  let mockConfigService: Partial<ConfigService>;
  let mockS3Client: jest.Mocked<any>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'AWS_REGION':
            return 'us-east-1';
          case 'AWS_ACCESS_KEY_ID':
            return 'test-key';
          case 'AWS_SECRET_ACCESS_KEY':
            return 'test-secret';
          case 'LOCAL_STORAGE_PATH':
            return 'storage/uploads';
          case 'USE_LOCAL_STORAGE':
            return 'false';
          default:
            return undefined;
        }
      }),
    };

    // Configurando mocks para fs
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock) = jest.fn();
    (fs.writeFileSync as jest.Mock) = jest.fn();
    (path.resolve as jest.Mock).mockReturnValue('/path/to/storage');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileStorageService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FileStorageService>(FileStorageService);

    // Acceder al cliente S3 interno y configurar su mock
    mockS3Client = (service as any).s3Client;
    mockS3Client.send.mockResolvedValue({});
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    const mockFile = {
      buffer: Buffer.from('test file content'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
    };

    const mockBucketName = 'test-bucket';
    const mockDestinationPath = 'test/';

    it('should successfully upload a file to S3 when S3 is available', async () => {
      // Configurar que S3 está disponible
      (service as any).s3Available = true;
      mockS3Client.send.mockResolvedValue({});

      const result = await service.uploadFile(
        mockBucketName,
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
        mockDestinationPath,
      );

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(result).toMatch(
        new RegExp(
          `^https://${mockBucketName}.s3.us-east-1.amazonaws.com/${mockDestinationPath}.*\\.jpg$`,
        ),
      );
    });

    it('should use local storage when S3 is not available', async () => {
      // Configurar que S3 no está disponible
      (service as any).s3Available = false;
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.uploadFile(
        mockBucketName,
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
        mockDestinationPath,
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toMatch(/^\/storage\/.*/);
    });

    it('should use local storage when explicitly configured', async () => {
      // Configurar para usar almacenamiento local explícitamente
      (service as any).useFallbackStorage = true;
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.uploadFile(
        mockBucketName,
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
        mockDestinationPath,
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toMatch(/^\/storage\/.*/);
    });

    it('should fall back to local storage if S3 upload fails', async () => {
      // Configurar que S3 está disponible pero fallará al subir
      (service as any).s3Available = true;
      mockS3Client.send.mockRejectedValue(new Error('S3 Error'));
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.uploadFile(
        mockBucketName,
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
        mockDestinationPath,
      );

      expect(mockS3Client.send).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toMatch(/^\/storage\/.*/);
    });

    it('should generate a unique filename for each upload', async () => {
      // Configurar que S3 está disponible
      (service as any).s3Available = true;
      mockS3Client.send.mockResolvedValue({});

      const firstUpload = await service.uploadFile(
        mockBucketName,
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
        mockDestinationPath,
      );

      const secondUpload = await service.uploadFile(
        mockBucketName,
        mockFile.buffer,
        mockFile.originalname,
        mockFile.mimetype,
        mockDestinationPath,
      );

      expect(firstUpload).not.toEqual(secondUpload);
    });
  });
});
