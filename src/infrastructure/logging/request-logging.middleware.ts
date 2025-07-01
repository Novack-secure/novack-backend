import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { StructuredLoggerService } from "./structured-logger.service";

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
	constructor(private readonly logger: StructuredLoggerService) {
		// Set a specific context for this logger instance if desired
		// this.logger.setContext('RequestLoggingMiddleware');
		// Alternatively, pass context directly in log calls
	}

	use(req: Request, res: Response, next: NextFunction): void {
		const startTime = Date.now();
		const { method, originalUrl, ip } = req;
		const userAgent = req.get("user-agent") || "";

		// Log incoming request
		// CorrelationId will be automatically picked up from AsyncLocalStorage by StructuredLoggerService
		this.logger.log(
			`Incoming request: ${method} ${originalUrl}`,
			"RequestLoggingMiddleware", // Context
			{
				method,
				originalUrl,
				ip,
				userAgent,
			},
		);

		res.on("finish", () => {
			const durationMs = Date.now() - startTime;
			const { statusCode } = res;

			this.logger.log(
				`Request completed: ${method} ${originalUrl} - ${statusCode} [${durationMs}ms]`,
				"RequestLoggingMiddleware", // Context
				{
					method,
					originalUrl,
					statusCode,
					durationMs,
					ip, // Optional: log ip again on completion, or rely on incoming log
					userAgent, // Optional: log userAgent again
				},
			);
		});

		next();
	}
}
