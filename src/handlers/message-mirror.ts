import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { addMirroredMessage, getAdminChat, getActiveWhatsAppNumber } from "../storage.js";
import { now } from "../storage.js";

registerMainMenuItem({ label: "📤 Mirror Message", data: "mirror:send", order: 25 });

const composer = new Composer<Ctx>();

export async function mirrorWhatsAppMessage(
  bot: { api: Ctx["api"] },
  msg: {
    direction: "incoming" | "outgoing";
    senderId: string;
    recipientId: string;
    messageText: string;
    mediaUrl?: string;
    mediaType?: string;
    messageId: string;
  },
): Promise<boolean> {
  const adminChat = await getAdminChat("");
  if (!adminChat) return false;

  const stored = {
    id: `msg_${msg.messageId}_${now()}`,
    timestamp: now(),
    direction: msg.direction,
    senderId: msg.senderId,
    recipientId: msg.recipientId,
    messageText: msg.messageText,
    mediaUrl: msg.mediaUrl,
    mediaType: msg.mediaType,
    messageId: msg.messageId,
  };

  await addMirroredMessage(stored);

  const dir = msg.direction === "incoming" ? "⬇️ Incoming" : "⬆️ Outgoing";
  const caption = `${dir}\nFrom: ${msg.senderId}\nTo: ${msg.recipientId}\n\n${msg.messageText}`;

  try {
    if (msg.mediaUrl && msg.mediaType) {
      if (msg.mediaType.startsWith("image/")) {
        await bot.api.sendPhoto(adminChat.chatId, msg.mediaUrl, { caption });
      } else if (msg.mediaType.startsWith("video/")) {
        await bot.api.sendVideo(adminChat.chatId, msg.mediaUrl, { caption });
      } else if (msg.mediaType.startsWith("audio/")) {
        await bot.api.sendAudio(adminChat.chatId, msg.mediaUrl, { caption });
      } else {
        await bot.api.sendDocument(adminChat.chatId, msg.mediaUrl, { caption });
      }
    } else {
      await bot.api.sendMessage(adminChat.chatId, caption);
    }
    return true;
  } catch {
    return false;
  }
}

composer.callbackQuery("mirror:send", async (ctx) => {
  await ctx.answerCallbackQuery();
  const number = await getActiveWhatsAppNumber();
  if (!number) {
    await ctx.reply("No WhatsApp number registered yet. Tap Register WhatsApp first.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  ctx.session.step = "awaiting_mirror_message";
  await ctx.reply("Type a message to mirror to the admin chat (simulates a WhatsApp message):", {
    reply_markup: { force_reply: true, input_field_placeholder: "Message to mirror..." },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_mirror_message") return next();

  const text = ctx.message.text.trim();
  ctx.session.step = undefined;

  const success = await mirrorWhatsAppMessage(
    { api: ctx.api },
    {
      direction: "incoming",
      senderId: "whatsapp_user",
      recipientId: "admin",
      messageText: text,
      messageId: String(Date.now()),
    },
  );

  if (success) {
    await ctx.reply("✅ Message mirrored to admin chat.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  } else {
    await ctx.reply("Couldn't mirror the message. Make sure the admin chat is configured.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  }
});

export default composer;
