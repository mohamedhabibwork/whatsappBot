import { HttpClient } from '../utils/http-client';
import type {
  Contact,
  CheckNumberStatusRequest,
  NumberStatus,
  BlockContactRequest,
  UnblockContactRequest,
} from '../types';

export class ContactsAPI {
  constructor(
    private http: HttpClient,
    private session: string
  ) {}

  /**
   * Get all contacts
   */
  async getAllContacts(): Promise<Contact[]> {
    return this.http.get(`/api/${this.session}/all-contacts`);
  }

  /**
   * Get contact by phone number
   */
  async getContact(phone: string): Promise<Contact> {
    return this.http.get(`/api/${this.session}/contact/${phone}`);
  }

  /**
   * Get contact profile picture
   */
  async getContactProfilePicture(phone: string): Promise<{ profilePicThumbObj: { eurl: string; img: string } }> {
    return this.http.get(`/api/${this.session}/contact-profile-picture/${phone}`);
  }

  /**
   * Check if number is registered on WhatsApp
   */
  async checkNumberStatus(request: CheckNumberStatusRequest): Promise<NumberStatus> {
    return this.http.post(`/api/${this.session}/check-number-status`, request);
  }

  /**
   * Block contact
   */
  async blockContact(request: BlockContactRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/block-contact`, request);
  }

  /**
   * Unblock contact
   */
  async unblockContact(request: UnblockContactRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/unblock-contact`, request);
  }

  /**
   * Get all blocked contacts
   */
  async getAllBlockedContacts(): Promise<string[]> {
    return this.http.get(`/api/${this.session}/all-blocked-contacts`);
  }
}
