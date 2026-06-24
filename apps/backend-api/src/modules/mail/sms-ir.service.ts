import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SmsIrVerifyResponse = {
  status?: number;
  message?: string;
};

@Injectable()
export class SmsIrService {
  constructor(private readonly configService: ConfigService) {}

  async sendOtpSms(mobile: string, code: string): Promise<void> {
    const apiKey = this.configService.get<string>('SMS_IR_API_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('SMS provider is not configured');
    }

    const baseUrl = this.configService.get<string>(
      'SMS_IR_BASE_URL',
      'https://api.sms.ir/v1',
    );
    const templateId = this.configService.get<number>(
      'SMS_IR_VERIFY_TEMPLATE_ID',
      123456,
    );
    const parameterName = this.configService.get<string>(
      'SMS_IR_VERIFY_PARAMETER_NAME',
      'Code',
    );

    const response = await fetch(`${baseUrl}/send/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        mobile,
        templateId,
        parameters: [
          {
            name: parameterName,
            value: code,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('SMS provider request failed');
    }

    const result = (await response.json().catch(() => ({}))) as SmsIrVerifyResponse;

    if (result.status !== undefined && result.status !== 1) {
      throw new InternalServerErrorException(
        result.message || 'SMS provider rejected request',
      );
    }
  }
}
