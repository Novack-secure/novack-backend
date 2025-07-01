import { Controller, Get, Post, Body, Logger } from "@nestjs/common";
import { LogstashService } from "../../infrastructure/services/logstash.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Public } from "../../application/decorators/public.decorator";

interface LogMessage {
	message: string;
	level: string;
	context?: string;
	correlationId?: string;
}

@ApiTags("Logstash")
@Controller("logstash")
export class LogstashController {
	private readonly logger = new Logger(LogstashController.name);

	constructor(private readonly logstashService: LogstashService) {}

	@Public()
	@Get("status")
	@ApiOperation({ summary: "Obtener el estado de la conexión con Logstash" })
	getStatus() {
		const isConnected = this.logstashService.isLogstashConnected();
		return {
			status: isConnected ? "connected" : "disconnected",
			timestamp: new Date().toISOString(),
		};
	}

	@Public()
	@Post("test")
	@ApiOperation({ summary: "Enviar un mensaje de prueba a Logstash" })
	testLogstash(@Body() logMessage: LogMessage) {
		const { message, level, context, correlationId } = logMessage;

		this.logger.log(`Enviando mensaje de prueba a Logstash: ${message}`);
		const logLevel = level ? level.toLowerCase() : "info";

		switch (logLevel) {
			case "error":
				this.logstashService.error(message, undefined, context, correlationId);
				break;
			case "warn":
				this.logstashService.warn(message, context, correlationId);
				break;
			case "debug":
				this.logstashService.debug(message, context, correlationId);
				break;
			case "info":
			default:
				this.logstashService.info(message, context, correlationId);
				break;
		}

		return {
			sent: true,
			message: `Mensaje enviado a Logstash: ${message}`,
			timestamp: new Date().toISOString(),
		};
	}
}
