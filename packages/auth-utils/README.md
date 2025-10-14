# @repo/auth-utils

Shared authentication utilities for password hashing and JWT token management.

## Features

- Password hashing with bcrypt
- Password strength validation
- JWT access token generation and verification
- Refresh token generation and verification
- Token extraction from Authorization header

## Usage

```typescript
import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@repo/auth-utils";

// Hash password
const hashed = await hashPassword("myPassword123");

// Verify password
const isValid = await comparePassword("myPassword123", hashed);

// Validate password strength
const { valid, errors } = validatePasswordStrength("weak");

// Generate tokens
const accessToken = generateAccessToken({
  userId: "123",
  email: "user@example.com",
  role: "user",
});

const refreshToken = generateRefreshToken({
  userId: "123",
  tokenId: "token-uuid",
});

// Verify tokens
const payload = verifyAccessToken(accessToken);
const refreshPayload = verifyRefreshToken(refreshToken);
```
