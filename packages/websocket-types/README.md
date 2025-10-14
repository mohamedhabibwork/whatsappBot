# @repo/websocket-types

Strongly-typed WebSocket message types and translations.

## Features

- Comprehensive WebSocket message types
- Multi-language support (EN, AR)
- Type-safe message handling
- Translation utilities

## Usage

```typescript
import {
  type WebSocketMessage,
  type ConnectedMessage,
  type ErrorMessage,
  getMessage,
  getErrorMessage,
} from "@repo/websocket-types";

// Type-safe message creation
const connectedMsg: ConnectedMessage = {
  type: "connected",
  payload: {
    clientId: "123",
    authenticated: true,
  },
  timestamp: new Date().toISOString(),
};

// Get translated messages
const message = getMessage("connected", "ar"); // 'متصل بالخادم'
const error = getErrorMessage("unauthorized", "en"); // 'Unauthorized access'
```
