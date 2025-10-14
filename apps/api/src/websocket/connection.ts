import type { ServerWebSocket } from "bun";
import type { Language } from "@repo/websocket-types";

interface Client {
  id: string;
  userId?: string;
  language: Language;
  ws: ServerWebSocket<{
    clientId: string;
    userId?: string;
    language?: Language;
  }>;
  createdAt: Date;
}

class WebSocketManager {
  private clients: Map<string, Client> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();

  addClient(
    id: string,
    userId: string | undefined,
    language: Language,
    ws: ServerWebSocket<{
      clientId: string;
      userId?: string;
      language?: Language;
    }>,
  ): void {
    const client: Client = {
      id,
      userId,
      language,
      ws,
      createdAt: new Date(),
    };

    this.clients.set(id, client);

    if (userId) {
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(id);
    }

    console.log(
      `WebSocket client connected: ${id} (user: ${userId || "guest"}, lang: ${language})`,
    );
  }

  removeClient(id: string): void {
    const client = this.clients.get(id);
    if (!client) return;

    if (client.userId) {
      const userClients = this.userConnections.get(client.userId);
      if (userClients) {
        userClients.delete(id);
        if (userClients.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
    }

    this.clients.delete(id);
    console.log(`WebSocket client disconnected: ${id}`);
  }

  getClient(id: string): Client | undefined {
    return this.clients.get(id);
  }

  getUserClients(userId: string): Client[] {
    const clientIds = this.userConnections.get(userId);
    if (!clientIds) return [];

    return Array.from(clientIds)
      .map((id) => this.clients.get(id))
      .filter((client): client is Client => client !== undefined);
  }

  broadcast(message: any, excludeId?: string): void {
    const payload = JSON.stringify(message);

    this.clients.forEach((client, id) => {
      if (id !== excludeId) {
        try {
          client.ws.send(payload);
        } catch (error) {
          console.error(`Failed to send to client ${id}:`, error);
        }
      }
    });
  }

  sendToUser(userId: string, message: any): void {
    const clients = this.getUserClients(userId);

    clients.forEach((client) => {
      try {
        // Add language to message if not present
        const messageWithLang = {
          ...message,
          language: message.language || client.language,
        };
        client.ws.send(JSON.stringify(messageWithLang));
      } catch (error) {
        console.error(`Failed to send to user ${userId}:`, error);
      }
    });
  }

  sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const messageWithLang = {
        ...message,
        language: message.language || client.language,
      };
      client.ws.send(JSON.stringify(messageWithLang));
    } catch (error) {
      console.error(`Failed to send to client ${clientId}:`, error);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getUserCount(): number {
    return this.userConnections.size;
  }

  getStats(): {
    totalClients: number;
    authenticatedUsers: number;
    guestClients: number;
  } {
    const guestClients = Array.from(this.clients.values()).filter(
      (c) => !c.userId,
    ).length;

    return {
      totalClients: this.clients.size,
      authenticatedUsers: this.userConnections.size,
      guestClients,
    };
  }
}

export const wsManager = new WebSocketManager();
export type { Client };
