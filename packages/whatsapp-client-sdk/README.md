# WhatsApp Client SDK

A fully-typed TypeScript SDK for the WPPConnect WhatsApp API server.

## Features

- ✅ **Strongly Typed** - Full TypeScript support with comprehensive type definitions
- ✅ **Modern API** - Promise-based async/await interface
- ✅ **Comprehensive** - Covers all WPPConnect API endpoints
- ✅ **Error Handling** - Robust error handling with custom error types
- ✅ **Clean Code** - Well-organized and maintainable codebase

## Installation

```bash
# If used as a workspace package
bun install
```

## Usage

### Initialize the Client

```typescript
import { WhatsAppClient } from '@repo/whatsapp-client-sdk';

const client = new WhatsAppClient({
  baseURL: 'http://localhost:21465',
  secretKey: 'THISISMYSECURETOKEN',
  session: 'NERDWHATS_AMERICA'
});
```

### Authentication

```typescript
// Generate token
const token = await client.auth.generateToken();

// Start session
await client.auth.startSession({
  webhook: 'https://your-webhook.com',
  waitQrCode: true
});

// Get QR code
const qrCode = await client.auth.getQRCode();

// Check connection
const status = await client.auth.checkConnection();

// Show all sessions
const sessions = await client.auth.showAllSessions();
```

### Sending Messages

```typescript
// Send text message
await client.messages.sendMessage({
  phone: '5521999999999',
  message: 'Hello from WhatsApp SDK!',
  isGroup: false
});

// Send image
await client.messages.sendImage({
  phone: '5521999999999',
  base64: 'base64-encoded-image',
  filename: 'image.jpg',
  caption: 'Check this out!',
  isGroup: false
});

// Send file
await client.messages.sendFile({
  phone: '5521999999999',
  base64: 'base64-encoded-file',
  filename: 'document.pdf',
  caption: 'Important document',
  isGroup: false
});

// Send voice message
await client.messages.sendVoice({
  phone: '5521999999999',
  path: '/path/to/audio.mp3',
  isGroup: false
});

// Send location
await client.messages.sendLocation({
  phone: '5521999999999',
  lat: '-22.9068',
  lng: '-43.1729',
  title: 'Rio de Janeiro',
  address: 'Av. N. S. de Copacabana',
  isGroup: false
});

// Reply to message
await client.messages.sendReply({
  phone: '5521999999999',
  message: 'Reply text',
  messageId: 'message-id-here',
  isGroup: false
});
```

### Contact Management

```typescript
// Get all contacts
const contacts = await client.contacts.getAllContacts();

// Get contact info
const contact = await client.contacts.getContact('5521999999999');

// Block contact
await client.contacts.blockContact('5521999999999');

// Unblock contact
await client.contacts.unblockContact('5521999999999');
```

### Group Management

```typescript
// Create group
const group = await client.groups.createGroup({
  name: 'My Group',
  participants: ['5521999999999@c.us', '5521888888888@c.us']
});

// Add participant
await client.groups.addParticipant({
  groupId: 'group-id@g.us',
  phone: '5521999999999'
});

// Remove participant
await client.groups.removeParticipant({
  groupId: 'group-id@g.us',
  phone: '5521999999999'
});

// Promote to admin
await client.groups.promoteParticipant({
  groupId: 'group-id@g.us',
  phone: '5521999999999'
});

// Update group info
await client.groups.updateGroupInfo({
  groupId: 'group-id@g.us',
  name: 'New Group Name'
});
```

### Profile Management

```typescript
// Get profile status
const status = await client.profile.getStatus();

// Set profile status
await client.profile.setStatus('Available');

// Get profile picture
const picture = await client.profile.getProfilePicture();

// Set profile picture
await client.profile.setProfilePicture('base64-image');
```

### Communities

```typescript
// Create community
const community = await client.community.createCommunity({
  name: 'My Community',
  description: 'Community description',
  groupIds: ['group1@g.us', 'group2@g.us']
});

// Add subgroups to community
await client.community.addCommunitySubgroup({
  id: 'community-id@g.us',
  groupsIds: ['group3@g.us']
});

// Remove subgroups from community
await client.community.removeCommunitySubgroup({
  id: 'community-id@g.us',
  groupsIds: ['group1@g.us']
});

// Promote participants to admin
await client.community.promoteCommunityParticipant({
  id: 'community-id@g.us',
  participantsId: ['5521999999999@c.us']
});

// Get community participants
const participants = await client.community.getCommunityParticipants('community-id@g.us');
```

### Miscellaneous

```typescript
// Subscribe to presence
await client.misc.subscribePresence({
  phone: '5521999999999',
  isGroup: false,
  all: false
});

// Set online presence
await client.misc.setOnlinePresence({
  isOnline: true
});

// Get platform from message
const platform = await client.misc.getPlatformFromMessage('message-id');
```

## API Reference

### Client Options

```typescript
interface WhatsAppClientOptions {
  baseURL: string;        // API base URL
  secretKey: string;      // Secret key for authentication
  session: string;        // Session name
  token?: string;         // Bearer token (optional)
  timeout?: number;       // Request timeout in ms (default: 30000)
}
```

## Error Handling

The SDK provides detailed error information:

```typescript
try {
  await client.messages.sendMessage({
    phone: '5521999999999',
    message: 'Hello!'
  });
} catch (error) {
  if (error instanceof WhatsAppAPIError) {
    console.error('API Error:', error.message);
    console.error('Status Code:', error.statusCode);
    console.error('Response:', error.response);
  }
}
```

## Supported Endpoints

### Auth
- Generate Token
- Start Session
- Start All Sessions
- Show All Sessions
- Check Connection
- Get QR Code
- Logout Session
- Close Session
- Status Session

### Messages
- Send Message
- Send Image
- Send File
- Send Sticker
- Send Voice
- Send Location
- Send Link Preview
- Send Mentioned
- Send Reply
- Edit Message
- Download Media
- Get Media by Message

### Chat
- Get All Chats
- Archive Chat
- Delete Chat
- Clear Messages
- Mark as Unread

### Contact
- Get All Contacts
- Get Contact
- Block Contact
- Unblock Contact
- Check Number Status

### Group
- Create Group
- Add Participant
- Remove Participant
- Promote Participant
- Demote Participant
- Update Group Info
- Get Group Invite Link

### Profile
- Get Status
- Set Status
- Get Profile Picture
- Set Profile Picture

### Community
- Create Community
- Deactivate Community
- Add Community Subgroup
- Remove Community Subgroup
- Promote Community Participant
- Demote Community Participant
- Get Community Participants

### Misc
- Subscribe Presence
- Set Online Presence
- Get Platform from Message
- Clear Session Data

## License

Private package for internal use.
