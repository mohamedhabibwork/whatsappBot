# Email Templates Translation Summary

## ✅ Completed Implementation

### Backend API Locale Files

Added comprehensive email template translations to both English and Arabic locale files:

#### Location
- `apps/api/locales/en/common.json`
- `apps/api/locales/ar/common.json`

#### Email Templates Translated

1. **Verify Email** (`email.verifyEmail`)
   - Subject, greeting, thank you message, button text, copy instructions, expiration notice, ignore message

2. **Reset Password** (`email.resetPassword`)
   - Subject, greeting, message, button text, copy instructions, expiration notice, ignore message

3. **Welcome Email** (`email.welcomeEmail`)
   - Subject, greeting, excited message, login instructions, button text, questions message, regards, team name

4. **Tenant Invitation** (`email.tenantInvitation`)
   - Subject, greeting, invitation message, button text, copy instructions, expiration notice, ignore message, regards, team name

5. **Common Email Elements** (`email.common`)
   - Footer text, copyright notice

### Email Template Files

#### Updated Files
- `packages/mail/src/templates.ts` - Completed tenant invitation template for both languages

#### Features
- All templates support Arabic (RTL) and English (LTR)
- Proper RTL styling with `direction: rtl` for Arabic
- Handlebars template compilation
- Variable interpolation support ({{name}}, {{url}}, etc.)

### Queue System

#### Updated Files
- `packages/queue/src/email-queue.ts` - Added tenant invitation support
- `packages/queue/src/workers/email-worker.ts` - Added tenant invitation handler

#### New Methods
- `addTenantInvitationEmail()` - Queue tenant invitation emails

#### Updated Types
```typescript
interface EmailJob {
  template: "verifyEmail" | "resetPassword" | "welcomeEmail" | "tenantInvitation";
  data: {
    name: string;
    url?: string;
    expirationHours?: number;
    tenantName?: string;      // NEW
    inviterName?: string;     // NEW
    role?: string;            // NEW
  };
}
```

### Mail Service

#### Existing Methods (Already Implemented)
- `sendVerificationEmail()` - Send email verification
- `sendPasswordResetEmail()` - Send password reset
- `sendWelcomeEmail()` - Send welcome email
- `sendTenantInvitationEmail()` - Send tenant invitation (already existed)

## Translation Keys Structure

### English (`en/common.json`)
```json
{
  "email": {
    "verifyEmail": {
      "subject": "Verify Your Email Address",
      "greeting": "Hello {{name}}",
      "thankYou": "Thank you for registering...",
      "button": "Verify Email",
      "orCopy": "Or copy and paste this link...",
      "expiration": "This link will expire in {{expirationHours}} hours.",
      "ignore": "If you didn't create an account..."
    },
    "resetPassword": { ... },
    "welcomeEmail": { ... },
    "tenantInvitation": { ... },
    "common": {
      "footer": "This is an automated email...",
      "copyright": "© {{year}} WhatsApp Bot..."
    }
  }
}
```

### Arabic (`ar/common.json`)
```json
{
  "email": {
    "verifyEmail": {
      "subject": "تحقق من عنوان بريدك الإلكتروني",
      "greeting": "مرحبا {{name}}",
      "thankYou": "شكرا لتسجيلك...",
      "button": "تحقق من البريد الإلكتروني",
      "orCopy": "أو انسخ والصق هذا الرابط...",
      "expiration": "سينتهي هذا الرابط خلال {{expirationHours}} ساعة.",
      "ignore": "إذا لم تقم بإنشاء حساب..."
    },
    "resetPassword": { ... },
    "welcomeEmail": { ... },
    "tenantInvitation": { ... },
    "common": {
      "footer": "هذا بريد إلكتروني تلقائي...",
      "copyright": "© {{year}} واتساب بوت..."
    }
  }
}
```

## Usage Examples

### Backend API
```typescript
import { t } from "./i18n";

const language = c.get("language"); // "en" or "ar"

// Get email subject
const subject = t("email.verifyEmail.subject", language);

// Get email greeting with interpolation
const greeting = t("email.verifyEmail.greeting", language, { name: "John" });

// Get expiration message
const expiration = t("email.verifyEmail.expiration", language, { 
  expirationHours: 24 
});
```

### Queue System
```typescript
import { emailQueue } from "@repo/queue";

// Send tenant invitation
await emailQueue.addTenantInvitationEmail(
  "user@example.com",
  "John Doe",
  "Acme Corp",
  "Jane Smith",
  "https://app.com/invite/abc123",
  "Admin",
  "ar" // Language
);
```

### Mail Service
```typescript
import { mailService } from "@repo/mail";

// Send verification email
await mailService.sendVerificationEmail(
  "user@example.com",
  "John Doe",
  "https://app.com/verify/token",
  "ar", // Language
  24    // Expiration hours
);

// Send tenant invitation
await mailService.sendTenantInvitationEmail(
  "user@example.com",
  "Acme Corp",
  "Jane Smith",
  "https://app.com/invite/abc123",
  "Admin",
  "ar",
  7 // Expiration days
);
```

## API Endpoints

Access translations via REST API:

```bash
# Get all email translations (English)
curl http://localhost:3001/api/locales/en/common

# Get all email translations (Arabic)
curl http://localhost:3001/api/locales/ar/common

# Response includes email section:
{
  "email": {
    "verifyEmail": { ... },
    "resetPassword": { ... },
    "welcomeEmail": { ... },
    "tenantInvitation": { ... },
    "common": { ... }
  }
}
```

## Features

✅ **All email templates translated** to Arabic and English  
✅ **RTL support** for Arabic emails  
✅ **Variable interpolation** using Handlebars  
✅ **Consistent styling** across all templates  
✅ **Type-safe** with TypeScript  
✅ **Queue-based** email sending  
✅ **API endpoints** to fetch translations  
✅ **Tenant invitation** template completed  

## Notes

- All email templates use modern, clean HTML styling
- Arabic emails have proper RTL direction and alignment
- Expiration times are configurable
- All templates include "ignore" messages for security
- Templates are accessible via API for frontend usage
- Queue system handles retries automatically
- Mail service supports both individual and batch sending
