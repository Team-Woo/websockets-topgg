import { LRUCache } from "lru-cache";

export enum OpCodes {
  READY = 3,
  VOTE = 10,
  TEST = 11,
  REMINDER = 12,
}

export type Options = {
  debug?: boolean;
  userCacheOptions?: LRUCache.Options<string, User, unknown>;
  name?: string;
  entityId?: string;
  resume?: boolean;
};

export type User = {
  id: string;
  canVoteAt: Date;
  overallVotes: number;
  monthlyVotes: number;
  streakCount: number;
  lastVoted: Date;
  remindersEnabled: boolean;
};

export type Entity = {
  id: string;
  overallVotes: number;
  monthlyVotes: number;
  remindersEnabled: boolean;
  remindersBanned: boolean;
  remindersBannedReason: string;
};

export type Vote = {
  user: User;
  entity: Entity;
  isWeekend: boolean;
  query?: string;
};

export type Reminder = {
  user: User;
  entity: Entity;
  isWeekend: boolean;
};

export type Close = {
  code: number;
  reason: string;
  message: string;
  documentationLink: string | undefined;
  reconnecting: boolean;
  reconnectionAttempts: number;
};

export type Ready = {
  name: string;
  connectionId: string;
  entityId: string;
};
