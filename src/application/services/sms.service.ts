import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Twilio } from "twilio";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";

@Injectable()
export class SmsService {
	private twilioClient: Twilio | null = null;
	private twilioFromPhoneNumber: string | undefined;
	private isInitialized = false;

	constructor(
		private readonly configService: ConfigService,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("SmsService");

		const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
		const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
		this.twilioFromPhoneNumber = this.configService.get<string>(
			"TWILIO_FROM_PHONE_NUMBER",
		);

		if (!accountSid || !authToken || !this.twilioFromPhoneNumber) {
			this.logger.error(
				"Twilio configuration is incomplete (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_PHONE_NUMBER is missing). SMS sending will be disabled.",
			);
			// No Twilio client initialized, isInitialized remains false
		} else {
			try {
				this.twilioClient = new Twilio(accountSid, authToken);
				this.isInitialized = true;
				this.logger.log("Twilio client initialized successfully.");
			} catch (error) {
				this.logger.error(
					"Failed to initialize Twilio client",
					undefined,
					JSON.stringify({ error: error.message }),
				);
				// isInitialized remains false
			}
		}
	}

	/**
	 * Sends an OTP code via SMS using Twilio.
	 * @param phoneNumber The recipient's phone number (should be in E.164 format).
	 * @param otp The One-Time Password to send.
	 * @throws InternalServerErrorException if SMS sending fails or Twilio client is not initialized.
	 */
	async sendOtp(phoneNumber: string, otp: string): Promise<void> {
		if (
			!this.isInitialized ||
			!this.twilioClient ||
			!this.twilioFromPhoneNumber
		) {
			this.logger.error(
				"Twilio client not initialized or configuration missing. Cannot send OTP SMS.",
			);
			throw new InternalServerErrorException(
				"SMS service is not configured properly.",
			);
		}

		const messageBody = `Your SP-CEDES OTP code is: ${otp}. This code will expire in 10 minutes.`;

		try {
			await this.twilioClient.messages.create({
				to: phoneNumber, // Ensure this is E.164 formatted for Twilio, e.g., +1234567890
				from: this.twilioFromPhoneNumber,
				body: messageBody,
			});
			this.logger.log(
				"OTP SMS sent successfully",
				undefined,
				JSON.stringify({ to: phoneNumber }),
			);
		} catch (error) {
			this.logger.error(
				"Failed to send OTP SMS via Twilio",
				undefined,
				JSON.stringify({
					to: phoneNumber,
					// Avoid logging full error object if it contains sensitive Twilio details in some cases
					// Log specific parts like error.message, error.code if available
					errorMessage: error.message,
					errorCode: error.code,
				}),
			);
			throw new InternalServerErrorException("Failed to send OTP SMS.");
		}
	}
}
