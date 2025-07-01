import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SmsService } from "../services/sms.service";
// StructuredLoggerService is expected to be globally available via LoggingModule,
// so it does not need to be explicitly imported or provided here unless LoggingModule is not global.

@Module({
	imports: [
		ConfigModule, // SmsService depends on ConfigService for Twilio credentials
	],
	providers: [SmsService],
	exports: [SmsService],
})
export class SmsModule {}
