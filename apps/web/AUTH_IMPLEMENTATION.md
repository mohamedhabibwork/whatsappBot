# Authentication Implementation Guide

## Overview

This document describes the full authentication system implemented in the web application.

## Features Implemented

### ✅ Complete Authentication Flow
- User registration with email verification
- Login with remember me functionality
- Logout with token revocation
- Password reset flow
- Protected routes
- Automatic token refresh
- 401 error handling with redirect to login

### ✅ API Integration
- Fixed API URL configuration (`/api/trpc` endpoint)
- Proper authorization headers injection
- Global error handling for 401 errors
- Token storage in localStorage

### ✅ User Interface
- **Login Page**: `/[locale]/login`
  - Email and password fields
  - Remember me checkbox
  - Forgot password link
  - Redirect to signup
  - Full translations (EN/AR)

- **Signup Page**: `/[locale]/signup`
  - Full name, email, password fields
  - Plan selection
  - Organization name (for new tenants)
  - Invitation code support
  - Full translations (EN/AR)

- **Dashboard**: `/[locale]/dashboard`
  - Protected route with auto-redirect
  - User profile display
  - Quick stats cards
  - Email verification notice
  - Logout functionality

### ✅ Translations
- English (en.json)
- Arabic (ar.json)
- All auth-related strings translated

## File Structure

```
apps/web/
├── lib/
│   ├── auth.tsx              # Auth context and hooks
│   └── trpc.ts               # tRPC client configuration
├── app/
│   ├── providers.tsx         # Global providers with AuthProvider
│   └── [locale]/
│       ├── auth/
│       │   ├── login/page.tsx    # Login page
│       │   ├── signup/page.tsx   # Signup page and accept invitation
│       │   ├── verify-email/page.tsx # Verify email page
│       │   ├── reset-password/page.tsx # Reset password page
│       │   ├── forgot-password/page.tsx # Forgot password page
│       │   ├── change-password/page.tsx # Change password page
│       │   └── update-profile/page.tsx # Update profile page
│       └── dashboard/page.tsx # Protected dashboard
└── messages/
    ├── en.json               # English translations
    └── ar.json               # Arabic translations
```

## Usage

### Authentication Context

The `AuthProvider` wraps the entire app and provides authentication state:

```tsx
import { useAuth } from '@/lib/auth';

function MyComponent() {
  const { user, isAuthenticated, isLoading, login, logout, register } = useAuth();
  
  // Use authentication state
}
```

### Protecting Routes

Use the `useRequireAuth` hook to protect pages:

```tsx
import { useRequireAuth } from '@/lib/auth';

export default function ProtectedPage() {
  const { isAuthenticated, isLoading } = useRequireAuth();
  
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return null; // Will redirect
  
  return <YourContent />;
}
```

Or use the simpler approach (as in dashboard):

```tsx
const { user, isAuthenticated, isLoading } = useAuth();

useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push('/login?redirect=/your-page');
  }
}, [isAuthenticated, isLoading]);
```

### Login

```tsx
const { login } = useAuth();

await login(email, password, rememberMe);
// Automatically redirects to dashboard
```

### Signup

```tsx
const { register } = useAuth();

await register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'securepassword',
  language: 'en',
  invitationToken: 'optional-invite-code'
});
// Automatically redirects to verify-email page
```

### Logout

```tsx
const { logout } = useAuth();

await logout();
// Automatically redirects to login page
```

## API Configuration

The tRPC client is configured to:

1. **Use the correct endpoint**: `${NEXT_PUBLIC_API_URL}/api/trpc`
2. **Include auth headers**: Automatically adds `Authorization: Bearer <token>` header
3. **Handle 401 errors**: Clears auth state and redirects to login
4. **Persist tokens**: Stores access and refresh tokens in localStorage

## Environment Variables

```env
# Required: Backend API URL (without /api/trpc suffix)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Error Handling

### 401 Unauthorized
- Automatically clears authentication state
- Redirects to login page
- Shows error message to user

### Validation Errors
- Displayed inline in forms
- Translated based on user language
- Clear error messages from backend

## Token Management

### Access Token
- Stored in localStorage as `whatsapp_bot_token`
- Included in all API requests
- Short-lived (configurable in backend)

### Refresh Token
- Stored in localStorage as `whatsapp_bot_refresh_token`
- Used to obtain new access tokens
- Long-lived (only with "Remember Me")
- Revoked on logout

### User Data
- Stored in localStorage as `whatsapp_bot_user`
- Synced with backend on app load
- Contains: id, email, name, emailVerified, language

## Security Features

1. **Password validation**: Minimum 8 characters
2. **Email verification**: Required for full access
3. **Token expiration**: Automatic token refresh
4. **Secure storage**: localStorage with proper cleanup
5. **CSRF protection**: Built into tRPC
6. **401 handling**: Auto-logout on unauthorized

## Backend Integration

The authentication system integrates with the existing backend:

### Auth Router (`packages/trpc/src/routers/auth.ts`)
- `auth.register` - Create new user account
- `auth.login` - Authenticate user
- `auth.logout` - Revoke refresh token
- `auth.me` - Get current user data
- `auth.verifyEmail` - Verify email address
- `auth.forgotPassword` - Request password reset
- `auth.resetPassword` - Reset password with token
- `auth.changePassword` - Change password (authenticated)
- `auth.updateProfile` - Update user profile

### Middleware (`apps/api/src/middleware/auth.ts`)
- Validates JWT tokens
- Extracts user ID from token
- Attaches auth data to request context

## Testing

### Test Login
1. Start the API server: `cd apps/api && bun run dev`
2. Start the web app: `cd apps/web && bun run dev`
3. Navigate to `http://localhost:3000/en/login`
4. Enter credentials and test login flow

### Test Signup
1. Navigate to `http://localhost:3000/en/signup`
2. Fill in the form with test data
3. Select a plan
4. Submit and verify email verification flow

### Test Protected Routes
1. Navigate to `http://localhost:3000/en/dashboard` without logging in
2. Should redirect to login page
3. After login, should access dashboard

## Future Enhancements

- [ ] Add forgot password page
- [ ] Add email verification page with resend functionality
- [ ] Add profile settings page
- [ ] Add social login (Google, GitHub)
- [ ] Add two-factor authentication
- [ ] Add session management page
- [ ] Add password strength indicator
- [ ] Add biometric authentication support

## Troubleshooting

### "Cannot find module '@/lib/trpc'"
- Ensure TypeScript is properly configured
- Restart your IDE/TS server
- Check `tsconfig.json` paths configuration

### "401 Unauthorized" on all requests
- Check API server is running
- Verify `NEXT_PUBLIC_API_URL` is correct
- Clear localStorage and try logging in again

### Translations not showing
- Check `messages/en.json` and `messages/ar.json` exist
- Verify translation keys match in both files
- Restart dev server after adding new translations

### Redirect loop
- Clear localStorage
- Check for conflicting authentication logic
- Verify `isAuthenticated` logic in protected routes
