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
// import { DatabaseResetModule } from "./application/modules/database-reset.module"; // DESHABILITADO EN PRODUCCIÓN
import { ChatModule } from "./application/modules/chat.module";
import { DashboardModule } from "./application/modules/dashboard.module";
import { AppointmentModule } from "./application/modules/appointment.module";
import { UserPreferenceModule } from "./application/modules/user-preference.module";
import { CsrfModule } from "./application/modules/csrf.module";
import { EncryptionModule } from "./application/modules/encryption.module";
import { AuditModule } from "./application/modules/audit.module";
import { FormModule } from "./application/modules/form.module";
import { RoleModule } from "./application/modules/role.module";
import { PermissionModule } from "./application/modules/permission.module";
import { APP_INTERCEPTOR, Reflector } from "@nestjs/core";

import { DataMaskingInterceptor } from "./application/interceptors/data-masking.interceptor";
// import { RedisTestController } from "./infrastructure/database/redis/redis-test.controller"; // DESHABILITADO EN PRODUCCIÓN
import { LoggingModule } from "./infrastructure/logging/logging.module";
// import { LogstashModule } from "./infrastructure/services/logstash.module"; // DESHABILITADO EN PRODUCCIÓN
import { HealthModule } from "./application/modules/health.module";
import { TokenModule } from "./application/modules/token.module";
import configuration from "./config/configuration";
import { validate } from "./config/validation";
import { ReflectorModule } from "./application/modules/reflector.module";

/**
 * Root module of the application that configures and organizes all feature modules.
 * @module AppModule
 */
@Module({
	imports: [
		ReflectorModule,
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
		limit: process.env.NODE_ENV === 'development' ? 1000 : 5, // Más permisivo en desarrollo
		},
		{
		name: "api",
		ttl: 60000,
		limit: process.env.NODE_ENV === 'development' ? 1000 : 50, // Más permisivo en desarrollo
		},
		{
		name: "default",
		ttl: 60000,
		limit: process.env.NODE_ENV === 'development' ? 1000 : 100, // Más permisivo en desarrollo
		},
		]),
		// Programación de tareas

		ScheduleModule.forRoot(),

		PostgresqlDatabaseModule,
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
		RoleModule, // Role management
		PermissionModule, // Permission management

		// Communication modules
		EmailModule, // Email service integration
		EmailVerificationModule, // Email verification workflows
		ChatModule, // Chat service with WebSockets
		DashboardModule, // Dashboard statistics and analytics
		AppointmentModule, // Appointment management
		UserPreferenceModule, // User preferences and settings
		FormModule, // Dynamic form system for visitors

		// Maintenance modules (DISABLED IN PRODUCTION)
		// DatabaseResetModule NO SE DEBE USAR EN PRODUCCIÓN - Puede borrar toda la BD

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
		// LogstashModule DESHABILITADO EN PRODUCCIÓN - Solo para desarrollo
	],
	controllers: [
		// RedisTestController DESHABILITADO EN PRODUCCIÓN - Solo para testing
	],
	providers: [
		// Interceptor global para enmascarar datos sensibles
		// DESACTIVADO: No enmascarar datos en desarrollo
		// {
		// 	provide: APP_INTERCEPTOR,
		// 	useClass: DataMaskingInterceptor,
		// },
	],
})
export class AppModule {}
