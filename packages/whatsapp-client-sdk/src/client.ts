import { HttpClient } from './utils/http-client';
import { AuthAPI } from './api/auth';
import { MessagesAPI } from './api/messages';
import { ContactsAPI } from './api/contacts';
import { GroupsAPI } from './api/groups';
import { ChatAPI } from './api/chat';
import { ProfileAPI } from './api/profile';
import { MiscAPI } from './api/misc';
import { BusinessAPI } from './api/business';
import { StoriesAPI } from './api/stories';
import { CommunityAPI } from './api/community';
import type { WhatsAppClientOptions } from './types';

export class WhatsAppClient {
  private http: HttpClient;
  private _session: string;
  private _secretKey: string;

  public auth: AuthAPI;
  public messages: MessagesAPI;
  public contacts: ContactsAPI;
  public groups: GroupsAPI;
  public chat: ChatAPI;
  public profile: ProfileAPI;
  public misc: MiscAPI;
  public business: BusinessAPI;
  public stories: StoriesAPI;
  public community: CommunityAPI;

  constructor(options: WhatsAppClientOptions) {
    this._session = options.session;
    this._secretKey = options.secretKey;

    this.http = new HttpClient({
      baseURL: options.baseURL,
      timeout: options.timeout,
      headers: options.token ? { Authorization: `Bearer ${options.token}` } : undefined,
    });

    // Initialize API modules
    this.auth = new AuthAPI(this.http, this._session, this._secretKey);
    this.messages = new MessagesAPI(this.http, this._session);
    this.contacts = new ContactsAPI(this.http, this._session);
    this.groups = new GroupsAPI(this.http, this._session);
    this.chat = new ChatAPI(this.http, this._session);
    this.profile = new ProfileAPI(this.http, this._session);
    this.misc = new MiscAPI(this.http, this._session);
    this.business = new BusinessAPI(this.http, this._session);
    this.stories = new StoriesAPI(this.http, this._session);
    this.community = new CommunityAPI(this.http, this._session);
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.http.setAuthToken(token);
  }

  /**
   * Remove authentication token
   */
  removeAuthToken(): void {
    this.http.removeAuthToken();
  }

  /**
   * Get current session name
   */
  get session(): string {
    return this._session;
  }

  /**
   * Get secret key
   */
  get secretKey(): string {
    return this._secretKey;
  }

  /**
   * Update session name
   */
  setSession(session: string): void {
    this._session = session;
    // Reinitialize API modules with new session
    this.auth = new AuthAPI(this.http, this._session, this._secretKey);
    this.messages = new MessagesAPI(this.http, this._session);
    this.contacts = new ContactsAPI(this.http, this._session);
    this.groups = new GroupsAPI(this.http, this._session);
    this.chat = new ChatAPI(this.http, this._session);
    this.profile = new ProfileAPI(this.http, this._session);
    this.misc = new MiscAPI(this.http, this._session);
    this.business = new BusinessAPI(this.http, this._session);
    this.stories = new StoriesAPI(this.http, this._session);
    this.community = new CommunityAPI(this.http, this._session);
  }
}
