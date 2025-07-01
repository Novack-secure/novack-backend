import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LogstashService } from "./logstash.service";
import { LogstashController } from "../../interface/controllers/logstash.controller";

@Global()
@Module({
	imports: [ConfigModule],
	controllers: [LogstashController],
	providers: [LogstashService],
	exports: [LogstashService],
})
export class LogstashModule {}
