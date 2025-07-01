import { Logger } from '@nestjs/common';

export function validate(config: Record<string, unknown>) {
  const logger = new Logger('ConfigValidation');
  const requiredKeys = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_NAME',
    'REDIS_HOST',
    'REDIS_PORT',
    'JWT_SECRET',
    'COOKIE_SECRET',
  ];

  for (const key of requiredKeys) {
    if (!config[key]) {
      logger.error(`Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }

  return config;
}
