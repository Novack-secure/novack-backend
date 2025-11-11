import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as net from "net";
import * as fs from "fs";
import * as path from "path";
import { ElkConfig } from "./elk-config";

@Injectable()
export class LogTransportService implements OnModuleInit, OnModuleDestroy {
	private logstashClient: net.Socket | null = null;
	private fileTransport = false;
	private elkConfig: ElkConfig;
	private logDir: string;
	private currentLogStream: fs.WriteStream | null = null;
	private currentLogDate: string = "";
	private isConnecting = false;
	private connectionAttempts = 0;
	private maxConnectionAttempts = 10;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private logQueue: any[] = [];
	private maxQueueSize = 1000;
	private failSafe: boolean;
	private fallbackToConsole: boolean;

	constructor(private configService: ConfigService) {
		const environment = this.configService.get<string>(
			"NODE_ENV",
			"development",
		);

		// Modificar el host de Logstash basado en el entorno
		const logstashHost =
			environment === "development" && !process.env.DOCKER_CONTAINER
				? "localhost"
				: this.configService.get<string>("LOGSTASH_HOST", "logstash");

		this.elkConfig = {
			enabled:
				this.configService.get<string>("ELK_ENABLED", "false") === "true",
			elasticsearchHost: this.configService.get<string>(
				"ELASTICSEARCH_HOST",
				"http://elasticsearch:9200",
			),
			logstashHost: logstashHost,
			logstashPort: parseInt(
				this.configService.get<string>("LOGSTASH_PORT", "50000"),
			),
			applicationName: this.configService.get<string>(
				"APP_NAME",
				"novack-backend",
			),
			environment: environment,
		};

		this.logDir = path.join(process.cwd(), "logs");
		this.fileTransport =
			configService.get<string>("LOG_TO_FILE", "true") === "true";
		this.failSafe =
			configService.get<string>("ELK_FAIL_SAFE", "true") === "true";
		this.fallbackToConsole =
			configService.get<string>("LOG_FALLBACK_CONSOLE", "true") === "true";

		console.log(
			`LogTransport configurado: logstash=${this.elkConfig.logstashHost}:${this.elkConfig.logstashPort}, elk=${this.elkConfig.enabled}, failSafe=${this.failSafe}`,
		);
	}

	async onModuleInit() {
		if (this.fileTransport) {
			this.ensureLogDirectoryExists();
		}

		if (this.elkConfig.enabled) {
			// Iniciar conexión de forma asíncrona sin bloquear la inicialización
			setImmediate(() => this.connectToLogstash());
		}
	}

	async onModuleDestroy() {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}

		if (this.logstashClient) {
			this.logstashClient.destroy();
		}

		if (this.currentLogStream) {
			this.currentLogStream.end();
		}
	}

	private ensureLogDirectoryExists() {
		try {
			if (!fs.existsSync(this.logDir)) {
				fs.mkdirSync(this.logDir, { recursive: true });
			}
		} catch (error) {
			console.error(`Error al crear directorio de logs: ${error.message}`);
		}
	}

	private async connectToLogstash() {
		if (
			this.isConnecting ||
			this.connectionAttempts >= this.maxConnectionAttempts ||
			(this.logstashClient && this.logstashClient.writable)
		) {
			return;
		}

		this.isConnecting = true;
		this.connectionAttempts++;

		try {
			const { logstashHost, logstashPort } = this.elkConfig;

			if (this.elkConfig.environment === "development") {
				console.log(
					`Intento ${this.connectionAttempts}/${this.maxConnectionAttempts} de conexión a Logstash: ${logstashHost}:${logstashPort}`,
				);
			}

			this.logstashClient = new net.Socket();

			this.logstashClient.connect(logstashPort, logstashHost, () => {
				if (this.elkConfig.environment === "development") {
					console.log(
						`✅ Conectado a Logstash en ${logstashHost}:${logstashPort}`,
					);
				}
				this.connectionAttempts = 0; // Reset counter on successful connection
				this.isConnecting = false;
				this.processLogQueue();
			});

			this.logstashClient.on("error", (err) => {
				console.error(
					`❌ Error en conexión con Logstash (intento ${this.connectionAttempts}): ${err.message}`,
				);
				this.handleConnectionError();
			});

			this.logstashClient.on("close", () => {
				if (this.logstashClient && this.logstashClient.writable) {
					console.log(
						`🔌 Conexión con Logstash cerrada (intento ${this.connectionAttempts})`,
					);
				}
				this.logstashClient = null;
				this.scheduleReconnection();
			});
		} catch (error) {
			console.error(
				`💥 Error al intentar conectar con Logstash: ${error.message}`,
			);
			this.handleConnectionError();
		}
	}

	private handleConnectionError() {
		this.isConnecting = false;

		if (this.logstashClient) {
			this.logstashClient.destroy();
			this.logstashClient = null;
		}

		this.scheduleReconnection();
	}

	private scheduleReconnection() {
		if (this.connectionAttempts >= this.maxConnectionAttempts) {
			console.error(
				`🚫 Máximo número de intentos de conexión alcanzado (${this.maxConnectionAttempts}). Deshabilitando ELK.`,
			);
			this.elkConfig.enabled = false;
			this.processLogQueue(); // Procesar cola pendiente con fallback
			return;
		}

		const delay = Math.min(5000 * this.connectionAttempts, 30000);
		console.log(`⏳ Reintentando conexión a Logstash en ${delay / 1000}s...`);

		this.reconnectTimeout = setTimeout(() => {
			this.connectToLogstash();
		}, delay);
	}

	private processLogQueue() {
		while (this.logQueue.length > 0) {
			const logData = this.logQueue.shift();
			this.sendLogNow(logData);
		}
	}

	private getLogStream(): fs.WriteStream | null {
		try {
			const today = new Date().toISOString().split("T")[0];

			if (this.currentLogDate !== today || !this.currentLogStream) {
				if (this.currentLogStream) {
					this.currentLogStream.end();
				}

				this.currentLogDate = today;
				const logFilePath = path.join(this.logDir, `application-${today}.log`);
				this.currentLogStream = fs.createWriteStream(logFilePath, {
					flags: "a",
				});
			}

			return this.currentLogStream;
		} catch (error) {
			console.error(`Error al obtener stream de log: ${error.message}`);
			return null;
		}
	}

	sendLog(logData: any): void {
		const logWithMetadata = {
			...logData,
			application: this.elkConfig.applicationName,
			environment: this.elkConfig.environment,
			hostname: require("os").hostname(),
			pid: process.pid,
		};

		// Si ELK está habilitado pero no hay conexión, encolar
		if (
			this.elkConfig.enabled &&
			!this.logstashClient &&
			this.logQueue.length < this.maxQueueSize
		) {
			this.logQueue.push(logWithMetadata);
			return;
		}

		this.sendLogNow(logWithMetadata);
	}

	private sendLogNow(logWithMetadata: any): void {
		const logString = JSON.stringify(logWithMetadata);
		let logSent = false;

		// Intentar enviar a Logstash si está disponible
		if (
			this.elkConfig.enabled &&
			this.logstashClient &&
			this.logstashClient.writable
		) {
			try {
				this.logstashClient.write(logString + "\n");
				logSent = true;
			} catch (error) {
				console.error(`Error al enviar log a Logstash: ${error.message}`);
			}
		}

		// Escribir en archivo si está habilitado
		if (this.fileTransport) {
			try {
				const logStream = this.getLogStream();
				if (logStream) {
					logStream.write(logString + "\n");
					logSent = true;
				}
			} catch (error) {
				console.error(`Error al escribir log en archivo: ${error.message}`);
			}
		}

		// Fallback a consola si está habilitado y no se envió por otros medios
		if (
			(this.fallbackToConsole && (!logSent || !this.elkConfig.enabled)) ||
			this.elkConfig.environment === "development"
		) {
			console.log(logString);
		}
	}

	// Método para verificar el estado de la conexión
	isLogstashConnected(): boolean {
		return this.logstashClient !== null && this.logstashClient.writable;
	}

	// Método para obtener estadísticas
	getStats() {
		return {
			elkEnabled: this.elkConfig.enabled,
			logstashConnected: this.isLogstashConnected(),
			connectionAttempts: this.connectionAttempts,
			queueSize: this.logQueue.length,
			fileTransportEnabled: this.fileTransport,
		};
	}
}
