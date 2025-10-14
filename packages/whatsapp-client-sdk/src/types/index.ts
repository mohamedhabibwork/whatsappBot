// Core Types
export interface WhatsAppClientOptions {
  baseURL: string;
  secretKey: string;
  session: string;
  token?: string;
  timeout?: number;
}

// Auth Types
export interface StartSessionRequest {
  webhook?: string;
  waitQrCode?: boolean;
  proxy?: {
    url: string;
    username: string;
    password: string;
  };
}

export interface SessionStatus {
  state: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QRCODE';
  qrcode?: string;
}

export interface QRCodeResponse {
  base64Qr: string;
  urlCode: string;
  code: string;
}

export interface SessionInfo {
  session: string;
  state: string;
  status: string;
}

// Message Types
export interface SendMessageRequest {
  phone: string;
  message: string;
  isGroup?: boolean;
  isNewsletter?: boolean;
  isLid?: boolean;
  options?: {
    quotedMsg?: string;
    [key: string]: unknown;
  };
}

export interface SendImageRequest {
  phone: string;
  base64: string;
  filename: string;
  caption?: string;
  isGroup?: boolean;
  isNewsletter?: boolean;
  isLid?: boolean;
}

export interface SendFileRequest {
  phone: string;
  base64: string;
  filename: string;
  caption?: string;
  isGroup?: boolean;
  isNewsletter?: boolean;
  isLid?: boolean;
}

export interface SendStickerRequest {
  phone: string;
  path: string;
  isGroup?: boolean;
}

export interface SendVoiceRequest {
  phone: string;
  path?: string;
  base64Ptt?: string;
  isGroup?: boolean;
  quotedMessageId?: string;
}

export interface SendLocationRequest {
  phone: string;
  lat: string;
  lng: string;
  title?: string;
  address?: string;
  isGroup?: boolean;
}

export interface SendLinkPreviewRequest {
  phone: string;
  url: string;
  caption?: string;
  isGroup?: boolean;
}

export interface SendMentionedRequest {
  phone: string;
  message: string;
  mentioned: string[];
  isGroup?: boolean;
}

export interface SendReplyRequest {
  phone: string;
  message: string;
  messageId: string;
  isGroup?: boolean;
}

export interface EditMessageRequest {
  id: string;
  newText: string;
  options?: Record<string, unknown>;
}

export interface DownloadMediaRequest {
  messageId: string;
}

export interface MessageResponse {
  ack: number;
  id: string;
  sendMsgResult: {
    isSent: boolean;
    messageId: string;
  };
}

// Contact Types
export interface Contact {
  id: string;
  name: string;
  pushname: string;
  type: string;
  isBusiness: boolean;
  isEnterprise: boolean;
  isGroup: boolean;
  isUser: boolean;
  isWAContact: boolean;
  isMyContact: boolean;
  verifiedName?: string;
  statusMute: boolean;
  labels: string[];
}

export interface CheckNumberStatusRequest {
  phone: string;
}

export interface NumberStatus {
  numberExists: boolean;
  id: string;
}

export interface BlockContactRequest {
  phone: string;
}

export interface UnblockContactRequest {
  phone: string;
}

// Group Types
export interface CreateGroupRequest {
  name: string;
  participants: string[];
}

export interface AddParticipantRequest {
  groupId: string;
  phone: string | string[];
}

export interface RemoveParticipantRequest {
  groupId: string;
  phone: string | string[];
}

export interface PromoteParticipantRequest {
  groupId: string;
  phone: string | string[];
}

export interface DemoteParticipantRequest {
  groupId: string;
  phone: string | string[];
}

export interface UpdateGroupInfoRequest {
  groupId: string;
  name?: string;
  description?: string;
}

export interface SetGroupPictureRequest {
  groupId: string;
  base64: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  participants: GroupParticipant[];
  owner: string;
  creation: number;
  description?: string;
}

export interface GroupParticipant {
  id: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

export interface GroupInviteLink {
  inviteCode: string;
  inviteLink: string;
}

// Chat Types
export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  isReadOnly: boolean;
  unreadCount: number;
  timestamp: number;
  lastMessage?: Message;
}

export interface Message {
  id: string;
  body: string;
  type: string;
  timestamp: number;
  from: string;
  to: string;
  author?: string;
  isForwarded: boolean;
  hasMedia: boolean;
  ack: number;
}

export interface ArchiveChatRequest {
  phone: string;
  isGroup?: boolean;
  archive: boolean;
}

export interface DeleteChatRequest {
  phone: string;
  isGroup?: boolean;
}

export interface ClearMessagesRequest {
  phone: string;
  isGroup?: boolean;
}

export interface MarkAsUnreadRequest {
  phone: string;
  isGroup?: boolean;
}

// Profile Types
export interface ProfileStatus {
  status: string;
}

export interface SetStatusRequest {
  status: string;
}

export interface ProfilePicture {
  eurl: string;
  id: string;
  img: string;
  imgFull: string;
  raw: string;
  tag: string;
}

export interface SetProfilePictureRequest {
  base64: string;
}

// Status/Story Types
export interface SendStatusRequest {
  phone: string;
  message: string;
  isGroup?: boolean;
  messageId?: string;
}

// Presence Types
export interface SubscribePresenceRequest {
  phone: string;
  isGroup?: boolean;
  all?: boolean;
}

export interface SetOnlinePresenceRequest {
  isOnline: boolean;
}

// Catalog & Business Types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images: string[];
}

export interface GetProductsRequest {
  catalogId: string;
}

// Community Types
export interface Community {
  id: string;
  name: string;
  description?: string;
  groups: string[];
}

// Label Types
export interface Label {
  id: string;
  name: string;
  color: number;
}

export interface AddLabelRequest {
  labelId: string;
  phone: string;
  isGroup?: boolean;
}

export interface RemoveLabelRequest {
  labelId: string;
  phone: string;
  isGroup?: boolean;
}

// Misc Types
export interface ClearSessionDataRequest {
  session: string;
}

export interface PlatformInfo {
  platform: string;
  phoneManufacturer: string;
  phoneModel: string;
}

// Error Types
export interface WhatsAppAPIErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

// List Message Types
export interface SendListMessageRequest {
  phone: string;
  isGroup?: boolean;
  description: string;
  buttonText: string;
  sections: ListSection[];
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface ListRow {
  rowId: string;
  title: string;
  description?: string;
}

// Poll Message Types
export interface SendPollMessageRequest {
  phone: string;
  isGroup?: boolean;
  name: string;
  choices: string[];
  options?: {
    selectableCount?: number;
  };
}

// Order Message Types
export interface SendOrderMessageRequest {
  phone: string;
  isGroup?: boolean;
  items: OrderItem[];
  options?: {
    tax?: number;
    shipping?: number;
    discount?: number;
  };
}

export interface OrderItem {
  type: 'custom' | 'product';
  name?: string;
  id?: string;
  price: number;
  qnt: number;
}

// Message Actions Types
export interface DeleteMessageRequest {
  phone: string;
  isGroup?: boolean;
  messageId: string;
  onlyLocal?: boolean;
  deleteMediaInDevice?: boolean;
}

export interface ReactMessageRequest {
  msgId: string;
  reaction: string;
}

export interface ForwardMessageRequest {
  phone: string;
  isGroup?: boolean;
  messageId: string;
}

export interface MarkUnseenRequest {
  phone: string;
  isGroup?: boolean;
}

export interface SendContactVcardRequest {
  phone: string;
  isGroup?: boolean;
  name: string;
  contactsId: string[];
}

export interface GetMessagesRequest {
  phone: string;
  count?: number;
  direction?: 'before' | 'after';
  id?: string;
}

export interface PollVoteInfo {
  voters: string[];
  timestamp: number;
}

// Chat Extended Types
export interface ListChatsRequest {
  id?: string;
  count?: number;
  direction?: 'before' | 'after';
  onlyGroups?: boolean;
  onlyUsers?: boolean;
  onlyWithUnreadMessage?: boolean;
  withLabels?: string[];
}

export interface PinChatRequest {
  phone: string;
  isGroup?: boolean;
  state: boolean;
}

export interface MuteChatRequest {
  phone: string;
  isGroup?: boolean;
  time: number;
  type: 'hours' | 'days' | 'weeks' | 'months';
}

export interface ChatStateRequest {
  phone: string;
  isGroup?: boolean;
  state: 'typing' | 'recording' | 'available';
}

export interface OnlineStatus {
  isOnline: boolean;
  lastSeen?: number;
}

// Group Extended Types
export interface GroupDescriptionRequest {
  groupId: string;
  description: string;
}

export interface GroupSubjectRequest {
  groupId: string;
  title: string;
}

export interface GroupPropertyRequest {
  groupId: string;
  property: string;
  value: boolean;
}

export interface MessagesAdminsOnlyRequest {
  groupId: string;
  value: boolean;
}

export interface ChangePrivacyGroupRequest {
  groupId: string;
  status: boolean;
}

export interface GroupInfoFromInviteLinkRequest {
  inviteCode: string;
}

export interface CommonGroupsRequest {
  wid: string;
}

// Catalog & Business Types
export interface AddProductRequest {
  name: string;
  image: string;
  description: string;
  price: string;
  url: string;
  retailerId: string;
  currency: string;
}

export interface EditProductRequest {
  id: string;
  options: Record<string, unknown>;
}

export interface DeleteProductRequest {
  id: string;
}

export interface ChangeProductImageRequest {
  id: string;
  base64: string;
}

export interface AddProductImageRequest {
  id: string;
  base64: string;
}

export interface RemoveProductImageRequest {
  id: string;
  index: number;
}

export interface CreateCollectionRequest {
  name: string;
  products: string[];
}

export interface EditCollectionRequest {
  id: string;
  options: Record<string, unknown>;
}

export interface DeleteCollectionRequest {
  id: string;
}

export interface SendLinkCatalogRequest {
  phones: string[];
  message: string;
}

export interface SetProductVisibilityRequest {
  id: string;
  value: boolean;
}

export interface SetCartEnabledRequest {
  enabled: boolean;
}

// Status/Stories Types
export interface SendTextStorieRequest {
  text: string;
  options?: {
    backgroundColor?: string;
    font?: number;
  };
}

export interface SendImageStorieRequest {
  path: string;
}

export interface SendVideoStorieRequest {
  path: string;
}

// Call Types
export interface RejectCallRequest {
  callId: string;
}

// Community Types
export interface CreateCommunityRequest {
  name: string;
  description?: string;
  groupIds?: string[];
}

export interface DeactivateCommunityRequest {
  id: string;
}

export interface AddCommunitySubgroupRequest {
  id: string;
  groupsIds: string[];
}

export interface RemoveCommunitySubgroupRequest {
  id: string;
  groupsIds: string[];
}

export interface PromoteCommunityParticipantRequest {
  id: string;
  participantsId: string[];
}

export interface DemoteCommunityParticipantRequest {
  id: string;
  participantsId: string[];
}

export interface CommunityInfo {
  id: string;
  name: string;
  description?: string;
  subgroups?: string[];
  participants?: CommunityParticipant[];
}

export interface CommunityParticipant {
  id: string;
  isAdmin: boolean;
}

// Response Types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
