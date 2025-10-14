import { HttpClient } from '../utils/http-client';
import type {
  SendTextStorieRequest,
  SendImageStorieRequest,
  SendVideoStorieRequest,
} from '../types';

export class StoriesAPI {
  constructor(
    private http: HttpClient,
    private session: string
  ) {}

  /**
   * Send text story
   */
  async sendTextStory(request: SendTextStorieRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/send-text-storie`, request);
  }

  /**
   * Send image story
   */
  async sendImageStory(request: SendImageStorieRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/send-image-storie`, request);
  }

  /**
   * Send video story
   */
  async sendVideoStory(request: SendVideoStorieRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/send-video-storie`, request);
  }
}
