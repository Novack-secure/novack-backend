import {
	Controller,
	Get,
	Post,
	Body,
	Param,
	Delete,
	Query,
	UseGuards,
} from "@nestjs/common";
import { RedisDatabaseService } from "./redis.database.service";
import { AuthGuard } from "../../../application/guards/auth.guard";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("redis")
@Controller("redis")
@UseGuards(AuthGuard)
export class RedisDatabaseController {
	constructor(private readonly databaseService: RedisDatabaseService) {}

	@Get("health")
	@ApiOperation({ summary: "Verifica la conexión a Redis" })
	@ApiResponse({ status: 200, description: "Conexión exitosa a Redis" })
	testConnection() {
		return this.databaseService.testConnection();
	}

	@Get("chat/:roomId/messages")
	@ApiOperation({ summary: "Obtiene mensajes de chat desde la caché" })
	@ApiResponse({
		status: 200,
		description: "Mensajes de chat recuperados de caché",
	})
	getChatMessages(@Param("roomId") roomId: string, @Query("limit") limit = 50) {
		return this.databaseService.getChatMessages(roomId, +limit);
	}

	@Get("chat/room/:roomId")
	@ApiOperation({ summary: "Obtiene información de sala desde la caché" })
	@ApiResponse({
		status: 200,
		description: "Información de sala recuperada de caché",
	})
	getChatRoom(@Param("roomId") roomId: string) {
		return this.databaseService.getChatRoom(roomId);
	}

	@Get("card/:cardId/location")
	@ApiOperation({
		summary: "Obtiene la ubicación de una tarjeta desde la caché",
	})
	@ApiResponse({
		status: 200,
		description: "Ubicación de tarjeta recuperada de caché",
	})
	getCardLocation(@Param("cardId") cardId: string) {
		return this.databaseService.getCardLocation(cardId);
	}

	@Get("cards/nearby")
	@ApiOperation({ summary: "Obtiene tarjetas cercanas a unas coordenadas" })
	@ApiResponse({ status: 200, description: "Tarjetas cercanas recuperadas" })
	getNearbyCards(
		@Query("lat") latitude: number,
		@Query("lng") longitude: number,
		@Query("radius") radius = 100,
	) {
		return this.databaseService.getNearbyCards(+latitude, +longitude, +radius);
	}

	@Delete("cache")
	@ApiOperation({ summary: "Limpia toda la caché" })
	@ApiResponse({ status: 200, description: "Caché limpiada correctamente" })
	flushCache() {
		return this.databaseService.flushAll();
	}
}
