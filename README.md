# WebSockets-TopGG

A WebSocket client for [websockets-topgg.com](https://websockets-topgg.com) that transforms Top.gg webhooks into a continuous WebSocket connection. It offers advanced features such as vote tracking, reminders, and streak management to help you engage with your community seamlessly.

## Features

- **Real-time WebSocket Connection:** Maintain a persistent connection with Top.gg to receive events instantly.
- **Vote Tracking:** Monitor and manage user votes with detailed tracking of overall, monthly, and streak votes.
- **Reminders:** Automatically send reminders to users when they can vote again.

## Installation

Install the package via npm:

```bash
npm install websockets-topgg
```

## Usage

### Example Script

```typescript
import { TopWebsocket } from "../src/index";

console.log("Starting example...");

const topWebsocket = new TopWebsocket("YOUR_SOCKET_TOKEN_HERE", {
  name: "Hello",
});

topWebsocket.connect();

topWebsocket.on("ready", (data) => {
  console.log("Websocket is ready");
});

topWebsocket.on("error", (error) => {
  console.error("Error:", error);
});

topWebsocket.on("vote", async (vote) => {
  console.log(`User: ${vote.user.id} just voted!`);
});

topWebsocket.on("test", async (vote) => {
  console.log(`User: ${vote.user.id} just tested!`);
});

topWebsocket.on("reminder", async (reminder) => {
  console.log(`User: ${reminder.user.id} can vote again!`);
});
```

## API

### `TopWebsocket`

Creates a new WebSocket client instance.

**Constructor:**

```typescript
new TopWebsocket(socketToken: string, options?: Options)
```

- `socketToken`: Websocket-Topgg socket Token.
- `options`: Configuration options defined in `typings.ts`.

**Events:**

- **`ready`**: Emitted when the WebSocket connection is ready.

  ```typescript
  topWebsocket.on("ready", (data) => { /* ... */ });
  ```

- **`disconnected`**: Emitted when disconnected from the WebSocket.

  ```typescript
  topWebsocket.on("disconnected", (disconnection) => { /* ... */ });
  ```

- **`error`**: Emitted on encountering an error.

  ```typescript
  topWebsocket.on("error", (error) => { /* ... */ });
  ```

- **`vote`**: Emitted when a user votes.

  ```typescript
  topWebsocket.on("vote", async (vote) => { /* ... */ });
  ```

- **`test`**: Emitted on test events.

  ```typescript
  topWebsocket.on("test", async (vote) => { /* ... */ });
  ```

- **`reminder`**: Emitted when a user can vote again.

  ```typescript
  topWebsocket.on("reminder", async (reminder) => { /* ... */ });
  ```

**Methods:**

- **`connect()`**: Establishes the WebSocket connection.

  ```typescript
  topWebsocket.connect();
  ```

- **`getUser(userId: string, ignoreCache?: boolean)`**: Fetches user information.

  ```typescript
  topWebsocket.getUser("user-id")
  ```

- **`getEntity()`**: Fetches entity information.

  ```typescript
  topWebsocket.getEntity()
  ```

- **`userVoted(userId: string, ignoreCache?: boolean)`**: Checks if a user has voted in the past 12 hours.

  ```typescript
  topWebsocket.userVoted("user-id")
  ```

- **`setReminders(userId: string, enable: boolean)`**: Enables or disables reminders for a user.

  ```typescript
  topWebsocket.setReminders("user-id", true)
  ```


## Configuration Options

Defined in `typings.ts`, the `Options` type allows you to customize the WebSocket client:

```typescript
export type Options = {
  userCacheOptions?: LRUCache.Options<string, User, unknown>;
  name?: string;
  resume?: boolean;
};
```

- **`userCacheOptions`**: Configure caching options.
- **`name`**: Name for the WebSocket client.
- **`resume`**: Enable session resume. Default true.


# Support

For Support try our Discord server first! [Join Our Discord Server](https://discord.gg/SMYQ7xXQKd)
For any questions or support, please reach out via the [GitHub Issues Page](https://github.com/Team-Woo/websockets-topgg/issues).