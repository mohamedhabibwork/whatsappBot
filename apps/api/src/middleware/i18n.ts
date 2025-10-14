import type { Context, Next } from "hono";
import { getLanguageFromHeader, type Language } from "../i18n";

export async function i18nMiddleware(c: Context, next: Next) {
  const acceptLanguage = c.req.header("accept-language");
  const langQuery = c.req.query("lang") as Language | undefined;
  
  const language = langQuery || getLanguageFromHeader(acceptLanguage);
  
  c.set("language", language);
  
  await next();
}
