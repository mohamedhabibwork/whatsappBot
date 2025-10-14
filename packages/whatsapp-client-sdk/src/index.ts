// Main client
export { WhatsAppClient } from './client';

// API modules
export { AuthAPI } from './api/auth';
export { MessagesAPI } from './api/messages';
export { ContactsAPI } from './api/contacts';
export { GroupsAPI } from './api/groups';
export { ChatAPI } from './api/chat';
export { ProfileAPI } from './api/profile';
export { MiscAPI } from './api/misc';
export { BusinessAPI } from './api/business';
export { StoriesAPI } from './api/stories';
export { CommunityAPI } from './api/community';

// Types
export type {
  WhatsAppClientOptions,
  // Auth types
  StartSessionRequest,
  SessionStatus,
  QRCodeResponse,
  SessionInfo,
  // Message types
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
  // Contact types
  Contact,
  CheckNumberStatusRequest,
  NumberStatus,
  BlockContactRequest,
  UnblockContactRequest,
  // Group types
  CreateGroupRequest,
  AddParticipantRequest,
  RemoveParticipantRequest,
  PromoteParticipantRequest,
  DemoteParticipantRequest,
  UpdateGroupInfoRequest,
  SetGroupPictureRequest,
  GroupInfo,
  GroupParticipant,
  GroupInviteLink,
  // Chat types
  Chat,
  Message,
  ArchiveChatRequest,
  DeleteChatRequest,
  ClearMessagesRequest,
  MarkAsUnreadRequest,
  // Profile types
  ProfileStatus,
  SetStatusRequest,
  ProfilePicture,
  SetProfilePictureRequest,
  // Presence types
  SubscribePresenceRequest,
  SetOnlinePresenceRequest,
  // Misc types
  PlatformInfo,
  // List Message types
  SendListMessageRequest,
  ListSection,
  ListRow,
  // Poll types
  SendPollMessageRequest,
  // Order types
  SendOrderMessageRequest,
  OrderItem,
  // Message Actions types
  DeleteMessageRequest,
  ReactMessageRequest,
  ForwardMessageRequest,
  MarkUnseenRequest,
  SendContactVcardRequest,
  GetMessagesRequest,
  PollVoteInfo,
  // Chat Extended types
  ListChatsRequest,
  PinChatRequest,
  MuteChatRequest,
  ChatStateRequest,
  OnlineStatus,
  // Group Extended types
  GroupDescriptionRequest,
  GroupSubjectRequest,
  GroupPropertyRequest,
  MessagesAdminsOnlyRequest,
  ChangePrivacyGroupRequest,
  GroupInfoFromInviteLinkRequest,
  CommonGroupsRequest,
  // Business types
  AddProductRequest,
  EditProductRequest,
  DeleteProductRequest,
  ChangeProductImageRequest,
  AddProductImageRequest,
  RemoveProductImageRequest,
  CreateCollectionRequest,
  EditCollectionRequest,
  DeleteCollectionRequest,
  SendLinkCatalogRequest,
  SetProductVisibilityRequest,
  SetCartEnabledRequest,
  // Stories types
  SendTextStorieRequest,
  SendImageStorieRequest,
  SendVideoStorieRequest,
  // Call types
  RejectCallRequest,
  // Community types
  CreateCommunityRequest,
  DeactivateCommunityRequest,
  AddCommunitySubgroupRequest,
  RemoveCommunitySubgroupRequest,
  PromoteCommunityParticipantRequest,
  DemoteCommunityParticipantRequest,
  CommunityInfo,
  CommunityParticipant,
  // Response types
  APIResponse,
  PaginatedResponse,
} from './types';

// Errors
export {
  WhatsAppAPIError,
  WhatsAppAuthenticationError,
  WhatsAppSessionError,
  WhatsAppValidationError,
  WhatsAppNetworkError,
} from './utils/errors';

// Utilities
export { HttpClient } from './utils/http-client';
