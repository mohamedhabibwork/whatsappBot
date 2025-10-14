import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET ||
  "your-refresh-secret-change-in-production";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";
const ALGORITHM = process.env.ALGORITHM || "HS256";
export interface JWTPayload {
  userId: string;
  email: string;
  language: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    algorithm: ALGORITHM,
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    algorithm: ALGORITHM,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(
      token,
      REFRESH_TOKEN_SECRET,
    ) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function extractTokenFromHeader(
  authorization?: string,
): string | undefined | null {
  if (!authorization) return null;

  const [type, token] = authorization.split(" ");
  if (type !== "Bearer") return null;

  return token;
}

export function generateVerificationToken(): string {
  return crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
}

// get refresh token expiry
export const getExpiryDuration = () => {
  // format: 1y or 1w or 7d or 1h or 1m or 1s
  // y for years
  // w for weeks
  // d for days
  // h for hours
  // m for minutes
  // s for seconds
  const expiresIn = REFRESH_TOKEN_EXPIRES_IN;
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1));
  const values = {
    y: 365 * 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    h: 60 * 60 * 1000,
    m: 60 * 1000,
    s: 1000,
  };
  if (!values[unit as keyof typeof values]) {
    return new Date(Date.now() + values.w * value);
  }
  return new Date(Date.now() + values[unit as keyof typeof values] * value);
};

export function getRefreshTokenExpiry(): Date {
  return getExpiryDuration();
}
