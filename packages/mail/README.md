# @repo/mail

Email service package with support for multiple languages (English and Arabic).

## Features

- Nodemailer integration
- Template support with Handlebars
- Multi-language email templates (EN, AR)
- Strongly typed templates

## Usage

```typescript
import { mailClient, mailService } from "@repo/mail";

// Initialize mail client
await mailClient.connect();

// Send verification email
await mailService.sendVerificationEmail(
  "user@example.com",
  "John Doe",
  "https://example.com/verify?token=abc123",
  "en", // or 'ar' for Arabic
  24, // expiration in hours
);

// Send password reset email
await mailService.sendPasswordResetEmail(
  "user@example.com",
  "John Doe",
  "https://example.com/reset?token=abc123",
  "en",
  1,
);

// Send welcome email
await mailService.sendWelcomeEmail(
  "user@example.com",
  "John Doe",
  "https://example.com/login",
  "en",
);
```

## Environment Variables

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=noreply@example.com
```
