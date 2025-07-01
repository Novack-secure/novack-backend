import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Algorithm } from "jsonwebtoken";

/**
 * Módulo de configuración de JWT con seguridad avanzada
 * Incluye configuración de expiración, audiencia, emisor y políticas de seguridad
 */
@Module({
	imports: [
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				const environment = configService.get<string>(
					"NODE_ENV",
					"development",
				);
				const isDevelopment = environment === "development";

				return {
					secret: configService.get<string>("JWT_SECRET", "supersecret"),
					signOptions: {
						expiresIn: configService.get<string>("JWT_EXPIRATION", "12h"),
						// Agregar audiencia y emisor para mejorar la seguridad del token
						audience: configService.get<string>(
							"JWT_AUDIENCE",
							"https://api.spcedes.com",
						),
						issuer: configService.get<string>("JWT_ISSUER", "SPCEDES_API"),
						// Usar algoritmo más seguro si se especifica una clave privada/pública
						algorithm: configService.get<Algorithm>("JWT_ALGORITHM", "HS256"),
					},
					verifyOptions: {
						// Obligar verificación de audiencia y emisor
						audience: configService.get<string>(
							"JWT_AUDIENCE",
							"https://api.spcedes.com",
						),
						issuer: configService.get<string>("JWT_ISSUER", "SPCEDES_API"),
						// Configuración más estricta en producción
						ignoreExpiration: isDevelopment,
						ignoreNotBefore: isDevelopment,
					},
				};
			},
		}),
	],
	exports: [JwtModule],
})
export class JwtConfigModule {}
