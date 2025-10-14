# Internationalization (i18n) Setup

This document describes the i18n implementation across the WhatsApp Bot monorepo.

## Overview

The project supports **Arabic (ar)** and **English (en)** with automatic locale detection and redirect functionality.

## Architecture

### Backend (API)
- **Framework**: i18next with fs-backend
- **Location**: `apps/api/locales/{lang}/{namespace}.json`
- **Middleware**: Automatic language detection from `Accept-Language` header or `?lang=` query parameter
- **Endpoints**:
  - `GET /api/locales` - List available languages
  - `GET /api/locales/:lang/:namespace` - Get translations for a specific language and namespace

### Frontend (Web & Docs)
- **Framework**: next-intl
- **Routing**: Locale-based routing with auto-redirect (`/en/*`, `/ar/*`)
- **Location**: `apps/{web|docs}/messages/{lang}.json`
- **Features**:
  - Automatic RTL support for Arabic
  - Language switcher component
  - Can load translations from backend API

## File Structure

```
apps/
├── api/
│   ├── locales/
│   │   ├── ar/
│   │   │   └── common.json
│   │   └── en/
│   │       └── common.json
│   └── src/
│       ├── i18n/
│       │   └── index.ts
│       └── middleware/
│           └── i18n.ts
├── web/
│   ├── i18n/
│   │   ├── request.ts
│   │   └── routing.ts
│   ├── messages/
│   │   ├── ar.json
│   │   └── en.json
│   ├── components/
│   │   └── language-switcher.tsx
│   ├── lib/
│   │   └── i18n-loader.ts
│   └── middleware.ts
└── docs/
    ├── i18n/
    │   ├── request.ts
    │   └── routing.ts
    ├── messages/
    │   ├── ar.json
    │   └── en.json
    ├── components/
    │   └── language-switcher.tsx
    ├── lib/
    │   └── i18n-loader.ts
    └── middleware.ts
```

## Usage

### Backend API

#### Access language in middleware
```typescript
import { t } from "./i18n";

const language = c.get("language"); // "en" or "ar"
const message = t("auth.loginSuccess", language);
```

#### Add new translations
1. Edit `apps/api/locales/en/common.json`
2. Edit `apps/api/locales/ar/common.json`
3. Translations are automatically loaded

### Frontend (Web/Docs)

#### Use translations in components
```typescript
import { useTranslations } from "next-intl";

export default function MyComponent() {
  const t = useTranslations("home");
  return <h1>{t("welcome")}</h1>;
}
```

#### Use translations in server components
```typescript
import { getTranslations } from "next-intl/server";

export default async function MyPage() {
  const t = await getTranslations("home");
  return <h1>{t("welcome")}</h1>;
}
```

#### Add language switcher
```typescript
import { LanguageSwitcher } from "@/components/language-switcher";

<LanguageSwitcher />
```

#### Load translations from API (optional)
```typescript
import { loadTranslationsFromAPI } from "@/lib/i18n-loader";

const translations = await loadTranslationsFromAPI("en", "common");
```

## Auto-Redirect Behavior

1. User visits root URL (`/`)
2. Middleware detects browser language from `Accept-Language` header
3. User is redirected to `/en` or `/ar` based on preference
4. If language is not supported, defaults to `/en`

## Adding New Languages

### Backend
1. Create new folder: `apps/api/locales/{lang}/`
2. Add `common.json` with translations
3. Update `supportedLanguages` in `apps/api/src/i18n/index.ts`

### Frontend
1. Update `routing.ts` in both web and docs:
   ```typescript
   locales: ["en", "ar", "newlang"]
   ```
2. Create `apps/{web|docs}/messages/{newlang}.json`
3. Update language switcher component

## Environment Variables

### Web & Docs Apps
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Testing

### Test language switching
1. Start API: `cd apps/api && bun dev`
2. Start Web: `cd apps/web && bun dev`
3. Visit `http://localhost:3000`
4. Should auto-redirect to `/en` or `/ar`
5. Use language switcher to change language

### Test API endpoints
```bash
# Get available languages
curl http://localhost:3001/api/locales

# Get English translations
curl http://localhost:3001/api/locales/en/common

# Get Arabic translations
curl http://localhost:3001/api/locales/ar/common
```

## Best Practices

1. **Always translate both languages**: Never leave translations missing in one language
2. **Use namespaces**: Organize translations by feature/page
3. **Keep keys consistent**: Use the same key structure across all languages
4. **Test RTL layout**: Always test Arabic layout for proper RTL support
5. **Use interpolation**: For dynamic values, use `{{variable}}` syntax
6. **Validate on 401**: Ensure redirect to login page preserves language

## Notes

- All messages are translated to **ar** and **en** only
- Frontend inputs are validated to match backend validation
- Using Tailwind CSS v4 with shadcn-vue/shadcn-ui for modern UX/UI
- Socket connections handle language for real-time updates
- On 401 errors, users are redirected to login page with language preserved
- On successful login, users are redirected to the correct page with language preserved
