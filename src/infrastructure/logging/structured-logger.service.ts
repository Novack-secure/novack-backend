import { Injectable, LoggerService, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AsyncLocalStorage } from "async_hooks";
import { v4 as uuidv4 } from "uuid";
import { LogTransportService } from "./log-transport.service";

export interface LogContext {
	correlationId?: string;
	userId?: string;
	requestPath?: string;
	[key: string]: any;
}

// Extender la definición de niveles de log para incluir 'none'
export type LogLevel = "debug" | "info" | "warn" | "error" | "verbose" | "none";

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements LoggerService {
	private static contextStorage = new AsyncLocalStorage<LogContext>();
	private context?: string;
	private static defaultLogLevel: LogLevel = "info";
	private static contextLogLevels: Record<string, LogLevel> = {};
	private static logTransport: LogTransportService;
	private static initialized = false;

	constructor(
		configService?: ConfigService, // Made optional as it's primarily for static init
		logTransport?: LogTransportService,
	) {
		if (!StructuredLoggerService.initialized && configService) {
			StructuredLoggerService.defaultLogLevel = configService.get<LogLevel>(
				"logging.level",
				"info",
			);
			StructuredLoggerService.contextLogLevels = configService.get<
				Record<string, LogLevel>
			>("logging.contextLogLevels", {});
			StructuredLoggerService.initialized = true;
		}
		// Allow logTransport to be set by any instance if not already set
		if (logTransport && !StructuredLoggerService.logTransport) {
			StructuredLoggerService.logTransport = logTransport;
		}
	}

	static getContextStorage(): AsyncLocalStorage<LogContext> {
		return this.contextStorage;
	}

	static createCorrelationId(): string {
		return uuidv4();
	}

	static getCurrentContext(): LogContext {
		return this.contextStorage.getStore() || {};
	}

	static setContext(context: LogContext): void {
		const currentContext = this.contextStorage.getStore() || {};
		this.contextStorage.enterWith({ ...currentContext, ...context });
	}

	setContext(context: string): void {
		this.context = context;
	}

	// Helper to determine if a message should be logged based on level and context
	private shouldLog(
		level: "debug" | "info" | "warn" | "error" | "verbose",
		context?: string,
	): boolean {
		const contextName = context || this.context || "Global";
		const contextLevel =
			StructuredLoggerService.contextLogLevels[contextName] ||
			StructuredLoggerService.defaultLogLevel;

		// Si el nivel configurado es 'none', no se registra ningún mensaje
		if (
			contextLevel === "none" ||
			StructuredLoggerService.defaultLogLevel === "none"
		) {
			return false;
		}

		const levelPriority = { verbose: 0, debug: 1, info: 2, warn: 3, error: 4 };

		return (
			levelPriority[level] >=
			levelPriority[contextLevel as Exclude<LogLevel, "none">]
		);
	}

	private formatLog(
		level: string,
		message: any,
		context?: string,
		...meta: any[]
	): any {
		const currentContext = StructuredLoggerService.getCurrentContext();
		const timestamp = new Date().toISOString();
		const contextName = context || this.context || "Global";
		const correlationId = currentContext.correlationId || "no-correlation-id";
		let stackTrace: string | undefined;
		const remainingMeta = [];

		if (level === "error") {
			for (const item of meta) {
				if (
					item &&
					typeof item === "object" &&
					item.hasOwnProperty("stack_trace")
				) {
					stackTrace = item.stack_trace;
				} else {
					remainingMeta.push(item);
				}
			}
		} else {
			remainingMeta.push(...meta);
		}

		const logEntry: any = {
			timestamp,
			level,
			message: typeof message === "object" ? JSON.stringify(message) : message,
			context: contextName,
			correlationId,
			...currentContext, // Includes userId, requestPath etc. from async local storage
		};

		if (stackTrace) {
			logEntry.stack_trace = stackTrace;
		}

		if (remainingMeta.length > 0) {
			logEntry.meta = remainingMeta;
		}

		return logEntry;
	}

	private sendLog(formattedLog: any): void {
		if (StructuredLoggerService.logTransport) {
			StructuredLoggerService.logTransport.sendLog(formattedLog);
		} else {
			// Fallback a console si no hay transporte configurado
			// Ensure this fallback is also structured if possible, or at least consistent.
			console.log(JSON.stringify(formattedLog));
		}
	}

	log(message: any, context?: string, ...meta: any[]): void {
		if (this.shouldLog("info", context)) {
			const formattedLog = this.formatLog("info", message, context, ...meta);
			this.sendLog(formattedLog);
		}
	}

	debug(message: any, context?: string, ...meta: any[]): void {
		if (this.shouldLog("debug", context)) {
			const formattedLog = this.formatLog("debug", message, context, ...meta);
			this.sendLog(formattedLog);
		}
	}

	warn(message: any, context?: string, ...meta: any[]): void {
		if (this.shouldLog("warn", context)) {
			const formattedLog = this.formatLog("warn", message, context, ...meta);
			this.sendLog(formattedLog);
		}
	}

	error(message: any, context?: string, trace?: string, ...meta: any[]): void {
		if (this.shouldLog("error", context)) {
			// Pass trace explicitly in the meta array for formatLog to identify
			const errorMeta = trace ? [...meta, { stack_trace: trace }] : [...meta];
			const formattedLog = this.formatLog(
				"error",
				message,
				context,
				...errorMeta,
			);
			this.sendLog(formattedLog);
		}
	}

	verbose(message: any, context?: string, ...meta: any[]): void {
		if (this.shouldLog("verbose", context)) {
			const formattedLog = this.formatLog("verbose", message, context, ...meta);
			this.sendLog(formattedLog);
		}
	}
}
