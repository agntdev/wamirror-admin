import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "./toolkit/session/redis.js";

export interface WhatsAppNumber {
  phoneNumber: string;
  displayName: string;
  registrationStatus: "pending" | "active" | "inactive";
}

export interface MirroredMessage {
  id: string;
  timestamp: number;
  direction: "incoming" | "outgoing";
  senderId: string;
  recipientId: string;
  messageText: string;
  mediaUrl?: string;
  mediaType?: string;
  messageId: string;
}

export interface AdminChat {
  chatId: string;
  adminUsers: number[];
  lastSyncTime: number;
}

export interface RetentionPolicy {
  days: number;
  lastUpdated: number;
}

// Use toolkit persistent storage (Redis-backed in production, in-memory for tests)
const durableStore = resolveSessionStorage<{
  whatsappNumbers: Record<string, WhatsAppNumber>;
  activeWhatsAppNumber: string | undefined;
  mirroredMessages: MirroredMessage[];
  adminChats: Record<string, AdminChat>;
  retentionPolicy: RetentionPolicy;
}>(undefined);

// Default in-memory state for when storage is not available
let inMemoryState = {
  whatsappNumbers: new Map<string, WhatsAppNumber>(),
  activeWhatsAppNumber: undefined as string | undefined,
  mirroredMessages: [] as MirroredMessage[],
  adminChats: new Map<string, AdminChat>(),
  retentionPolicy: { days: 30, lastUpdated: Date.now() } as RetentionPolicy,
};

async function getState() {
  try {
    const stored = await durableStore.read("durable");
    if (stored) {
      return {
        whatsappNumbers: new Map(Object.entries(stored.whatsappNumbers)),
        activeWhatsAppNumber: stored.activeWhatsAppNumber,
        mirroredMessages: stored.mirroredMessages,
        adminChats: new Map(Object.entries(stored.adminChats)),
        retentionPolicy: stored.retentionPolicy,
      };
    }
  } catch {
    // Fall through to in-memory
  }
  return inMemoryState;
}

async function saveState(state: typeof inMemoryState) {
  try {
    await durableStore.write("durable", {
      whatsappNumbers: Object.fromEntries(state.whatsappNumbers),
      activeWhatsAppNumber: state.activeWhatsAppNumber,
      mirroredMessages: state.mirroredMessages,
      adminChats: Object.fromEntries(state.adminChats),
      retentionPolicy: state.retentionPolicy,
    });
  } catch {
    // Fall back to in-memory
    inMemoryState = state;
  }
}

export async function getWhatsAppNumber(phoneNumber: string): Promise<WhatsAppNumber | undefined> {
  const state = await getState();
  return state.whatsappNumbers.get(phoneNumber);
}

export async function getActiveWhatsAppNumber(): Promise<WhatsAppNumber | undefined> {
  const state = await getState();
  if (!state.activeWhatsAppNumber) return undefined;
  return state.whatsappNumbers.get(state.activeWhatsAppNumber);
}

export async function setWhatsAppNumber(number: WhatsAppNumber): Promise<void> {
  const state = await getState();
  state.whatsappNumbers.set(number.phoneNumber, number);
  state.activeWhatsAppNumber = number.phoneNumber;
  await saveState(state);
}

export async function addMirroredMessage(msg: MirroredMessage): Promise<void> {
  const state = await getState();
  state.mirroredMessages.push(msg);
  await saveState(state);
}

export async function getMirroredMessages(opts?: {
  direction?: "all" | "incoming" | "outgoing";
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}): Promise<{ messages: MirroredMessage[]; total: number }> {
  const state = await getState();
  let filtered = [...state.mirroredMessages];

  if (opts?.direction && opts.direction !== "all") {
    filtered = filtered.filter((m) => m.direction === opts.direction);
  }
  if (opts?.startDate) {
    filtered = filtered.filter((m) => m.timestamp >= opts.startDate!);
  }
  if (opts?.endDate) {
    filtered = filtered.filter((m) => m.timestamp <= opts.endDate!);
  }

  filtered.sort((a, b) => b.timestamp - a.timestamp);

  const total = filtered.length;
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? 10;
  const messages = filtered.slice(offset, offset + limit);

  return { messages, total };
}

export async function getAdminChat(chatId: string): Promise<AdminChat | undefined> {
  const state = await getState();
  return state.adminChats.get(chatId);
}

export async function setAdminChat(chat: AdminChat): Promise<void> {
  const state = await getState();
  state.adminChats.set(chat.chatId, chat);
  await saveState(state);
}

export async function getRetentionPolicy(): Promise<RetentionPolicy> {
  const state = await getState();
  return state.retentionPolicy;
}

export async function setRetentionPolicy(policy: RetentionPolicy): Promise<void> {
  const state = await getState();
  state.retentionPolicy = policy;
  await saveState(state);
}

export function now(): number {
  return Date.now();
}
