import { HttpClient } from '../utils/http-client';
import type {
  SubscribePresenceRequest,
  SetOnlinePresenceRequest,
  PlatformInfo,
  RejectCallRequest,
} from '../types';

export class MiscAPI {
  constructor(
    private http: HttpClient,
    private session: string
  ) {}

  /**
   * Subscribe to presence updates
   */
  async subscribePresence(request: SubscribePresenceRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/subscribe-presence`, request);
  }

  /**
   * Set online presence
   */
  async setOnlinePresence(request: SetOnlinePresenceRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/set-online-presence`, request);
  }

  /**
   * Get platform info from message
   */
  async getPlatformFromMessage(messageId: string): Promise<PlatformInfo> {
    return this.http.get(`/api/${this.session}/get-platform-from-message/${messageId}`);
  }

  /**
   * Get battery level
   */
  async getBatteryLevel(): Promise<{ battery: number; plugged: boolean }> {
    return this.http.get(`/api/${this.session}/battery-level`);
  }

  /**
   * Get phone info
   */
  async getPhoneInfo(): Promise<{ wid: string; phone: string }> {
    return this.http.get(`/api/${this.session}/phone-info`);
  }

  /**
   * Get WhatsApp Web version
   */
  async getWAVersion(): Promise<{ version: string }> {
    return this.http.get(`/api/${this.session}/wa-version`);
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(): Promise<{ base64: string }> {
    return this.http.get(`/api/${this.session}/screenshot`);
  }

  /**
   * Send seen (read receipt)
   */
  async sendSeen(chatId: string): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/send-seen`, { chatId });
  }

  /**
   * Set typing state
   */
  async setTyping(chatId: string, isTyping: boolean): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/set-typing`, { chatId, isTyping });
  }

  /**
   * Set recording state
   */
  async setRecording(chatId: string, isRecording: boolean): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/set-recording`, { chatId, isRecording });
  }

  /**
   * Get all broadcast lists
   */
  async getAllBroadcastList(): Promise<unknown[]> {
    return this.http.get(`/api/${this.session}/all-broadcast-list`);
  }

  /**
   * Reject call
   */
  async rejectCall(request: RejectCallRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/reject-call`, request);
  }
}
