import nodemailer, { type Transporter } from "nodemailer";

export interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class MailClient {
  private transporter: Transporter | null = null;
  private config: MailConfig;
  private isConnectedFlag = false;

  constructor(config: MailConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.isConnectedFlag) {
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.auth.user,
          pass: this.config.auth.pass,
        },
      });

      await this.transporter.verify();
      this.isConnectedFlag = true;
      console.log("✓ Mail service connected");
    } catch (error) {
      console.error("Failed to connect to mail service:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.isConnectedFlag = false;
      console.log("Mail service disconnected");
    }
  }

  isConnected(): boolean {
    return this.isConnectedFlag;
  }

  async sendMail(options: {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    if (!this.transporter) {
      throw new Error("Mail service not connected");
    }

    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }
}

// Create default mail client
const mailConfig: MailConfig = {
  host: process.env.MAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.MAIL_PORT) || 587,
  secure: process.env.MAIL_SECURE === "true",
  auth: {
    user: process.env.MAIL_USER || "",
    pass: process.env.MAIL_PASS || "",
  },
  from: process.env.MAIL_FROM || "noreply@example.com",
};

export const mailClient = new MailClient(mailConfig);
