import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorType?: 'temporary' | 'permanent' | 'infrastructure';
}

export class EmailSenderService {
  private static transporter: nodemailer.Transporter;
  private static testMode = process.env.TEST_MODE === 'true';

  static async initialize(): Promise<void> {
    try {
      // Debug logging
      const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
      logger.info('EmailSenderService initialization', {
        testModeEnv: process.env.TEST_MODE,
        testModeValue: this.testMode,
        smtpUser: process.env.SMTP_USER,
        smtpPass: smtpPass ? '***' : 'not set',
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
      });

      if (this.testMode) {
        logger.info('EmailSenderService in TEST MODE - emails will not be sent');
        return;
      }

      // Check if SMTP credentials are configured
      if (!process.env.SMTP_USER || !smtpPass) {
        logger.warn('SMTP credentials not configured, falling back to TEST MODE', {
          smtpUser: process.env.SMTP_USER,
          smtpPass: smtpPass ? 'set' : 'not set',
        });
        this.testMode = true;
        logger.info('EmailSenderService in TEST MODE - emails will not be sent');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: smtpPass,
        },
      });

      await this.transporter.verify();
      logger.info('EmailSenderService initialized and SMTP verified');
    } catch (error) {
      logger.warn('SMTP verification failed, falling back to TEST MODE', { error });
      this.testMode = true;
      logger.info('EmailSenderService in TEST MODE - emails will not be sent');
    }
  }

  static async sendEmail(
    to: string,
    subject: string,
    body: string,
    from: string
  ): Promise<EmailSendResult> {
    try {
      if (this.testMode) {
        logger.info('TEST MODE: Email would be sent', { to, from, subject });
        return {
          success: true,
          messageId: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
      }

      const info = await this.transporter.sendMail({
        from,
        to,
        subject,
        html: body,
      });

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to,
        from,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      logger.error('Failed to send email', {
        to,
        from,
        error: error.message,
        code: error.code,
      });

      const errorType = this.classifyError(error);

      return {
        success: false,
        error: error.message,
        errorType,
      };
    }
  }

  private static classifyError(error: any): 'temporary' | 'permanent' | 'infrastructure' {
    if (error.code === 'EMESSAGE' || error.code === 'EENVELOPE') {
      return 'permanent';
    }
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION' || error.code === 'ESOCKET') {
      return 'temporary';
    }
    return 'infrastructure';
  }

  static async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      logger.info('EmailSenderService closed');
    }
  }
}
