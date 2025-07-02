import { Module, forwardRef } from "@nestjs/common";
import { RedisDatabaseService } from "./redis.database.service";
import { RedisDatabaseController } from "./redis.database.controller";
import { ConfigModule } from "@nestjs/config";
import { ConfigService } from "@nestjs/config";
import { AuthModule } from "../../../application/modules/auth.module";
import { TokenModule } from "../../../application/modules/token.module";

/**
 * Módulo para la gestión de la conexión a Redis
 * Las credenciales se obtienen de variables de entorno
 */
@Module({
	imports: [
		ConfigModule, 
		AuthModule, 
		TokenModule
	],
	providers: [RedisDatabaseService],
	controllers: [RedisDatabaseController],
	exports: [RedisDatabaseService],
})
export class RedisDatabaseModule {}
