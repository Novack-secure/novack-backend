import { Module } from "@nestjs/common";
import { RedisDatabaseService } from "./redis.database.service";
import { RedisDatabaseController } from "./redis.database.controller";
import { ConfigModule } from "@nestjs/config";
import { TokenModule } from "../../../application/modules/token.module";

/**
 * Módulo para la gestión de la conexión a Redis
 * Las credenciales se obtienen de variables de entorno
 */
@Module({
	imports: [
    ConfigModule,
    TokenModule,
	],
	providers: [RedisDatabaseService],
	controllers: [RedisDatabaseController],
	exports: [RedisDatabaseService],
})
export class RedisDatabaseModule {}
