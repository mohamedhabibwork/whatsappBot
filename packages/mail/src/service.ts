import { mailClient } from "./client";
import {
  compileTemplate,
  type TemplateType,
  type Language,
  type TemplateData,
} from "./templates";

export class MailService {
  async sendTemplatedEmail(
    to: string | string[],
    templateType: TemplateType,
    language: Language,
    data: TemplateData,
  ): Promise<void> {
    const { subject, html } = compileTemplate(templateType, language, data);

    await mailClient.sendMail({
      to,
      subject,
      html,
    });
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string,
    language: Language = "en",
    expirationHours: number = 24,
  ): Promise<void> {
    await this.sendTemplatedEmail(to, "verifyEmail", language, {
      name,
      verificationUrl,
      expirationHours,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
    language: Language = "en",
    expirationHours: number = 1,
  ): Promise<void> {
    await this.sendTemplatedEmail(to, "resetPassword", language, {
      name,
      resetUrl,
      expirationHours,
    });
  }

  async sendWelcomeEmail(
    to: string,
    name: string,
    loginUrl: string,
    language: Language = "en",
  ): Promise<void> {
    await this.sendTemplatedEmail(to, "welcomeEmail", language, { name, url: loginUrl });
  }

  async sendTenantInvitationEmail(
    to: string,
    tenantName: string,
    inviterName: string,
    invitationUrl: string,
    role: string,
    language: Language = "en",
    expirationDays: number = 7,
  ): Promise<void> {
    await this.sendTemplatedEmail(to, "tenantInvitation", language, {
      name: to,
      tenantName,
      inviterName,
      url: invitationUrl,
      role,
      expirationHours: expirationDays,
    });
  }
}

export const mailService = new MailService();
