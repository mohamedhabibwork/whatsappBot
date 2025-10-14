import type { ServerWebSocket, Server } from "bun";
import { wsManager } from "./connection";
import { verifyAccessToken } from "@repo/auth-utils";
import {
  type WebSocketMessage,
  type Language,
  getMessage,
  getErrorMessage,
} from "@repo/websocket-types";

type WSData = { clientId: string; userId?: string; language?: Language };

export function handleWebSocketUpgrade(
  req: Request,
  server: Server<WSData>,
): boolean {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const language = (url.searchParams.get("language") || "en") as Language;

  let userId: string | undefined;

  // Authenticate if token provided
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      userId = payload?.userId;
    } catch (error) {
      console.error("WebSocket auth error:", error);
    }
  }

  const clientId = crypto.randomUUID();

  // Upgrade the connection
  return server.upgrade(req, {
    data: { clientId, userId, language },
  });
}

export function handleWebSocketMessage(
  ws: ServerWebSocket<WSData>,
  clientId: string,
  userId: string | undefined,
  language: Language = "en",
  message: string | Buffer,
) {
  try {
    const data = JSON.parse(message.toString()) as WebSocketMessage;

    switch (data.type) {
      case "ping":
        ws.send(
          JSON.stringify({
            type: "pong",
            payload: { timestamp: new Date().toISOString() },
            timestamp: new Date().toISOString(),
            language,
          }),
        );
        break;

      case "subscribe":
        handleSubscribe(ws, clientId, userId, language, data.payload);
        break;

      case "unsubscribe":
        handleUnsubscribe(ws, clientId, userId, language, data.payload);
        break;

      case "broadcast":
        if (!userId) {
          sendError(ws, getErrorMessage("authRequired", language), language);
          return;
        }
        handleBroadcast(ws, clientId, userId, language, data.payload);
        break;

      case "broadcast_sent":
        // This is a confirmation sent back to the broadcaster, no action needed
        break;

      case "stats":
        if (!userId) {
          sendError(ws, getErrorMessage("authRequired", language), language);
          return;
        }
        const stats = wsManager.getStats();
        ws.send(
          JSON.stringify({
            type: "stats",
            payload: stats,
            timestamp: new Date().toISOString(),
            language,
          }),
        );
        break;

      default:
        sendError(
          ws,
          getErrorMessage("unknownMessageType", language),
          language,
        );
    }
  } catch (error) {
    console.error("WebSocket message parse error:", error);
    sendError(ws, getErrorMessage("invalidMessage", language), language);
  }
}

function handleSubscribe(
  ws: ServerWebSocket<WSData>,
  clientId: string,
  userId: string | undefined,
  language: Language,
  payload: any,
) {
  const channel = payload?.channel;
  console.log(`Client ${clientId} subscribing to: ${channel}`);

  ws.send(
    JSON.stringify({
      type: "subscribed",
      payload: {
        channel,
        message: getMessage("subscribed", language),
      },
      timestamp: new Date().toISOString(),
      language,
    }),
  );
}

function handleUnsubscribe(
  ws: ServerWebSocket<WSData>,
  clientId: string,
  userId: string | undefined,
  language: Language,
  payload: any,
) {
  const channel = payload?.channel;
  console.log(`Client ${clientId} unsubscribing from: ${channel}`);

  ws.send(
    JSON.stringify({
      type: "unsubscribed",
      payload: {
        channel,
        message: getMessage("unsubscribed", language),
      },
      timestamp: new Date().toISOString(),
      language,
    }),
  );
}

function handleBroadcast(
  ws: ServerWebSocket<WSData>,
  clientId: string,
  userId: string,
  language: Language,
  payload: any,
) {
  const message = payload?.message;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    sendError(ws, "Message cannot be empty", language);
    return;
  }

  // Send broadcast message to all connected clients
  broadcastToAll("broadcast", {
    message: message.trim(),
    from: userId,
    clientId,
  }, language);

  // Send confirmation back to sender
  ws.send(
    JSON.stringify({
      type: "broadcast_sent",
      payload: {
        message: "Message broadcasted successfully",
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      language,
    }),
  );
}

function sendError(
  ws: ServerWebSocket<WSData>,
  message: string,
  language: Language,
) {
  ws.send(
    JSON.stringify({
      type: "error",
      payload: { message },
      timestamp: new Date().toISOString(),
      language,
    }),
  );
}

// Utility functions for external use
export function notifyUser(
  userId: string,
  type: string,
  payload: any,
  language: Language = "en",
) {
  wsManager.sendToUser(userId, {
    type,
    payload,
    timestamp: new Date().toISOString(),
    language,
  } as WebSocketMessage);
}

export function broadcastToAll(
  type: string,
  payload: any,
  language?: Language,
) {
  wsManager.broadcast({
    type,
    payload,
    timestamp: new Date().toISOString(),
    language,
  } as WebSocketMessage);
}

export function sendAuthEvent(
  userId: string,
  event:
    | "login"
    | "logout"
    | "register"
    | "email_verified"
    | "password_changed"
    | "profile_updated",
  language: Language = "en",
) {
  notifyUser(userId, "auth_event", { event, userId }, language);
}
