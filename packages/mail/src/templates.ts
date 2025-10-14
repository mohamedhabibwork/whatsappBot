import Handlebars from "handlebars";

export interface MailTemplateData {
  [key: string]: any;
}

export const templates = {
  verifyEmail: {
    en: {
      subject: "Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email Address</h2>
          <p>Hello {{name}},</p>
          <p>Thank you for registering. Please click the button below to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
          <p>This link will expire in {{expirationHours}} hours.</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
      `,
    },
    ar: {
      subject: "تحقق من عنوان بريدك الإلكتروني",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <h2>تحقق من عنوان بريدك الإلكتروني</h2>
          <p>مرحبا {{name}}،</p>
          <p>شكرا لتسجيلك. الرجاء النقر على الزر أدناه للتحقق من عنوان بريدك الإلكتروني:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{verificationUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              تحقق من البريد الإلكتروني
            </a>
          </div>
          <p>أو انسخ والصق هذا الرابط في متصفحك:</p>
          <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
          <p>سينتهي هذا الرابط خلال {{expirationHours}} ساعة.</p>
          <p>إذا لم تقم بإنشاء حساب، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
        </div>
      `,
    },
  },

  resetPassword: {
    en: {
      subject: "Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hello {{name}},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
          <p>This link will expire in {{expirationHours}} hours.</p>
          <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
        </div>
      `,
    },
    ar: {
      subject: "إعادة تعيين كلمة المرور",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <h2>إعادة تعيين كلمة المرور</h2>
          <p>مرحبا {{name}}،</p>
          <p>لقد تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بك. انقر على الزر أدناه لإنشاء كلمة مرور جديدة:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{resetUrl}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              إعادة تعيين كلمة المرور
            </a>
          </div>
          <p>أو انسخ والصق هذا الرابط في متصفحك:</p>
          <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
          <p>سينتهي هذا الرابط خلال {{expirationHours}} ساعة.</p>
          <p>إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد الإلكتروني بأمان. لن يتم تغيير كلمة المرور الخاصة بك.</p>
        </div>
      `,
    },
  },

  welcomeEmail: {
    en: {
      subject: "Welcome!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hello {{name}}!</h2>
          <p>We're excited to have you on board.</p>
          <p>You can now log in and start using our services.</p>
          <p>
            <a href="{{url}}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Log In
            </a>
          </p>
          <p>If you have any questions, feel free to reach out to us.</p>
          <p>Best regards,<br>Support Team</p>
        </div>
      `,
    },
    ar: {
      subject: "مرحبا بك!",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>أهلا {{name}}!</h2>
          <p>نحن سعداء بانضمامك إلينا.</p>
          <p>يمكنك الآن تسجيل الدخول والبدء في استخدام خدماتنا.</p>
          <p>
            <a href="{{url}}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              تسجيل الدخول
            </a>
          </p>
          <p>إذا كان لديك أي أسئلة، لا تتردد في التواصل معنا.</p>
          <p>مع أطيب التحيات،<br>فريق الدعم</p>
        </div>
      `,
    },
  },
  tenantInvitation: {
    en: {
      subject: "You've been invited to join {{tenantName}}",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Tenant Invitation</h2>
          <p>Hello {{name}},</p>
          <p>{{inviterName}} has invited you to join <strong>{{tenantName}}</strong> as a <strong>{{role}}</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{url}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #666;">{{url}}</p>
          <p>This invitation will expire in {{expirationHours}} hours.</p>
          <p>If you don't want to accept this invitation, you can safely ignore this email.</p>
          <p>Best regards,<br>Support Team</p>
        </div>
      `,
    },
    ar: {
      subject: "تمت دعوتك للانضمام إلى {{tenantName}}",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <h2>دعوة للانضمام</h2>
          <p>مرحبا {{name}}،</p>
          <p>قام {{inviterName}} بدعوتك للانضمام إلى <strong>{{tenantName}}</strong> بصفة <strong>{{role}}</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{url}}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              قبول الدعوة
            </a>
          </div>
          <p>أو انسخ والصق هذا الرابط في متصفحك:</p>
          <p style="word-break: break-all; color: #666;">{{url}}</p>
          <p>ستنتهي صلاحية هذه الدعوة خلال {{expirationHours}} ساعة.</p>
          <p>إذا كنت لا ترغب في قبول هذه الدعوة، يمكنك تجاهل هذا البريد الإلكتروني بأمان.</p>
          <p>مع أطيب التحيات،<br>فريق الدعم</p>
        </div>
      `,
    },
  },
};

export type TemplateType = keyof typeof templates;
export type Language = "en" | "ar";

interface TemplateData {
  name: string;
  url: string;
  expirationHours?: number;
  tenantName?: string;
  inviterName?: string;
  role?: string;
}

export function compileTemplate(
  templateType: TemplateType,
  language: Language,
  data: TemplateData,
): { subject: string; html: string } {
  const template = templates[templateType][language];

  const compiledSubject = Handlebars.compile(template.subject);
  const compiledHtml = Handlebars.compile(template.html);

  return {
    subject: compiledSubject(data),
    html: compiledHtml(data),
  };
}
