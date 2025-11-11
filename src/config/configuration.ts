import { registerAs } from "@nestjs/config";

export default registerAs("config", () => ({
	nodeEnv: process.env.NODE_ENV || "development",
	port: parseInt(process.env.PORT, 10) || 4000,
	database: {
		host: process.env.DB_HOST,
		port: parseInt(process.env.DB_PORT, 10) || 5432,
		username: process.env.DB_USERNAME,
		password: process.env.DB_PASSWORD,
		name: process.env.DB_NAME,
	},
	redis: {
		host: process.env.REDIS_HOST,
		port: parseInt(process.env.REDIS_PORT, 10) || 6379,
	},
	jwt: {
		secret: process.env.JWT_SECRET,
		expiresIn: process.env.JWT_EXPIRES_IN || "1d",
	},
	cors: {
		allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
			"http://localhost:3000",
		],
	},
	cookie: {
		secret: process.env.COOKIE_SECRET,
	},
  deepsee: {
    apiUrl: process.env.DEEPSEEK_API_URL,
    apiKey: process.env.DEEPSEEK_API_KEY,
  },
}));
