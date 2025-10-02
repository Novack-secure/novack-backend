import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { 
  Employee,
  Supplier, 
  Card,
  Visitor, 
  ChatRoom,
  ChatMessage,
  AuditLog,
	LoginAttempt,
	CardLocation,
	Appointment,
	SupplierSubscription,
	RefreshToken,
} from '../../../domain/entities';
import { EmployeeCredentials } from '../../../domain/entities/employee-credentials.entity';
import { PostgresqlDatabaseService } from './postgresql.database.service';
import { PostgresqlDatabaseController } from './postgresql.database.controller';

/**
 * Lista de entidades que se utilizan en la base de datos
 */
const entities = [
	LoginAttempt,
	CardLocation,	
  Employee,
  EmployeeCredentials,
  Supplier,
  Card,
  Visitor,
  ChatRoom,
  ChatMessage,
  AuditLog,
  Appointment,
  SupplierSubscription,
  RefreshToken,
];

/**
 * Módulo global para la conexión a PostgreSQL
 * Las credenciales se obtienen de variables de entorno
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_NAME'),
          entities: entities,
          synchronize: configService.get('NODE_ENV') !== 'production',
          logging: configService.get('NODE_ENV') === 'development',
          ssl: configService.get('DB_SSL') === 'true',
        };
      },
    }),
  ],
  controllers: [PostgresqlDatabaseController],
  providers: [PostgresqlDatabaseService],
  exports: [PostgresqlDatabaseService, TypeOrmModule],
})
export class PostgresqlDatabaseModule {}
