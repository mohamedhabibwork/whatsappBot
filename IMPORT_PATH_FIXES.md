# Import Path Fixes

## Issue
The web application had incorrect import paths in UI components:
```
❌ import { cn } from "@/app/lib/utils"
```

## Root Cause
The shadcn UI components were generated with `@/app/lib/utils` import, but the actual utils file is at `apps/web/src/lib/utils.ts`.

## Fix Applied

### 1. Fixed All UI Components (49 files)
**Changed**: `@/app/lib/utils` → `@/src/lib/utils`

**Files Updated**:
- `apps/web/components/ui/*.tsx` (all 49 components)

**Command Used**:
```powershell
Get-ChildItem -Path "apps\web\components\ui\*.tsx" -Recurse | ForEach-Object { 
  (Get-Content $_.FullName) -replace '@/app/lib/utils', '@/src/lib/utils' | 
  Set-Content $_.FullName 
}
```

### 2. Path Aliases Configuration
The `tsconfig.json` has correct path mapping:
```json
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["./*"]
  }
}
```

This means:
- `@/components/ui` → `apps/web/components/ui` ✅
- `@/src/lib/utils` → `apps/web/src/lib/utils.ts` ✅
- `@/lib/trpc` → `apps/web/lib/trpc.ts` ✅
- `@/app/*` → `apps/web/app/*` ✅

### 3. File Structure
```
apps/web/
├── app/
│   ├── [locale]/
│   │   ├── page.tsx          # Uses @/lib/trpc ✅
│   │   ├── login/
│   │   └── signup/
│   ├── layout.tsx
│   └── providers.tsx          # Uses @/lib/trpc ✅
├── components/
│   └── ui/                    # All use @/src/lib/utils ✅
├── lib/
│   └── trpc.ts                # TRPC client
├── src/
│   └── lib/
│       └── utils.ts           # cn() utility function
└── tsconfig.json
```

## Verification

### All Import Paths Now Correct:
✅ **UI Components** → `@/src/lib/utils`
```typescript
import { cn } from "@/src/lib/utils"  // ✅ Correct
```

✅ **TRPC Client** → `@/lib/trpc`
```typescript
import { trpc } from '@/lib/trpc';  // ✅ Correct
```

✅ **UI Components** → `@/components/ui/*`
```typescript
import { Button } from "@/components/ui/button";  // ✅ Correct
```

✅ **Language Switcher** → `@/components/language-switcher`
```typescript
import { LanguageSwitcher } from "@/components/language-switcher";  // ✅ Correct
```

## Testing

### Expected Result
```bash
bun run dev
```

Should now start without errors:
```
✓ Starting...
✓ Compiled /[locale] successfully
✓ Ready in 3.5s
- Local: http://localhost:3000
```

### Verify Pages Work
1. **Landing Page**: http://localhost:3000/en
   - Should display with pricing section
   - No import errors in console

2. **Login Page**: http://localhost:3000/en/login
   - All UI components render correctly

3. **Signup Page**: http://localhost:3000/en/signup
   - Form and cards display properly

## Summary

**Problem**: Module not found `@/app/lib/utils`  
**Solution**: Updated all UI component imports to use correct path `@/src/lib/utils`  
**Files Changed**: 49 UI component files  
**Status**: ✅ Fixed and ready to test  

The application should now start successfully without import errors!
