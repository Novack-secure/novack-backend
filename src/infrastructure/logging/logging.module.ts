import {
	Module,
	Global,
	NestModule,
	MiddlewareConsumer,
	Logger,
} from "@nestjs/common";
import { StructuredLoggerService } from "./structured-logger.service";
import { CorrelationIdMiddleware } from "./correlation-id.middleware";
import { RequestLoggingMiddleware } from "./request-logging.middleware"; // Import new middleware
import { LogTransportService } from "./log-transport.service";
import { ConfigModule } from "@nestjs/config";

@Global()
@Module({
	imports: [ConfigModule],
	providers: [
		LogTransportService,
		StructuredLoggerService,
		Logger,
		// RequestLoggingMiddleware is not listed here as a provider
		// because it will be instantiated by NestJS when consumer.apply() is called.
		// However, StructuredLoggerService needs to be available for its constructor.
	],
	exports: [StructuredLoggerService, LogTransportService, Logger],
})
export class LoggingModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
		consumer
			.apply(CorrelationIdMiddleware, RequestLoggingMiddleware) // Apply CorrelationId first, then RequestLogging
			.forRoutes("*");
	}
}
