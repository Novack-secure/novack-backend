/* @fileoverview Main application module that coordinates all feature modules and core configurations.
 * This module serves as the root module of the SP Cedes backend application.
 */

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
// import { MailerModule } from '@nestjs-modules/mailer';
import { JwtModule } from "@nestjs/jwt";
import { PostgresqlDatabaseModule } from "./infrastructure/database/postgres/postgresql.database.module";
import { SupplierModule } from "./application/modules/supplier.module";
import { CardModule } from "./application/modules/card.module";
import { EmployeeModule } from "./application/modules/employee.module";
import { VisitorModule } from "./application/modules/visitor.module";
import { ThrottlerModule } from "@nestjs/throttler";
import { SecurityModule } from "./application/modules/security.module";
import { EmailModule } from "./application/modules/email.module";
import { AuthModule } from "./application/modules/auth.module";
import { TwoFactorAuthModule } from "./application/modules/two-factor-auth.module";
import { EmailVerificationModule } from "./application/modules/email-verification.module";
import { RedisDatabaseModule } from "./infrastructure/database/redis/redis.database.module";
import { CardSchedulerModule } from "./application/modules/card-scheduler.module";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseResetModule } from "./application/modules/database-reset.module";
import { ChatModule } from "./application/modules/chat.module";
import { CsrfModule } from "./application/modules/csrf.module";
import { EncryptionModule } from "./application/modules/encryption.module";
import { AuditModule } from "./application/modules/audit.module";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { DataMaskingInterceptor } from "./application/interceptors/data-masking.interceptor";
import { RedisTestController } from "./interface/controllers/redis-test.controller";
import { LoggingModule } from "./infrastructure/logging/logging.module";
import { LogstashModule } from "./infrastructure/services/logstash.module";
import { HealthModule } from "./application/modules/health.module";
import { TokenModule } from "./application/modules/token.module";
import configuration from "./config/configuration";
import { validate } from "./config/validation";

/**
 * Root module of the application that configures and organizes all feature modules.
 * @module AppModule
 */
@Module({
	imports: [
		// Global configuration module for environment variables
		ConfigModule.forRoot({
			load: [configuration],
			isGlobal: true,
			validate,
		}),
		// Rate limiting configuration to prevent abuse
		ThrottlerModule.forRoot([
			{
				name: "login",
				ttl: 60000, // 1 minuto en milisegundos
				limit: 5, // 5 intentos por minuto
			},
			{
				name: "api",
				ttl: 60000,
				limit: 20,
			},
			{
				name: "default",
				ttl: 60000,
				limit: 10,
			},
		]),
		// Programación de tareas
		ScheduleModule.forRoot(),

		// Database and infrastructure modules
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const dbConfig = configService.get("config.database");
				return {
					type: "postgres",
					host: dbConfig.host,
					port: dbConfig.port,
					username: dbConfig.username,
					password: dbConfig.password,
					database: dbConfig.name,
					autoLoadEntities: true,
					synchronize: configService.get("config.nodeEnv") !== "production",
				};
			},
		}),
		RedisDatabaseModule,

		// Core business modules
		EmployeeModule, // Employee management and profiles
		CardModule, // Access card management
		VisitorModule, // Visitor registration and tracking
		SupplierModule, // Supplier management
		CardSchedulerModule, // Automated card assignment and tracking
		// CompanyModule,
		// ServiceModule,

		// Security and authentication modules
		EncryptionModule, // Cifrado de datos sensibles
		SecurityModule, // General security configurations
		AuthModule, // Authentication and authorization
		TwoFactorAuthModule, // Two-factor authentication
		CsrfModule, // CSRF protection
		AuditModule, // Auditoría de accesos
		TokenModule, // Token management

		// Communication modules
		EmailModule, // Email service integration
		EmailVerificationModule, // Email verification workflows
		ChatModule, // Chat service with WebSockets

		// Maintenance modules
		DatabaseResetModule, // Database reset functionality (development only)

		// Healthcheck module
		HealthModule,

		// Additional modules
		/*
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useClass: MAIL_CONFIG,
    }),
    */
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const jwtConfig = configService.get("config.jwt");
				return {
					secret: jwtConfig.secret,
					signOptions: { expiresIn: jwtConfig.expiresIn },
				};
			},
		}),
		LoggingModule,
		LogstashModule, // Nuevo módulo para gestionar conexión con Logstash
	],
	controllers: [RedisTestController],
	providers: [
		// Interceptor global para enmascarar datos sensibles
		{
			provide: APP_INTERCEPTOR,
			useClass: DataMaskingInterceptor,
		},
	],
})
export class AppModule {}
