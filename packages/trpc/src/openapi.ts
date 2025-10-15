import { generateOpenApiDocument } from "trpc-openapi";
import { appRouter } from "./routers/index";

/**
 * Generate OpenAPI document from the OpenAPI-compatible router
 * Lazily generated on first access to avoid blocking server startup
 */
let _cachedOpenApiDocument: ReturnType<typeof generateOpenApiDocument> | null = null;

export function getOpenApiDocument() {
  if (!_cachedOpenApiDocument) {
    try {
      _cachedOpenApiDocument = generateOpenApiDocument(appRouter, {
        title: "WhatsApp Bot API",
        description: "A comprehensive WhatsApp bot API for managing campaigns, contacts, messages, and more. This API provides multi-tenant support with subscription management.",
        version: "1.0.0",
        baseUrl: process.env.API_BASE_URL || "http://localhost:3001/api/rest",
        docsUrl: "https://github.com/mohamedhabibwork/whatsappBot",
        tags: [
          "system",
          "auth",
          "users",
          "tenants",
          "plans",
          "subscriptions",
          "invoices",
          "payments",
          "contacts",
          "groups",
          "templates",
          "campaigns",
          "webhooks",
          "messages",
          "notifications",
          "whatsapp",
        ],
      });
    } catch (error) {
      console.error("Failed to generate OpenAPI document:", error);
      // Return a minimal fallback document
      _cachedOpenApiDocument = {
        openapi: "3.0.3",
        info: {
          title: "WhatsApp Bot API",
          description: "API documentation unavailable due to generation error",
          version: "1.0.0",
        },
        paths: {},
      } as any;
    }
  }
  return _cachedOpenApiDocument;
}
