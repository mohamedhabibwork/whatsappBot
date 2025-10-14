import { HttpClient } from '../utils/http-client';
import type {
  Chat,
  Message,
  ArchiveChatRequest,
  DeleteChatRequest,
  ClearMessagesRequest,
  MarkAsUnreadRequest,
  ListChatsRequest,
  OnlineStatus,
  MuteChatRequest,
  ChatStateRequest,
  PinChatRequest,
} from '../types';

export class ChatAPI {
  constructor(
    private http: HttpClient,
    private session: string
  ) {}

  /**
   * Get all chats
   */
  async getAllChats(): Promise<Chat[]> {
    return this.http.get(`/api/${this.session}/all-chats`);
  }

  /**
   * Get chat by ID
   */
  async getChat(chatId: string): Promise<Chat> {
    return this.http.get(`/api/${this.session}/chat/${chatId}`);
  }

  /**
   * Get chat messages
   */
  async getChatMessages(chatId: string, limit?: number): Promise<Message[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this.http.get(`/api/${this.session}/chat-messages/${chatId}${params}`);
  }

  /**
   * Archive or unarchive chat
   */
  async archiveChat(request: ArchiveChatRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/archive-chat`, request);
  }

  /**
   * Delete chat
   */
  async deleteChat(request: DeleteChatRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/delete-chat`, request);
  }

  /**
   * Clear all messages in chat
   */
  async clearMessages(request: ClearMessagesRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/clear-messages`, request);
  }

  /**
   * Mark chat as unread
   */
  async markAsUnread(request: MarkAsUnreadRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/mark-as-unread`, request);
  }


  /**
   * Mute chat
   */
  async muteChat(chatId: string, duration?: number): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/mute-chat`, { chatId, duration });
  }

  /**
   * Unmute chat
   */
  async unmuteChat(chatId: string): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/unmute-chat`, { chatId });
  }

  /**
   * List chats with filters
   */
  async listChats(request?: ListChatsRequest): Promise<Chat[]> {
    return this.http.post(`/api/${this.session}/list-chats`, request || {});
  }

  /**
   * Get all archived chats
   */
  async getAllChatsArchived(): Promise<Chat[]> {
    return this.http.get(`/api/${this.session}/all-chats-archived`);
  }

  /**
   * Get chat by ID
   */
  async getChatById(phone: string, isGroup?: boolean): Promise<Chat> {
    const params = isGroup ? `?isGroup=${isGroup}` : '';
    return this.http.get(`/api/${this.session}/chat-by-id/${phone}${params}`);
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string): Promise<Message> {
    return this.http.get(`/api/${this.session}/message-by-id/${messageId}`);
  }

  /**
   * Get all messages in chat
   */
  async getAllMessagesInChat(phone: string, params?: { isGroup?: boolean; includeMe?: boolean; includeNotifications?: boolean }): Promise<Message[]> {
    const queryParams = new URLSearchParams(params as Record<string, string>).toString();
    return this.http.get(`/api/${this.session}/all-messages-in-chat/${phone}${queryParams ? `?${queryParams}` : ''}`);
  }

  /**
   * Check if contact is online
   */
  async chatIsOnline(phone: string): Promise<OnlineStatus> {
    return this.http.get(`/api/${this.session}/chat-is-online/${phone}`);
  }

  /**
   * Get last seen of contact
   */
  async getLastSeen(phone: string): Promise<{ lastSeen: number }> {
    return this.http.get(`/api/${this.session}/last-seen/${phone}`);
  }

  /**
   * List muted chats
   */
  async listMutes(type: 'all' | 'chats' | 'groups' = 'all'): Promise<string[]> {
    return this.http.get(`/api/${this.session}/list-mutes/${type}`);
  }

  /**
   * Archive all chats
   */
  async archiveAllChats(): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/archive-all-chats`);
  }

  /**
   * Clear all chats
   */
  async clearAllChats(): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/clear-all-chats`);
  }

  /**
   * Delete all chats
   */
  async deleteAllChats(): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/delete-all-chats`);
  }

  /**
   * Send seen (read receipt)
   */
  async sendSeen(phone: string, isGroup?: boolean): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/send-seen`, { phone, isGroup });
  }

  /**
   * Send mute
   */
  async sendMute(request: MuteChatRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/send-mute`, request);
  }

  /**
   * Set chat state (typing, recording, available)
   */
  async setChatState(request: ChatStateRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/chat-state`, request);
  }

  /**
   * Pin chat
   */
  async pinChat(request: PinChatRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/pin-chat`, request);
  }
}
