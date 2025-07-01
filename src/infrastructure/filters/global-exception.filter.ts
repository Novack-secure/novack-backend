import {
	ExceptionFilter,
	Catch,
	ArgumentsHost,
	HttpException,
	HttpStatus,
	LoggerService,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch() // Catch all exceptions
export class GlobalExceptionFilter implements ExceptionFilter {
	constructor(private readonly logger: LoggerService) {}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();
		const request = ctx.getRequest<Request>();

		let statusCode: number;
		let errorMessage: string | object;
		let internalMessage: string; // For logging, potentially more detailed

		if (exception instanceof HttpException) {
			statusCode = exception.getStatus();
			const exceptionResponse = exception.getResponse();
			errorMessage =
				typeof exceptionResponse === "string"
					? { message: exceptionResponse }
					: exceptionResponse;
			internalMessage = exception.message;
		} else if (exception instanceof Error) {
			statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
			errorMessage = {
				message: "Internal server error. Please try again later.",
			};
			internalMessage = exception.message;
		} else {
			statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
			errorMessage = { message: "An unexpected error occurred." };
			internalMessage = "Unexpected error without a message.";
		}

		const stackTrace =
			(exception as Error)?.stack || "No stack trace available";

		// Log the error using LoggerService
		this.logger.error(
			`${internalMessage} - ${request.method} ${request.url}`, // Log message
			stackTrace, // Stack trace
			"GlobalExceptionFilter", // Context
		);

		// Construct the JSON response for the client
		const responseBody = {
			statusCode: statusCode,
			timestamp: new Date().toISOString(),
			path: request.url,
			...(typeof errorMessage === "string"
				? { message: errorMessage }
				: errorMessage),
		};

		response.status(statusCode).json(responseBody);
	}
}
