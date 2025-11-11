import { registerAs } from "@nestjs/config";

/**
 * Configuración de logging
 * Los niveles de log soportados son: 'verbose' | 'debug' | 'info' | 'warn' | 'error' | 'none'
 * El nivel 'none' desactiva completamente el logging
 */
export default registerAs("logging", () => {
	const contextLogLevels: Record<string, string> = {};
	for (const key in process.env) {
		if (key.startsWith("LOG_LEVEL_CONTEXT_")) {
			const contextName = key.substring("LOG_LEVEL_CONTEXT_".length);
			if (contextName && process.env[key]) {
				contextLogLevels[contextName] = process.env[key]!;
			}
		}
	}

	return {
		level: process.env.LOG_LEVEL || "info",
		fileEnabled: process.env.LOG_TO_FILE === "true",
		elk: {
			enabled: process.env.ELK_ENABLED === "true",
			host: process.env.ELK_HOST || "http://localhost:9200",
		},
		application: {
			name: process.env.APP_NAME || "novack-backend",
			environment: process.env.NODE_ENV || "development",
		},
		contextLogLevels, // Add the new context-specific log levels
	};
});
