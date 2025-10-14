import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trpcServer } from "@hono/trpc-server";
import {
  appRouter,
  createContext,
  setAuthEventSender,
} from "@repo/trpc/server";
import { rabbitMQ, initializeQueues } from "@repo/queue";
import { redisClient } from "@repo/cache";
import { mailClient } from "@repo/mail";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import {
  handleWebSocketUpgrade,
  handleWebSocketMessage,
  sendAuthEvent,
} from "./websocket/handlers";
import { wsManager } from "./websocket/connection";
import type { Language } from "@repo/websocket-types";
import { getMessage } from "@repo/websocket-types";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
  }),
);

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

// WebSocket endpoint (handled by Bun server)
app.get("/ws", (c) => {
  return c.text("WebSocket endpoint - upgrade required", 426);
});

// WebSocket stats endpoint (protected)
app.get("/api/ws/stats", authMiddleware, (c) => {
  const stats = wsManager.getStats();
  return c.json(stats);
});

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
      return createContext({
        userId: auth?.userId,
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
});

export default app;
