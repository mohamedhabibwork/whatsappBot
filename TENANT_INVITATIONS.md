# Tenant Invitation System

## Overview

Complete tenant invitation system with owner-managed invitations and automatic tenant creation on registration.

## Features Implemented

### ✅ 1. Database Schema

**`tenant_invitations` table:**

```typescript
{
  id: uuid (PK)
  tenantId: uuid (FK to tenants)
  invitedBy: uuid (FK to users)
  email: string
  role: string ('admin', 'member', 'viewer')
  token: string (unique)
  status: string ('pending', 'accepted', 'expired', 'cancelled')
  expiresAt: timestamp
  acceptedAt: timestamp
  acceptedBy: uuid (FK to users)
  createdAt: timestamp
  updatedAt: timestamp
}
```

### ✅ 2. Tenant Management Endpoints (tRPC)

**`tenants.list`** - Get user's tenants with roles

```typescript
const { tenants } = await trpc.tenants.list.query();
// Returns: [{ id, name, slug, domain, isActive, role, createdAt }]
```

**`tenants.create`** - Create new tenant

```typescript
const { tenant } = await trpc.tenants.create.mutate({
  name: "My Company",
  slug: "my-company",
  domain: "company.com", // optional
});
```

**`tenants.invite`** - Invite user to tenant (owner/admin only)

```typescript
const { success, invitation } = await trpc.tenants.invite.mutate({
  tenantId: "tenant-uuid",
  email: "user@example.com",
  role: "member", // 'admin', 'member', 'viewer'
  language: "en", // or 'ar'
});
```

**`tenants.listInvitations`** - List pending invitations

```typescript
const { invitations } = await trpc.tenants.listInvitations.query({
  tenantId: "tenant-uuid",
});
```

**`tenants.cancelInvitation`** - Cancel pending invitation

```typescript
await trpc.tenants.cancelInvitation.mutate({
  invitationId: "invitation-uuid",
  tenantId: "tenant-uuid",
});
```

**`tenants.listMembers`** - List tenant members

```typescript
const { members } = await trpc.tenants.listMembers.query({
  tenantId: "tenant-uuid",
});
// Returns: [{ id, name, email, role, joinedAt }]
```

**`tenants.updateMemberRole`** - Update member's role

```typescript
await trpc.tenants.updateMemberRole.mutate({
  tenantId: "tenant-uuid",
  userId: "user-uuid",
  role: "admin",
});
```

**`tenants.removeMember`** - Remove member from tenant

```typescript
await trpc.tenants.removeMember.mutate({
  tenantId: "tenant-uuid",
  userId: "user-uuid",
});
```

### ✅ 3. Updated Registration Flow

**Register without invitation** (creates new tenant):

```typescript
const result = await trpc.auth.register.mutate({
  email: "user@example.com",
  password: "SecurePass123!",
  name: "John Doe",
  language: "en",
});
// User is created as owner of a new tenant
```

**Register with invitation** (joins existing tenant):

```typescript
const result = await trpc.auth.register.mutate({
  email: "user@example.com",
  password: "SecurePass123!",
  name: "John Doe",
  language: "en",
  invitationToken: "invitation-token-from-email",
});
// User is created and added to the invited tenant with specified role
```

### ✅ 4. Email Queue Integration

Invitation emails are queued automatically:

```typescript
// When owner invites a user
await trpc.tenants.invite.mutate({ ... });

// Email is queued with:
- Tenant name
- Inviter name
- Invitation URL with token
- Role description
- Bilingual support (EN/AR)
```

## Usage Flow

### Invite User to Tenant

1. **Owner creates invitation:**

```typescript
const { invitation } = await trpc.tenants.invite.mutate({
  tenantId: "my-tenant-id",
  email: "newuser@example.com",
  role: "member",
  language: "en",
});
```

2. **User receives email with invitation link:**

```
https://yourapp.com/accept-invitation?token=abc123&language=en
```

3. **User clicks link and registers:**

```typescript
await trpc.auth.register.mutate({
  email: "newuser@example.com",
  password: "SecurePass123!",
  name: "New User",
  language: "en",
  invitationToken: "abc123", // from URL
});
```

4. **User is automatically added to tenant with specified role**

### Permission Checks

- **invite, listInvitations, cancelInvitation**: Requires `owner` or `admin` role
- **updateMemberRole, removeMember**: Requires `owner` or `admin` role
- **Cannot modify/remove owner**: Protection built-in
- **listMembers**: Any tenant member can view

## Roles

- **`owner`**: Full control, cannot be changed/removed
- **`admin`**: Can invite users, manage members
- **`member`**: Regular access
- **`viewer`**: Read-only access

## Invitation States

- **`pending`**: Awaiting acceptance
- **`accepted`**: User registered and joined
- **`expired`**: Past expiration date (7 days)
- **`cancelled`**: Cancelled by owner/admin

## Security Features

1. **Email validation**: Invitation must match invited email
2. **Expiration**: 7 days validity
3. **Single use**: Marked as accepted after use
4. **Token-based**: Unique secure tokens
5. **Permission checks**: Only owners/admins can invite

## Database Migration

Run migration to create new table:

```bash
cd packages/database
bun run db:generate
bun run db:migrate
```

## Frontend Integration

### Accept Invitation Page

```typescript
// pages/accept-invitation.tsx
import { useRouter } from 'next/router';
import { trpc } from '@/utils/trpc';

export default function AcceptInvitation() {
  const router = useRouter();
  const { token, language } = router.query;

  const register = trpc.auth.register.useMutation({
    onSuccess: () => {
      router.push('/dashboard');
    }
  });

  const handleSubmit = async (data) => {
    await register.mutateAsync({
      ...data,
      invitationToken: token as string,
      language: (language as string) || 'en'
    });
  };

  return (
    <RegistrationForm
      onSubmit={handleSubmit}
      defaultEmail={email} // Pre-fill from invitation
    />
  );
}
```

### Tenant Management Page

```typescript
// pages/tenant/[id]/members.tsx
import { trpc } from '@/utils/trpc';

export default function TenantMembers() {
  const { data: members } = trpc.tenants.listMembers.useQuery({
    tenantId: tenantId
  });

  const invite = trpc.tenants.invite.useMutation();

  const handleInvite = async (email: string, role: string) => {
    await invite.mutateAsync({
      tenantId,
      email,
      role,
      language: 'en'
    });
  };

  return (
    <div>
      <MembersList members={members?.members} />
      <InviteForm onSubmit={handleInvite} />
    </div>
  );
}
```

## API Responses

### Login Response (with tenants)

```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "language": "en"
  }
}
```

### Get User Tenants

```typescript
const { tenants } = await trpc.tenants.list.query();
```

Response:

```json
{
  "tenants": [
    {
      "id": "tenant-1",
      "name": "My Company",
      "slug": "my-company",
      "domain": "company.com",
      "isActive": true,
      "role": "owner",
      "createdAt": "2025-01-13T..."
    },
    {
      "id": "tenant-2",
      "name": "Client Project",
      "slug": "client-project",
      "domain": null,
      "isActive": true,
      "role": "member",
      "createdAt": "2025-01-10T..."
    }
  ]
}
```

## Testing

### Test Invitation Flow

```bash
# 1. Create tenant
curl -X POST http://localhost:3001/api/trpc/tenants.create \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "name": "Test Company",
      "slug": "test-company"
    }
  }'

# 2. Invite user
curl -X POST http://localhost:3001/api/trpc/tenants.invite \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "tenantId": "tenant-uuid",
      "email": "newuser@example.com",
      "role": "member",
      "language": "en"
    }
  }'

# 3. Register with invitation
curl -X POST http://localhost:3001/api/trpc/auth.register \
  -H "Content-Type: application/json" \
  -d '{
    "json": {
      "email": "newuser@example.com",
      "password": "SecurePass123!",
      "name": "New User",
      "language": "en",
      "invitationToken": "token-from-email"
    }
  }'
```

## Email Templates

Create invitation email template in `/packages/mail/src/templates.ts`:

```typescript
export const tenantInvitationTemplate = (language: Language) => ({
  subject:
    language === "ar"
      ? "دعوة للانضمام إلى {{tenantName}}"
      : "Invitation to join {{tenantName}}",

  html:
    language === "ar"
      ? `
    <h2>مرحبا!</h2>
    <p>لقد تمت دعوتك من قبل {{inviterName}} للانضمام إلى {{tenantName}} كـ {{role}}.</p>
    <p><a href="{{url}}">انقر هنا للقبول</a></p>
    <p>ستنتهي صلاحية هذه الدعوة خلال 7 أيام.</p>
  `
      : `
    <h2>Hello!</h2>
    <p>You've been invited by {{inviterName}} to join {{tenantName}} as {{role}}.</p>
    <p><a href="{{url}}">Click here to accept</a></p>
    <p>This invitation will expire in 7 days.</p>
  `,
});
```

---

**Status**: ✅ Complete and Ready for Testing  
**Last Updated**: October 13, 2025, 8:30 PM UTC+03:00
