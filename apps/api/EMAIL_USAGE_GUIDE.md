# Email Translation Usage Guide

## Quick Reference

### Using i18n in Backend

```typescript
import { t } from "./i18n";

// Get language from context
const language = c.get("language"); // "en" or "ar"

// Email translations
const verifySubject = t("email.verifyEmail.subject", language);
const verifyButton = t("email.verifyEmail.button", language);
const greeting = t("email.verifyEmail.greeting", language, { name: "John" });
const expiration = t("email.verifyEmail.expiration", language, { expirationHours: 24 });
```

### Available Email Translation Keys

#### Verify Email
- `email.verifyEmail.subject`
- `email.verifyEmail.greeting` (params: name)
- `email.verifyEmail.thankYou`
- `email.verifyEmail.button`
- `email.verifyEmail.orCopy`
- `email.verifyEmail.expiration` (params: expirationHours)
- `email.verifyEmail.ignore`

#### Reset Password
- `email.resetPassword.subject`
- `email.resetPassword.greeting` (params: name)
- `email.resetPassword.message`
- `email.resetPassword.button`
- `email.resetPassword.orCopy`
- `email.resetPassword.expiration` (params: expirationHours)
- `email.resetPassword.ignore`

#### Welcome Email
- `email.welcomeEmail.subject`
- `email.welcomeEmail.greeting` (params: name)
- `email.welcomeEmail.excited`
- `email.welcomeEmail.canLogin`
- `email.welcomeEmail.button`
- `email.welcomeEmail.questions`
- `email.welcomeEmail.regards`
- `email.welcomeEmail.team`

#### Tenant Invitation
- `email.tenantInvitation.subject` (params: tenantName)
- `email.tenantInvitation.greeting` (params: name)
- `email.tenantInvitation.message` (params: inviterName, tenantName, role)
- `email.tenantInvitation.button`
- `email.tenantInvitation.orCopy`
- `email.tenantInvitation.expiration` (params: expirationHours)
- `email.tenantInvitation.ignore`
- `email.tenantInvitation.regards`
- `email.tenantInvitation.team`

#### Common
- `email.common.footer`
- `email.common.copyright` (params: year)

### Sending Emails

#### Via Queue (Recommended)
```typescript
import { emailQueue } from "@repo/queue";

// Verification email
await emailQueue.addVerificationEmail(
  "user@example.com",
  "John Doe",
  "https://app.com/verify/token",
  "ar" // or "en"
);

// Password reset
await emailQueue.addPasswordResetEmail(
  "user@example.com",
  "John Doe",
  "https://app.com/reset/token",
  "ar"
);

// Welcome email
await emailQueue.addWelcomeEmail(
  "user@example.com",
  "John Doe",
  "https://app.com/login",
  "ar"
);

// Tenant invitation
await emailQueue.addTenantInvitationEmail(
  "user@example.com",
  "John Doe",
  "Acme Corp",
  "Jane Smith",
  "https://app.com/invite/token",
  "Admin",
  "ar"
);
```

#### Direct Send (Not Recommended for Production)
```typescript
import { mailService } from "@repo/mail";

await mailService.sendVerificationEmail(
  "user@example.com",
  "John Doe",
  "https://app.com/verify/token",
  "ar",
  24 // expiration hours
);
```

### Testing Translations

```bash
# Start API server
cd apps/api
bun dev

# Test English translations
curl http://localhost:3001/api/locales/en/common | jq '.email'

# Test Arabic translations
curl http://localhost:3001/api/locales/ar/common | jq '.email'
```

### Adding New Email Templates

1. **Add translations to locale files**
   ```json
   // apps/api/locales/en/common.json
   {
     "email": {
       "newTemplate": {
         "subject": "New Template Subject",
         "message": "Template message with {{variable}}"
       }
     }
   }
   ```

2. **Add template to mail templates**
   ```typescript
   // packages/mail/src/templates.ts
   export const templates = {
     newTemplate: {
       en: { subject: "...", html: "..." },
       ar: { subject: "...", html: "..." }
     }
   };
   ```

3. **Update EmailJob type**
   ```typescript
   // packages/queue/src/email-queue.ts
   template: "verifyEmail" | "resetPassword" | "welcomeEmail" | "tenantInvitation" | "newTemplate";
   ```

4. **Add queue method**
   ```typescript
   async addNewTemplateEmail(...) {
     await this.add({
       template: "newTemplate",
       // ...
     });
   }
   ```

5. **Add worker handler**
   ```typescript
   // packages/queue/src/workers/email-worker.ts
   case "newTemplate":
     await mailService.sendNewTemplateEmail(...);
     break;
   ```

### Best Practices

1. **Always use queue** for sending emails (async, retry support)
2. **Detect user language** from Accept-Language header or user preferences
3. **Test both languages** before deploying
4. **Keep translations consistent** across all templates
5. **Use interpolation** for dynamic content
6. **Include expiration times** for security-sensitive emails
7. **Provide "ignore" messages** for unsolicited emails
