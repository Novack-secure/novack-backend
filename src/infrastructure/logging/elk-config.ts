import { ConfigService } from "@nestjs/config";

export interface ElkConfig {
	enabled: boolean;
	elasticsearchHost: string;
	logstashHost: string;
	logstashPort: number;
	applicationName: string;
	environment: string;
}

export const getElkConfig = (configService: ConfigService): ElkConfig => {
	return {
		enabled: configService.get<string>("ELK_ENABLED", "false") === "true",
		elasticsearchHost: configService.get<string>(
			"ELASTICSEARCH_HOST",
			"http://elasticsearch:9200",
		),
		logstashHost: configService.get<string>("LOGSTASH_HOST", "logstash"),
		logstashPort: parseInt(configService.get<string>("LOGSTASH_PORT", "50000")),
		applicationName: configService.get<string>("APP_NAME", "novack-backend"),
		environment: configService.get<string>("NODE_ENV", "development"),
	};
};
