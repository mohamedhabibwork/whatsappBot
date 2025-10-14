# WhatsApp Client SDK - Complete API Reference

## Table of Contents

1. [Authentication](#authentication)
2. [Messages](#messages)
3. [Chat](#chat)
4. [Contacts](#contacts)
5. [Groups](#groups)
6. [Profile](#profile)
7. [Business & Catalog](#business--catalog)
8. [Stories](#stories)
9. [Communities](#communities)
10. [Miscellaneous](#miscellaneous)

---

## Authentication

### `auth.generateToken()`
Generate an authentication token for the session.

```typescript
const { token } = await client.auth.generateToken();
client.setAuthToken(token);
```

### `auth.startSession(options?)`
Start a WhatsApp session with optional configuration.

```typescript
await client.auth.startSession({
  webhook: 'https://your-webhook.com',
  waitQrCode: true,
  proxy: {
    url: 'proxy-host',
    username: 'username',
    password: 'password'
  }
});
```

### `auth.getQRCode()`
Get QR code for session authentication.

```typescript
const qrCode = await client.auth.getQRCode();
```

### `auth.checkConnection()`
Check current connection status.

### `auth.getSessionStatus()`
Get detailed session status.

### `auth.logoutSession()`
Logout and delete session data.

### `auth.closeSession()`
Close session without deleting data.

---

## Messages

### Text Messages

#### `messages.sendMessage(request)`
Send a text message.

```typescript
await client.messages.sendMessage({
  phone: '5521999999999',
  message: 'Hello!',
  isGroup: false,
  options: {
    quotedMsg: 'message-id' // Optional: reply to message
  }
});
```

#### `messages.editMessage(request)`
Edit a previously sent message.

```typescript
await client.messages.editMessage({
  id: 'message-id',
  newText: 'Updated message text'
});
```

### Media Messages

#### `messages.sendImage(request)`
Send an image message.

```typescript
await client.messages.sendImage({
  phone: '5521999999999',
  base64: 'base64-encoded-image',
  filename: 'image.jpg',
  caption: 'Check this out!',
  isGroup: false
});
```

#### `messages.sendFile(request)`
Send a file message.

```typescript
await client.messages.sendFile({
  phone: '5521999999999',
  base64: 'base64-encoded-file',
  filename: 'document.pdf',
  caption: 'Important document',
  isGroup: false
});
```

#### `messages.sendVoice(request)`
Send a voice message.

```typescript
await client.messages.sendVoice({
  phone: '5521999999999',
  path: '/path/to/audio.mp3',
  isGroup: false
});
```

#### `messages.sendSticker(request)`
Send a sticker.

```typescript
await client.messages.sendSticker({
  phone: '5521999999999',
  path: '/path/to/sticker.webp',
  isGroup: false
});
```

#### `messages.sendStickerGif(request)`
Send an animated sticker (GIF).

### Interactive Messages

#### `messages.sendListMessage(request)`
Send a list message with selectable options.

```typescript
await client.messages.sendListMessage({
  phone: '5521999999999',
  description: 'Choose an option',
  buttonText: 'Select',
  sections: [{
    title: 'Section 1',
    rows: [{
      rowId: 'option1',
      title: 'Option 1',
      description: 'Description for option 1'
    }]
  }],
  isGroup: false
});
```

#### `messages.sendPollMessage(request)`
Send a poll message.

```typescript
await client.messages.sendPollMessage({
  phone: '5521999999999',
  name: 'Poll question',
  choices: ['Option 1', 'Option 2', 'Option 3'],
  options: {
    selectableCount: 1
  },
  isGroup: false
});
```

#### `messages.sendOrderMessage(request)`
Send an order message.

```typescript
await client.messages.sendOrderMessage({
  phone: '5521999999999',
  items: [{
    type: 'custom',
    name: 'Product',
    price: 10000,
    qnt: 2
  }],
  options: {
    tax: 1000,
    shipping: 500,
    discount: 2000
  },
  isGroup: false
});
```

### Special Messages

#### `messages.sendLocation(request)`
Send location message.

```typescript
await client.messages.sendLocation({
  phone: '5521999999999',
  lat: '-22.9068',
  lng: '-43.1729',
  title: 'Rio de Janeiro',
  address: 'Copacabana Beach',
  isGroup: false
});
```

#### `messages.sendLinkPreview(request)`
Send a link with preview.

```typescript
await client.messages.sendLinkPreview({
  phone: '5521999999999',
  url: 'https://github.com',
  caption: 'Check this out!',
  isGroup: false
});
```

#### `messages.sendMentioned(request)`
Send message with mentions (groups only).

```typescript
await client.messages.sendMentioned({
  phone: 'group-id@g.us',
  message: '@5521999999999 check this!',
  mentioned: ['5521999999999@c.us'],
  isGroup: true
});
```

#### `messages.sendContactVcard(request)`
Send contact vCard.

```typescript
await client.messages.sendContactVcard({
  phone: '5521999999999',
  name: 'John Doe',
  contactsId: ['5521888888888'],
  isGroup: false
});
```

#### `messages.sendReply(request)`
Reply to a specific message.

```typescript
await client.messages.sendReply({
  phone: '5521999999999',
  message: 'Reply text',
  messageId: 'message-id',
  isGroup: false
});
```

### Message Actions

#### `messages.deleteMessage(request)`
Delete a message.

```typescript
await client.messages.deleteMessage({
  phone: '5521999999999',
  messageId: 'message-id',
  onlyLocal: false, // true = delete only for you
  deleteMediaInDevice: true,
  isGroup: false
});
```

#### `messages.reactMessage(request)`
React to a message with emoji.

```typescript
await client.messages.reactMessage({
  msgId: 'message-id',
  reaction: '👍'
});
```

#### `messages.forwardMessages(request)`
Forward a message.

```typescript
await client.messages.forwardMessages({
  phone: '5521999999999',
  messageId: 'message-id',
  isGroup: false
});
```

#### `messages.markUnseen(request)`
Mark chat as unseen.

```typescript
await client.messages.markUnseen({
  phone: '5521999999999',
  isGroup: false
});
```

### Media Operations

#### `messages.downloadMedia(request)`
Download media from a message.

```typescript
const media = await client.messages.downloadMedia({
  messageId: 'message-id'
});
// Returns: { base64: string, mimetype: string }
```

#### `messages.getMediaByMessage(messageId)`
Get media by message ID.

### Message Queries

#### `messages.getMessages(phone, params?)`
Get messages from a chat.

```typescript
const messages = await client.messages.getMessages('5521999999999', {
  count: 20,
  direction: 'before',
  id: 'message-id' // optional: start from this message
});
```

#### `messages.getPollVotes(messageId)`
Get poll votes for a poll message.

#### `messages.getAllUnreadMessages()`
Get all unread messages.

#### `messages.getAllNewMessages()`
Get all new messages.

---

## Chat

### Chat Operations

#### `chat.getAllChats()`
Get all chats.

#### `chat.listChats(request?)`
List chats with filters.

```typescript
const chats = await client.chat.listChats({
  count: 20,
  direction: 'after',
  onlyGroups: false,
  onlyUsers: false,
  onlyWithUnreadMessage: false,
  withLabels: []
});
```

#### `chat.getChatById(phone, isGroup?)`
Get specific chat by ID.

#### `chat.getAllChatsArchived()`
Get all archived chats.

### Chat State

#### `chat.archiveChat(request)`
Archive or unarchive a chat.

```typescript
await client.chat.archiveChat({
  phone: '5521999999999',
  isGroup: false,
  archive: true
});
```

#### `chat.pinChat(request)`
Pin or unpin a chat.

```typescript
await client.chat.pinChat({
  phone: '5521999999999',
  isGroup: false,
  state: true // true = pin, false = unpin
});
```

#### `chat.sendMute(request)`
Mute a chat.

```typescript
await client.chat.sendMute({
  phone: '5521999999999',
  isGroup: false,
  time: 8,
  type: 'hours' // 'hours' | 'days' | 'weeks' | 'months'
});
```

#### `chat.listMutes(type?)`
List all muted chats.

```typescript
const muted = await client.chat.listMutes('all'); // 'all' | 'chats' | 'groups'
```

### Chat Actions

#### `chat.deleteChat(request)`
Delete a chat.

```typescript
await client.chat.deleteChat({
  phone: '5521999999999',
  isGroup: false
});
```

#### `chat.clearMessages(request)`
Clear all messages in a chat.

```typescript
await client.chat.clearMessages({
  phone: '5521999999999',
  isGroup: false
});
```

#### `chat.markAsUnread(request)`
Mark chat as unread.

#### `chat.sendSeen(phone, isGroup?)`
Send read receipt.

```typescript
await client.chat.sendSeen('5521999999999', false);
```

#### `chat.setChatState(request)`
Set chat state (typing, recording, available).

```typescript
await client.chat.setChatState({
  phone: '5521999999999',
  isGroup: false,
  state: 'typing' // 'typing' | 'recording' | 'available'
});
```

### Bulk Operations

#### `chat.archiveAllChats()`
Archive all chats.

#### `chat.clearAllChats()`
Clear all chats.

#### `chat.deleteAllChats()`
Delete all chats.

### Status Queries

#### `chat.chatIsOnline(phone)`
Check if contact is online.

```typescript
const status = await client.chat.chatIsOnline('5521999999999');
// Returns: { isOnline: boolean, lastSeen?: number }
```

#### `chat.getLastSeen(phone)`
Get last seen time of contact.

#### `chat.getAllMessagesInChat(phone, params?)`
Get all messages in a specific chat.

#### `chat.getMessageById(messageId)`
Get specific message by ID.

---

## Contacts

### Contact Operations

#### `contacts.getAllContacts()`
Get all contacts.

#### `contacts.getContact(phone)`
Get specific contact information.

#### `contacts.getContactProfilePicture(phone)`
Get contact's profile picture.

### Contact Management

#### `contacts.checkNumberStatus(request)`
Check if number is registered on WhatsApp.

```typescript
const status = await client.contacts.checkNumberStatus({
  phone: '5521999999999'
});
// Returns: { numberExists: boolean, id: string }
```

#### `contacts.blockContact(request)`
Block a contact.

```typescript
await client.contacts.blockContact({
  phone: '5521999999999'
});
```

#### `contacts.unblockContact(request)`
Unblock a contact.

#### `contacts.getAllBlockedContacts()`
Get all blocked contacts.

---

## Groups

### Group Management

#### `groups.createGroup(request)`
Create a new group.

```typescript
const group = await client.groups.createGroup({
  name: 'My Group',
  participants: ['5521999999999@c.us', '5521888888888@c.us']
});
```

#### `groups.getAllGroups()`
Get all groups.

#### `groups.getGroupInfo(groupId)`
Get group information.

#### `groups.getGroupMembers(groupId)`
Get group members.

#### `groups.getGroupMemberIds(groupId)`
Get group member IDs only.

#### `groups.getGroupAdmins(groupId)`
Get group admins.

#### `groups.getCommonGroups(wid)`
Get common groups with a contact.

### Participant Management

#### `groups.addParticipant(request)`
Add participant to group.

```typescript
await client.groups.addParticipant({
  groupId: 'group-id@g.us',
  phone: '5521999999999'
});
```

#### `groups.removeParticipant(request)`
Remove participant from group.

#### `groups.promoteParticipant(request)`
Promote participant to admin.

#### `groups.demoteParticipant(request)`
Demote admin to participant.

### Group Settings

#### `groups.updateGroupInfo(request)`
Update group name/description.

```typescript
await client.groups.updateGroupInfo({
  groupId: 'group-id@g.us',
  name: 'New Group Name',
  description: 'New description'
});
```

#### `groups.setGroupDescription(request)`
Set group description.

#### `groups.setGroupSubject(request)`
Set group subject (name).

#### `groups.setGroupPicture(request)`
Set group picture.

```typescript
await client.groups.setGroupPicture({
  groupId: 'group-id@g.us',
  base64: 'base64-image-data'
});
```

#### `groups.setGroupProperty(request)`
Set group property.

#### `groups.setMessagesAdminsOnly(request)`
Set messages to admins only.

```typescript
await client.groups.setMessagesAdminsOnly({
  groupId: 'group-id@g.us',
  value: true
});
```

#### `groups.changePrivacyGroup(request)`
Change group privacy settings.

### Group Invite

#### `groups.getGroupInviteLink(groupId)`
Get group invite link.

#### `groups.revokeGroupInviteLink(groupId)`
Revoke group invite link.

#### `groups.getGroupInfoFromInviteLink(inviteCode)`
Get group info from invite link.

#### `groups.joinGroupViaLink(inviteCode)`
Join group via invite code.

#### `groups.leaveGroup(groupId)`
Leave a group.

---

## Profile

### Profile Operations

#### `profile.getStatus()`
Get profile status.

#### `profile.setStatus(request)`
Set profile status.

```typescript
await client.profile.setStatus({
  status: 'Available'
});
```

#### `profile.getProfilePicture()`
Get profile picture.

#### `profile.setProfilePicture(request)`
Set profile picture.

```typescript
await client.profile.setProfilePicture({
  base64: 'base64-image-data'
});
```

#### `profile.removeProfilePicture()`
Remove profile picture.

#### `profile.getProfileName()`
Get profile name.

#### `profile.setProfileName(name)`
Set profile name.

---

## Business & Catalog

### Product Management

#### `business.getProducts(phone?, qnt?)`
Get products from catalog.

#### `business.getProductById(phone, id)`
Get specific product.

#### `business.addProduct(request)`
Add product to catalog.

```typescript
await client.business.addProduct({
  name: 'Product Name',
  image: 'base64-image',
  description: 'Product description',
  price: '9999',
  url: 'https://product-url.com',
  retailerId: 'SKU001',
  currency: 'BRL'
});
```

#### `business.editProduct(request)`
Edit a product.

#### `business.deleteProducts(request)`
Delete products.

### Product Images

#### `business.changeProductImage(request)`
Change product main image.

#### `business.addProductImage(request)`
Add additional product image.

#### `business.removeProductImage(request)`
Remove product image.

### Collections

#### `business.getCollections(phone?, qnt?, max?)`
Get collections.

#### `business.createCollection(request)`
Create a collection.

```typescript
await client.business.createCollection({
  name: 'Collection Name',
  products: ['product-id-1', 'product-id-2']
});
```

#### `business.editCollection(request)`
Edit a collection.

#### `business.deleteCollection(request)`
Delete a collection.

### Catalog Settings

#### `business.setProductVisibility(request)`
Set product visibility.

#### `business.setCartEnabled(request)`
Enable or disable cart.

---

## Stories

### Story Operations

#### `stories.sendTextStory(request)`
Send a text story.

```typescript
await client.stories.sendTextStory({
  text: 'My story text',
  options: {
    backgroundColor: '#0275d8',
    font: 2
  }
});
```

#### `stories.sendImageStory(request)`
Send an image story.

```typescript
await client.stories.sendImageStory({
  path: '/path/to/image.jpg'
});
```

#### `stories.sendVideoStory(request)`
Send a video story.

```typescript
await client.stories.sendVideoStory({
  path: '/path/to/video.mp4'
});
```

---

## Communities

### Community Management

#### `community.createCommunity(request)`
Create a new community.

```typescript
const community = await client.community.createCommunity({
  name: 'My Community',
  description: 'Community description',
  groupIds: ['group1@g.us', 'group2@g.us']
});
```

#### `community.deactivateCommunity(request)`
Deactivate a community.

```typescript
await client.community.deactivateCommunity({
  id: 'community-id@g.us'
});
```

### Community Subgroups

#### `community.addCommunitySubgroup(request)`
Add subgroups to a community.

```typescript
await client.community.addCommunitySubgroup({
  id: 'community-id@g.us',
  groupsIds: ['group3@g.us', 'group4@g.us']
});
```

#### `community.removeCommunitySubgroup(request)`
Remove subgroups from a community.

```typescript
await client.community.removeCommunitySubgroup({
  id: 'community-id@g.us',
  groupsIds: ['group1@g.us']
});
```

### Community Participants

#### `community.promoteCommunityParticipant(request)`
Promote participants to community admin.

```typescript
await client.community.promoteCommunityParticipant({
  id: 'community-id@g.us',
  participantsId: ['5521999999999@c.us', '5521888888888@c.us']
});
```

#### `community.demoteCommunityParticipant(request)`
Demote community admins to participants.

```typescript
await client.community.demoteCommunityParticipant({
  id: 'community-id@g.us',
  participantsId: ['5521999999999@c.us']
});
```

#### `community.getCommunityParticipants(communityId)`
Get all participants of a community.

```typescript
const participants = await client.community.getCommunityParticipants('community-id@g.us');
// Returns: CommunityParticipant[]
```

---

## Miscellaneous

### Presence

#### `misc.subscribePresence(request)`
Subscribe to presence updates.

```typescript
await client.misc.subscribePresence({
  phone: '5521999999999',
  isGroup: false,
  all: false
});
```

#### `misc.setOnlinePresence(request)`
Set online presence.

```typescript
await client.misc.setOnlinePresence({
  isOnline: true
});
```

### Device Information

#### `misc.getBatteryLevel()`
Get device battery level.

#### `misc.getPhoneInfo()`
Get phone information.

#### `misc.getWAVersion()`
Get WhatsApp Web version.

#### `misc.getPlatformFromMessage(messageId)`
Get platform info from message.

### Additional Features

#### `misc.takeScreenshot()`
Take screenshot of WhatsApp Web.

#### `misc.sendSeen(chatId)`
Send read receipt for chat.

#### `misc.setTyping(chatId, isTyping)`
Set typing indicator.

#### `misc.setRecording(chatId, isRecording)`
Set recording indicator.

#### `misc.getAllBroadcastList()`
Get all broadcast lists.

#### `misc.rejectCall(request)`
Reject an incoming call.

```typescript
await client.misc.rejectCall({
  callId: 'call-id'
});
```

---

## Error Handling

The SDK provides custom error types for better error handling:

```typescript
import {
  WhatsAppAPIError,
  WhatsAppAuthenticationError,
  WhatsAppValidationError,
  WhatsAppNetworkError,
} from '@repo/whatsapp-client-sdk';

try {
  await client.messages.sendMessage({
    phone: '5521999999999',
    message: 'Hello!'
  });
} catch (error) {
  if (error instanceof WhatsAppAuthenticationError) {
    console.error('Authentication failed');
    // Regenerate token
  } else if (error instanceof WhatsAppValidationError) {
    console.error('Validation error:', error.message);
  } else if (error instanceof WhatsAppNetworkError) {
    console.error('Network error:', error.originalError);
  } else if (error instanceof WhatsAppAPIError) {
    console.error('API error:', error.statusCode, error.response);
  }
}
```

---

## Type Definitions

All types are fully exported and can be imported:

```typescript
import type {
  SendMessageRequest,
  MessageResponse,
  Contact,
  GroupInfo,
  // ... and many more
} from '@repo/whatsapp-client-sdk';
```

For the complete list of types, refer to the `src/types/index.ts` file.
