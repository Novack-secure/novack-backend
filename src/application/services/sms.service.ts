import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Twilio } from "twilio";
import { StructuredLoggerService } from "src/infrastructure/logging/structured-logger.service";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

@Injectable()
export class SmsService {
	private twilioClient: Twilio | null = null;
	private twilioFromPhoneNumber: string | undefined;
	private isInitialized = false;
  private provider: "twilio" | "sns" = "twilio";
  private snsClient: SNSClient | null = null;
  private snsSenderId?: string;
  private snsSmsType: "Transactional" | "Promotional" = "Transactional";

	constructor(
		private readonly configService: ConfigService,
		private readonly logger: StructuredLoggerService,
	) {
		this.logger.setContext("SmsService");

    this.provider = (this.configService.get<string>("SMS_PROVIDER") as any) || "twilio";
    if (this.provider === "sns") {
      const region = this.configService.get<string>("AWS_REGION") || process.env.AWS_REGION || "us-east-1";
      this.snsSenderId = this.configService.get<string>("SNS_SENDER_ID");
      this.snsSmsType = (this.configService.get<string>("SNS_SMS_TYPE") as any) || "Transactional";
      try {
        this.snsClient = new SNSClient({ region });
        this.isInitialized = true;
        this.logger.log("AWS SNS client initialized successfully.");
      } catch (error) {
        this.logger.error(
          "Failed to initialize AWS SNS client",
          undefined,
          JSON.stringify({ error: (error as any).message }),
        );
      }
      return;
    }

    // Default to Twilio
    const accountSid = this.configService.get<string>("TWILIO_ACCOUNT_SID");
    const authToken = this.configService.get<string>("TWILIO_AUTH_TOKEN");
    this.twilioFromPhoneNumber = this.configService.get<string>("TWILIO_FROM_PHONE_NUMBER");

    if (!accountSid || !authToken || !this.twilioFromPhoneNumber) {
      this.logger.error(
        "Twilio configuration is incomplete (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_PHONE_NUMBER is missing). SMS sending will be disabled.",
      );
    } else {
      try {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.isInitialized = true;
        this.logger.log("Twilio client initialized successfully.");
      } catch (error) {
        this.logger.error(
          "Failed to initialize Twilio client",
          undefined,
          JSON.stringify({ error: (error as any).message }),
        );
      }
    }
	}

	/**
	 * Sends an OTP code via SMS using Twilio.
	 * @param phoneNumber The recipient's phone number (should be in E.164 format).
	 * @param otp The One-Time Password to send.
	 * @throws InternalServerErrorException if SMS sending fails or Twilio client is not initialized.
	 */
  private buildLocalizedOtpMessage(phoneNumber: string, otp: string): string {
    const num = (phoneNumber || "").trim();
    const englishCC = ["+1", "+44", "+61", "+353", "+64"];
    const isEnglish = englishCC.some((cc) => num.startsWith(cc));
    if (isEnglish) {
      return `Novack Security: Your verification code is ${otp}. Valid for 10 minutes. Do not share this code. If you didn't request this, ignore this message.`;
    }
    return `Novack Security: Tu código de verificación es ${otp}. Válido por 10 minutos. No compartas este código. Si no solicitaste este acceso, ignora este mensaje.`;
  }

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    const messageBody = this.buildLocalizedOtpMessage(phoneNumber, otp);

    if (this.provider === "sns") {
      if (!this.isInitialized || !this.snsClient) {
        this.logger.error("SNS client not initialized. Cannot send OTP SMS.");
        throw new InternalServerErrorException("SMS service is not configured properly.");
      }
      try {
        const attributes: Record<string, any> = {
          "AWS.SNS.SMS.SMSType": { DataType: "String", StringValue: this.snsSmsType },
        };
        if (this.snsSenderId) {
          attributes["AWS.SNS.SMS.SenderID"] = { DataType: "String", StringValue: this.snsSenderId };
        }
        await this.snsClient.send(
          new PublishCommand({
            PhoneNumber: phoneNumber, // Must be E.164
            Message: messageBody,
            MessageAttributes: attributes,
          }),
        );
        this.logger.log("OTP SMS sent successfully via SNS", undefined, JSON.stringify({ to: phoneNumber }));
      } catch (error) {
        this.logger.error(
          "Failed to send OTP SMS via SNS",
          undefined,
          JSON.stringify({ to: phoneNumber, errorMessage: (error as any).message }),
        );
        throw new InternalServerErrorException("Failed to send OTP SMS.");
      }
      return;
    }

    // Twilio fallback
    if (!this.isInitialized || !this.twilioClient || !this.twilioFromPhoneNumber) {
      this.logger.error("Twilio client not initialized or configuration missing. Cannot send OTP SMS.");
      throw new InternalServerErrorException("SMS service is not configured properly.");
    }
    try {
      await this.twilioClient.messages.create({ to: phoneNumber, from: this.twilioFromPhoneNumber, body: messageBody });
      this.logger.log("OTP SMS sent successfully", undefined, JSON.stringify({ to: phoneNumber }));
    } catch (error) {
      this.logger.error(
        "Failed to send OTP SMS via Twilio",
        undefined,
        JSON.stringify({ to: phoneNumber, errorMessage: (error as any).message }),
      );
      throw new InternalServerErrorException("Failed to send OTP SMS.");
    }
	}
}
