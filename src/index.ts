import { EventEmitter } from "events";
import { WebSocket } from "ws";

import { Close, Entity, Options, Ready, Reminder, User, Vote, OpCodes } from "./typings.js";

import { LRUCache } from "lru-cache";

const baseUrl = "api.websockets-topgg.com/v0";
// const baseUrl = "localhost:4100"
const websoscketBaseUrl = `wss://${baseUrl}/websocket`;
const apiBaseUrl = `https://${baseUrl}/api`;

enum StatusCodes {
  UNKNOWN_ERROR = 4000,
  AUTHENTICATION_FAILED = 4007,
  TOO_MANY_CONNECTIONS = 4005,
}

enum EmitEvents {
  READY = "ready",
  ERROR = "error",
  DISCONNECTED = "disconnected",
  VOTE = "vote",
  TEST = "test",
  REMINDER = "reminder",
}

export class TopWebsocket extends EventEmitter {
  private socketToken: string;
  private options: Options;
  private client: WebSocket | undefined;
  private pingTimeout: NodeJS.Timeout | undefined;
  private _status: "Connecting" | "Disconnected" | "Ready" = "Disconnected";
  private userCache = new LRUCache<string, User>({ ttl: 21600, max: 1000, maxSize: 1000 * 60 * 60 });
  private reconnectionAttempts = 0;
  private reconnectionDelay = 10000;
  public entityId: string | undefined;
  public lastMessageTimestamp: number | undefined;

  // Set of status codes for which reconnection should not be attempted
  private noReconnectStatusCodes = new Set([
    StatusCodes.AUTHENTICATION_FAILED,
    StatusCodes.TOO_MANY_CONNECTIONS,
  ]);



  on(event: "ready", listener: (ready: Ready) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "disconnected", listener: (data: Close) => void): this;
  on(event: "reminder", listener: (data: Reminder, messageTimestamp: number, lastMessageTimestamp: number | undefined) => void): this;
  on(event: "vote" | "test", listener: (data: Vote, messageTimestamp: number, lastMessageTimestamp: number | undefined) => void): this;

  /* 
    I'm not entirely sure how to handle this without using any.
    I'd love feedback to anyone looking at this mess.
  */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }
  /**
   * Create a new TopWebsocket instance
   *
   * @param {string} socketToken Socket token
   * @param {Options} [options] Websocket options and configuration of userCache
   */
  constructor(socketToken: string, options: Options = {}) {
    super();

    this.socketToken = socketToken;
    this.options = options;
    if (options.resume === undefined) options.resume = true;

    if (this.options.userCacheOptions) {
      this.userCache = new LRUCache(this.options.userCacheOptions);
    } else {
      this.userCache = new LRUCache({ max: 1000 });
    }

    if (options.name && options.name?.length > 32) {
      throw new Error("Name is too long, must be 32 characters or less");
    }
  }

  /**
   * Get the current status of the websocket
   * @returns {string} The current status of the websocket
   */
  get status(): string {
    return this._status;
  }

  private heartbeat = (): void => {
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(() => {
      this.client?.terminate();
      this.emit(EmitEvents.ERROR, new Error("Connection timed out"));
    }, 30000 + 2000);
  };
  /**
   * Connect to the websocket
   * @param {number} [lastMessageTimestamp] The timestamp of the last message received, used to resume a connection. IE all messages after the provided timestamp will be sent
   * @returns {void}
   */
  connect(lastMessageTimestamp: number | undefined = undefined): void {
    this._status = "Connecting";

    if (lastMessageTimestamp) {
      this.client = new WebSocket(websoscketBaseUrl, {
        headers: {
          authorization: this.socketToken,
          name: this.options.name || "Unnamed Websocket Client",
          lastMessageTimestamp,
          resume: "true"
        },
      });
    }
    else {
      this.client = new WebSocket(websoscketBaseUrl, {
        headers: {
          authorization: this.socketToken,
          name: this.options.name || "Unnamed Websocket Client",
        },
      });
    }

    this.setupEventHandlers();
  };

  private setupEventHandlers = (): void => {
    if (!this.client) return;

    this.client.on("open", () => {
      this.heartbeat;
    });

    this.client.on("error", (error) => {
      this.emit(EmitEvents.ERROR, error);
    });
    this.client.on("ping", this.heartbeat);

    this.client.on("close", this.handleClose);

    this.client.on("message", this.handleMessage);
  };

  private handleClose = (code: number, reason: string): void => {
    this._status = "Disconnected";
    let message = "Connection closed";
    let documentationLink;

    switch (code) {
      case StatusCodes.AUTHENTICATION_FAILED:
        message += ": Authentication failed";
        documentationLink = "http://localhost:3000/docs/status-codes#authentication-failed";
        break;
      case StatusCodes.TOO_MANY_CONNECTIONS:
        message += ": Too many connections";
        documentationLink = "http://localhost:3000/docs/status-codes#connection-limit";
        break;
      default:
        message += ": Unknown reason";
        break;
    }

    clearTimeout(this.pingTimeout);

    const willReconnect = !this.noReconnectStatusCodes.has(code) && this.reconnectionAttempts < 5;

    this.emit(EmitEvents.DISCONNECTED, {
      code,
      reason: reason.toString(),
      message,
      documentationLink,
      reconnecting: willReconnect,
      reconnectionAttempts: this.reconnectionAttempts,
      reconnectionDelay: this.reconnectionDelay,
    });

    if (willReconnect) {
      setTimeout(() => {
        if (this.options.resume && this.lastMessageTimestamp) this.connect(this.lastMessageTimestamp);
        else this.connect();
      }, this.reconnectionDelay);

      this.reconnectionDelay *= 2;
      this.reconnectionAttempts += 1;
    }
  };

  private handleMessage = (data: Buffer): void => {
    const receivedMessage = this.parseBufferToJson(data) as {
      op: OpCodes;
      d: unknown;
      ts?: number;
    };

    switch (receivedMessage.op) {
      case OpCodes.READY:
        this._status = "Ready";
        this.entityId = (receivedMessage.d as Ready).entityId;
        this.reconnectionAttempts = 0;
        this.emit(EmitEvents.READY, receivedMessage.d);
        break;

      case OpCodes.VOTE:
        this.emit(EmitEvents.VOTE, (receivedMessage.d as Vote), receivedMessage.ts, this.lastMessageTimestamp);
        this.lastMessageTimestamp = receivedMessage.ts;
        this.userCache.set((receivedMessage.d as Vote).user.id, (receivedMessage.d as Vote).user);
        break;

      case OpCodes.TEST:
        this.emit(EmitEvents.TEST, (receivedMessage.d as Vote), receivedMessage.ts, this.lastMessageTimestamp);
        this.lastMessageTimestamp = receivedMessage.ts;
        break;

      case OpCodes.REMINDER:
        this.emit(EmitEvents.REMINDER, receivedMessage.d, receivedMessage.ts, this.lastMessageTimestamp);
        this.lastMessageTimestamp = receivedMessage.ts;
        this.userCache.set((receivedMessage.d as Reminder).user.id, (receivedMessage.d as Reminder).user);
        break;

      default:
        this.emit(EmitEvents.ERROR, {
          error: new Error("unknown message received"),
          message: receivedMessage,
        });
        break;
    }
  };

  private parseBufferToJson(buffer: Buffer): unknown {
    try {
      return JSON.parse(buffer.toString("utf-8"));
    } catch (error) {
      console.error("Invalid JSON:", error);
      return null;
    }
  }


  /**
   * Get User
   * @param {string} userId The user's ID
   * @param {boolean} [ignoreCache] When true ignore the cache and fetch directly from the API
   * @returns {Promise<User>} The user
   */
  getUser = async (userId: string, ignoreCache: boolean = false): Promise<User> => {
    if (!ignoreCache) {
      // Check if the user is in the cache
      const cachedUser = this.userCache.get(userId);

      if (cachedUser) return cachedUser;
    }
    // send http request to get user
    const res = await this.fetchRequest(`/user/${userId}`, "GET");

    const user = await res.json();
    // Store the user in the cache
    this.userCache.set(userId, user);

    return user;
  };

  /**
   * Get Entity
   * @returns {Promise<Entity>} and entity
   */
  getEntity = async (): Promise<Entity> => {
    // send http request to get user and entity
    const res = await fetch(`${apiBaseUrl}/entity`, {
      headers: { Authorization: this.socketToken },
    });

    return await res.json();
  };

  /**
   * User Voted within past 12 hours
   * @param {string} userId The user's ID
   * @param {boolean} ignoreCache When true ignore the cache and fetch directly from the API
   * @returns {Promise<boolean>} Whether the user has voted in the past 12 hours
   */
  userVoted = async (userId: string, ignoreCache: boolean = false): Promise<boolean> => {
    const user = await this.getUser(userId, ignoreCache);

    const lastVoted = new Date(user.lastVoted);
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    return lastVoted > twelveHoursAgo;
  };

  /**
    * Set user reminders
    * @param {string} userId The user's ID
    * @param {boolean} enable Whether to enable or disable reminders
    * @returns {Promise<User | undefined>}
  */
  setReminders = async (userId: string, enable: boolean): Promise<User | undefined> => {
    const res = await this.fetchRequest(`/user/${userId}/reminders`, "PATCH", {
      enable,
    });

    if (res.status === 404) return undefined;
    return await res.json();
  };

  /**
   * Function send a fetch request
   * @param {string} path The URL to send the request to
   * @param {string} method The method of the request
   * @param {object} body The body of the request
   */
  private fetchRequest = async (path: string, method: string, body?: object): Promise<Response> => {
    return await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: {
        Authorization: this.socketToken,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : null,
    });
  };
}
