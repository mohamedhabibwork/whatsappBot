import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trpcServer } from "@hono/trpc-server";
// import { createOpenApiHttpHandler } from "trpc-openapi"; // Temporarily disabled
import {
  appRouter,
  createContext,
  setAuthEventSender,
  setBroadcastFunction,
} from "@repo/trpc/server";
import { rabbitMQ, initializeQueues } from "@repo/queue";
import { redisClient } from "@repo/cache";
import { mailClient } from "@repo/mail";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import { i18nMiddleware } from "./middleware/i18n";
import { performanceMiddleware, getPerformanceStats } from "./middleware/performance";
import { getTenantId } from "./middleware/tenant";
import { i18n, supportedLanguages, type Language as I18nLanguage } from "./i18n";
import {
  handleWebSocketUpgrade,
  handleWebSocketMessage,
  sendAuthEvent,
} from "./websocket/handlers";
import { wsManager } from "./websocket/connection";
import type { Language } from "@repo/websocket-types";
import { getMessage } from "@repo/websocket-types";
import { swaggerRouter } from "./routes/swagger";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", performanceMiddleware);
app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);

// i18n middleware
app.use("*", i18nMiddleware);

// Apply rate limiting to all API routes
app.use("/api/*", rateLimitMiddleware);

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      redis: redisClient.isConnected(),
      rabbitmq: rabbitMQ.isConnected(),
      mail: mailClient.isConnected(),
    },
  });
});

// Locale endpoints
app.get("/api/locales", (c) => {
  return c.json({
    languages: supportedLanguages,
    default: "en",
  });
});

app.get("/api/locales/:lang/:namespace", async (c) => {
  const lang = c.req.param("lang") as I18nLanguage;
  const namespace = c.req.param("namespace");

  if (!supportedLanguages.includes(lang)) {
    return c.json({ error: "Language not supported" }, 400);
  }

  try {
    const translations = await i18n.getResourceBundle(lang, namespace);
    if (!translations) {
      return c.json({ error: "Namespace not found" }, 404);
    }
    return c.json(translations);
  } catch (error) {
    return c.json({ error: "Failed to load translations" }, 500);
  }
});

// WebSocket endpoint (handled by Bun server)
app.get("/ws", (c) => {
  return c.text("WebSocket endpoint - upgrade required", 426);
});

// WebSocket stats endpoint (protected)
app.get("/api/ws/stats", authMiddleware, (c) => {
  const stats = wsManager.getStats();
  return c.json(stats);
});

// Performance stats endpoint (protected)
app.get("/api/performance/stats", authMiddleware, (c) => {
  const stats = getPerformanceStats();
  return c.json(stats);
});

// Swagger/OpenAPI documentation
app.route("/api/docs", swaggerRouter);

// OpenAPI REST API endpoints (generated from tRPC procedures with OpenAPI metadata)
// TODO: Re-enable when nested router support is fixed in trpc-openapi
// const openApiHandler = createOpenApiHttpHandler({
//   router: appRouter,
//   createContext: async ({ req }) => {
//     const authorization = req.headers.get("authorization");
//     const token = authorization?.split(" ")[1];
//     
//     let userId: string | undefined;
//     let tenantId: string | undefined;
//     
//     if (token) {
//       try {
//         // Create a mock Hono context to use auth middleware
//         const mockContext = {
//           req: {
//             header: (name: string) => {
//               if (name === "authorization") return authorization;
//               return req.headers.get(name);
//             },
//           },
//           set: (key: string, value: any) => {
//             if (key === "auth") {
//               userId = value.userId;
//             }
//           },
//         } as any;
//         
//         await authMiddleware(mockContext, async () => {});
//         
//         // Get tenant ID if user is authenticated
//         if (userId) {
//           tenantId = await getTenantId(mockContext, userId);
//         }
//       } catch (error) {
//         // Token invalid, continue as unauthenticated
//       }
//     }
//     
//     return createContext({ userId, tenantId });
//   },
// });

// Mount OpenAPI REST endpoints at /api/rest
// app.all("/api/rest/*", async (c) => {
//   const request = c.req.raw;
//   const response = await openApiHandler(request);
//   return response;
// });

// tRPC routes with auth
app.use("/api/trpc/*", async (c, next) => {
  const authorization = c.req.header("authorization");
  const token = authorization?.split(" ")[1];

  if (token) {
    // Extract user info from token for tRPC context
    await authMiddleware(c, async () => {});
  }

  await next();
});

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async (opts, c) => {
      const auth = c.get("auth");
      const userId = auth?.userId;
      
      // Get tenant ID from request
      const tenantId = userId ? await getTenantId(c, userId) : undefined;
      
      return createContext({
        userId,
        tenantId,
      });
    },
  }),
);

// Initialize services
async function initializeServices() {
  try {
    console.log("Initializing services...");

    // Connect to Redis
    await redisClient.connect();
    console.log("✓ Redis connected");

    // Connect to RabbitMQ
    await rabbitMQ.connect();
    console.log("✓ RabbitMQ connected");

    // Initialize queues
    await initializeQueues();
    console.log("✓ Queues initialized");

    // Connect to Mail service
    try {
      await mailClient.connect();
      console.log("✓ Mail service connected");
    } catch (error) {
      console.warn("⚠ Mail service connection failed (optional):", error);
    }

    // Initialize WebSocket event sender for auth events
    setAuthEventSender((userId: string, event: string, language: Language) => {
      sendAuthEvent(userId, event as any, language);
    });
    console.log("✓ WebSocket auth events initialized");

    // Initialize WebSocket broadcast function for tRPC events
    setBroadcastFunction((type: string, payload: any, language?: Language) => {
      wsManager.broadcast({
        type: type as any,
        payload,
        timestamp: new Date().toISOString(),
        language,
      });
    });
    console.log("✓ WebSocket broadcast function initialized");

    console.log("All services initialized successfully");
  } catch (error) {
    console.error("Failed to initialize services:", error);
    process.exit(1);
  }
}

// Start server with WebSocket support
const port = Number(process.env.PORT) || 3001;

type WSData = { clientId: string; userId?: string; language?: Language };

initializeServices().then(() => {
  Bun.serve<WSData>({
    port,
    fetch(req, server) {
      const url = new URL(req.url);

      // Handle WebSocket upgrade
      if (url.pathname === "/ws") {
        const upgraded = handleWebSocketUpgrade(req, server);
        if (upgraded) return undefined;
      }

      // Handle regular HTTP requests
      return app.fetch(req, server);
    },
    websocket: {
      open(ws) {
        const language = ws.data.language || "en";
        wsManager.addClient(ws.data.clientId, ws.data.userId, language, ws);
        ws.send(
          JSON.stringify({
            type: "connected",
            payload: {
              clientId: ws.data.clientId,
              authenticated: !!ws.data.userId,
              userId: ws.data.userId,
              message: getMessage("connected", language),
            },
            timestamp: new Date().toISOString(),
            language,
          }),
        );
        console.log(
          `✓ WebSocket connected: ${ws.data.clientId} (user: ${ws.data.userId || "guest"}, lang: ${language})`,
        );
      },
      message(ws, message) {
        const language = ws.data.language || "en";
        handleWebSocketMessage(
          ws,
          ws.data.clientId,
          ws.data.userId,
          language,
          message,
        );
      },
      close(ws) {
        wsManager.removeClient(ws.data.clientId);
        console.log(`✗ WebSocket disconnected: ${ws.data.clientId}`);
      },
    },
  });

  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📡 WebSocket available at ws://localhost:${port}/ws`);
  console.log(`📄 tRPC API available at http://localhost:${port}/api/trpc`);
  // console.log(`🔌 REST API available at http://localhost:${port}/api/rest`); // Temporarily disabled
  console.log(`📚 API Documentation (Swagger UI) at http://localhost:${port}/api/docs`);
  console.log(`📋 OpenAPI JSON at http://localhost:${port}/api/docs/openapi.json`);
});

export default app;
