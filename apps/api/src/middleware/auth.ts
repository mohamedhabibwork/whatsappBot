import { Context, Next } from "hono";
import { extractTokenFromHeader, verifyAccessToken } from "@repo/auth-utils";

export interface AuthContext {
  userId: string;
  email: string;

}

export async function authMiddleware(c: Context, next: Next) {
  const authorization = c.req.header("authorization");
  const token = extractTokenFromHeader(authorization);

  if (!token) {
    return c.json({ error: "Unauthorized", message: "No token provided" }, 401);
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return c.json({ error: "Unauthorized", message: "Invalid token" }, 401);
  }

  c.set("auth", payload);
  await next();
}
