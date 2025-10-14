import { HttpClient } from '../utils/http-client';
import type {
  StartSessionRequest,
  SessionStatus,
  QRCodeResponse,
  SessionInfo,
} from '../types';

export class AuthAPI {
  constructor(
    private http: HttpClient,
    private session: string,
    private secretKey: string
  ) {}

  /**
   * Generate authentication token
   */
  async generateToken(): Promise<{ token: string }> {
    return this.http.post(`/api/${this.session}/${this.secretKey}/generate-token`);
  }

  /**
   * Start WhatsApp session
   */
  async startSession(options?: StartSessionRequest): Promise<SessionStatus> {
    return this.http.post(`/api/${this.session}/start-session`, options);
  }

  /**
   * Start all sessions
   */
  async startAllSessions(): Promise<SessionInfo[]> {
    return this.http.post(`/api/${this.secretKey}/start-all`);
  }

  /**
   * Show all active sessions
   */
  async showAllSessions(): Promise<SessionInfo[]> {
    return this.http.get(`/api/${this.secretKey}/show-all-sessions`);
  }

  /**
   * Check connection status
   */
  async checkConnection(): Promise<SessionStatus> {
    return this.http.get(`/api/${this.session}/check-connection-session`);
  }

  /**
   * Get QR code for session
   */
  async getQRCode(): Promise<QRCodeResponse> {
    return this.http.get(`/api/${this.session}/qrcode-session`);
  }

  /**
   * Logout and delete session data
   */
  async logoutSession(): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/logout-session`);
  }

  /**
   * Close session without deleting data
   */
  async closeSession(): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/close-session`);
  }

  /**
   * Get session status
   */
  async getSessionStatus(): Promise<SessionStatus> {
    return this.http.get(`/api/${this.session}/status-session`);
  }

  /**
   * Clear session data
   */
  async clearSessionData(): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/${this.secretKey}/clear-session-data`);
  }
}
