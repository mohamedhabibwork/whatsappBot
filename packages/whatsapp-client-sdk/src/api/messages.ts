import { HttpClient } from '../utils/http-client';
import type {
  SendMessageRequest,
  SendImageRequest,
  SendFileRequest,
  SendStickerRequest,
  SendVoiceRequest,
  SendLocationRequest,
  SendLinkPreviewRequest,
  SendMentionedRequest,
  SendReplyRequest,
  EditMessageRequest,
  DownloadMediaRequest,
  MessageResponse,
  SendListMessageRequest,
  SendOrderMessageRequest,
  SendPollMessageRequest,
  DeleteMessageRequest,
  ReactMessageRequest,
  ForwardMessageRequest,
  MarkUnseenRequest,
  SendContactVcardRequest,
  Message,
  PollVoteInfo,
  SendLinkCatalogRequest,
} from '../types';

export class MessagesAPI {
  constructor(
    private http: HttpClient,
    private session: string
  ) {}

  /**
   * Send text message
   */
  async sendMessage(request: SendMessageRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-message`, request);
  }

  /**
   * Send image message
   */
  async sendImage(request: SendImageRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-image`, request);
  }

  /**
   * Send file message
   */
  async sendFile(request: SendFileRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-file`, request);
  }

  /**
   * Send file as base64
   */
  async sendFileBase64(request: SendFileRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-file-base64`, request);
  }

  /**
   * Send sticker
   */
  async sendSticker(request: SendStickerRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-sticker`, request);
  }

  /**
   * Send animated sticker (GIF)
   */
  async sendStickerGif(request: SendStickerRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-sticker-gif`, request);
  }

  /**
   * Send voice message
   */
  async sendVoice(request: SendVoiceRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-voice`, request);
  }

  /**
   * Send voice message as base64
   */
  async sendVoiceBase64(request: SendVoiceRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-voice-base64`, request);
  }

  /**
   * Send location
   */
  async sendLocation(request: SendLocationRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-location`, request);
  }

  /**
   * Send link with preview
   */
  async sendLinkPreview(request: SendLinkPreviewRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-link-preview`, request);
  }

  /**
   * Send message with mentions
   */
  async sendMentioned(request: SendMentionedRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-mentioned`, request);
  }

  /**
   * Reply to a message
   */
  async sendReply(request: SendReplyRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-reply`, request);
  }

  /**
   * Edit a message
   */
  async editMessage(request: EditMessageRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/edit-message`, request);
  }

  /**
   * Send status/story
   */
  async sendStatus(request: SendMessageRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-status`, request);
  }

  /**
   * Download media from message
   */
  async downloadMedia(request: DownloadMediaRequest): Promise<{ base64: string; mimetype: string }> {
    return this.http.post(`/api/${this.session}/download-media`, request);
  }

  /**
   * Get media by message ID
   */
  async getMediaByMessage(messageId: string): Promise<{ base64: string; mimetype: string }> {
    return this.http.get(`/api/${this.session}/get-media-by-message/${messageId}`);
  }

  /**
   * Send list message
   */
  async sendListMessage(request: SendListMessageRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-list-message`, request);
  }

  /**
   * Send order message
   */
  async sendOrderMessage(request: SendOrderMessageRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-order-message`, request);
  }

  /**
   * Send poll message
   */
  async sendPollMessage(request: SendPollMessageRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-poll-message`, request);
  }

  /**
   * Delete message
   */
  async deleteMessage(request: DeleteMessageRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/delete-message`, request);
  }

  /**
   * React to message
   */
  async reactMessage(request: ReactMessageRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/react-message`, request);
  }

  /**
   * Forward messages
   */
  async forwardMessages(request: ForwardMessageRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/forward-messages`, request);
  }

  /**
   * Mark message as unseen
   */
  async markUnseen(request: MarkUnseenRequest): Promise<{ success: boolean }> {
    return this.http.post(`/api/${this.session}/mark-unseen`, request);
  }

  /**
   * Send contact vCard
   */
  async sendContactVcard(request: SendContactVcardRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/contact-vcard`, request);
  }

  /**
   * Get messages from chat
   */
  async getMessages(phone: string, params?: { count?: number; direction?: string; id?: string }): Promise<Message[]> {
    const queryParams = new URLSearchParams(params as Record<string, string>).toString();
    return this.http.get(`/api/${this.session}/get-messages/${phone}${queryParams ? `?${queryParams}` : ''}`);
  }

  /**
   * Get poll votes
   */
  async getPollVotes(messageId: string): Promise<PollVoteInfo[]> {
    return this.http.get(`/api/${this.session}/votes/${messageId}`);
  }

  /**
   * Get all unread messages
   */
  async getAllUnreadMessages(): Promise<Message[]> {
    return this.http.get(`/api/${this.session}/all-unread-messages`);
  }

  /**
   * Get all new messages
   */
  async getAllNewMessages(): Promise<Message[]> {
    return this.http.get(`/api/${this.session}/all-new-messages`);
  }

  /**
   * Send link catalog
   */
  async sendLinkCatalog(request: SendLinkCatalogRequest): Promise<MessageResponse> {
    return this.http.post(`/api/${this.session}/send-link-catalog`, request);
  }
}
