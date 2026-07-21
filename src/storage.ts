import type { StorageAdapter } from "grammy";

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

const whatsappNumbers = new Map<string, WhatsAppNumber>();
let activeWhatsAppNumber: string | undefined;
const mirroredMessages: MirroredMessage[] = [];
const adminChats = new Map<string, AdminChat>();
let retentionPolicy: RetentionPolicy = { days: 30, lastUpdated: Date.now() };

export async function getWhatsAppNumber(phoneNumber: string): Promise<WhatsAppNumber | undefined> {
  return whatsappNumbers.get(phoneNumber);
}

export async function getActiveWhatsAppNumber(): Promise<WhatsAppNumber | undefined> {
  if (!activeWhatsAppNumber) return undefined;
  return whatsappNumbers.get(activeWhatsAppNumber);
}

export async function setWhatsAppNumber(number: WhatsAppNumber): Promise<void> {
  whatsappNumbers.set(number.phoneNumber, number);
  activeWhatsAppNumber = number.phoneNumber;
}

export async function addMirroredMessage(msg: MirroredMessage): Promise<void> {
  mirroredMessages.push(msg);
}

export async function getMirroredMessages(opts?: {
  direction?: "all" | "incoming" | "outgoing";
  startDate?: number;
  endDate?: number;
  limit?: number;
  offset?: number;
}): Promise<{ messages: MirroredMessage[]; total: number }> {
  let filtered = [...mirroredMessages];

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
  return adminChats.get(chatId);
}

export async function setAdminChat(chat: AdminChat): Promise<void> {
  adminChats.set(chat.chatId, chat);
}

export async function getRetentionPolicy(): Promise<RetentionPolicy> {
  return retentionPolicy;
}

export async function setRetentionPolicy(policy: RetentionPolicy): Promise<void> {
  retentionPolicy = policy;
}

export function now(): number {
  return Date.now();
}
