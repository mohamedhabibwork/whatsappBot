import { HttpClient } from '../utils/http-client';
import type {
  ProfileStatus,
  SetStatusRequest,
  ProfilePicture,
  SetProfilePictureRequest,
} from '../types';

export class ProfileAPI {
  constructor(
    private http: HttpClient,
    private session: string
  ) {}

  /**
   * Get profile status
   */
  async getStatus(): Promise<ProfileStatus> {
    return this.http.get(`/api/${this.session}/status`);
  }

  /**
   * Set profile status
   */
  async setStatus(request: SetStatusRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/set-status`, request);
  }

  /**
   * Get profile picture
   */
  async getProfilePicture(): Promise<ProfilePicture> {
    return this.http.get(`/api/${this.session}/profile-picture`);
  }

  /**
   * Set profile picture
   */
  async setProfilePicture(request: SetProfilePictureRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/set-profile-picture`, request);
  }

  /**
   * Remove profile picture
   */
  async removeProfilePicture(): Promise<{ success: boolean }> {
    return this.http.delete(`/api/${this.session}/profile-picture`);
  }

  /**
   * Get profile name
   */
  async getProfileName(): Promise<{ name: string; pushname: string }> {
    return this.http.get(`/api/${this.session}/profile-name`);
  }

  /**
   * Set profile name
   */
  async setProfileName(name: string): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/set-profile-name`, { name });
  }
}
