import { rabbitMQ } from "./connection";

export interface EmailJob {
  to: string;
  subject: string;
  template: "verifyEmail" | "resetPassword" | "welcomeEmail";
  language: "en" | "ar";
  data: {
    name: string;
    url?: string;
    expirationHours?: number;
  };
}

export class EmailQueue {
  private queueName = "email_queue";

  async add(job: EmailJob): Promise<void> {
    try {
      await rabbitMQ.publish(this.queueName, job);
      console.log(`✓ Email job added to queue: ${job.template} to ${job.to}`);
    } catch (error) {
      console.error("Failed to add email job to queue:", error);
      throw error;
    }
  }

  async addVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string,
    language: "en" | "ar" = "en",
  ): Promise<void> {
    await this.add({
      to,
      subject:
        language === "ar" ? "تحقق من بريدك الإلكتروني" : "Verify Your Email",
      template: "verifyEmail",
      language,
      data: {
        name,
        url: verificationUrl,
        expirationHours: 24,
      },
    });
  }

  async addPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
    language: "en" | "ar" = "en",
  ): Promise<void> {
    await this.add({
      to,
      subject:
        language === "ar" ? "إعادة تعيين كلمة المرور" : "Reset Your Password",
      template: "resetPassword",
      language,
      data: {
        name,
        url: resetUrl,
        expirationHours: 1,
      },
    });
  }

  async addWelcomeEmail(
    to: string,
    name: string,
    loginUrl: string,
    language: "en" | "ar" = "en",
  ): Promise<void> {
    await this.add({
      to,
      subject: language === "ar" ? "مرحبا بك" : "Welcome",
      template: "welcomeEmail",
      language,
      data: {
        name,
        url: loginUrl,
      },
    });
  }
}

export const emailQueue = new EmailQueue();
