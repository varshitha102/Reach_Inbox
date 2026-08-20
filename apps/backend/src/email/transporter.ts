import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

export const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.password,
  },
});

export async function verifyTransporter() {
  try {
    await transporter.verify();
    console.log('SMTP transporter verified successfully');
  } catch (error) {
    console.error('SMTP transporter verification failed:', error);
    throw error;
  }
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer;
    contentType?: string;
  }>;
}

export async function sendEmail(options: SendEmailOptions) {
  const mailOptions = {
    from: options.from || config.smtp.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
}
