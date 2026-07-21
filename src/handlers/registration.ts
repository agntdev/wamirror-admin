import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { setWhatsAppNumber, setAdminChat } from "../storage.js";

registerMainMenuItem({ label: "📱 Register WhatsApp", data: "register:start", order: 10 });

const composer = new Composer<Ctx>();

// Default admin chat ID from environment
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ?? "6721270715";

composer.callbackQuery("register:start", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  ctx.session.step = "awaiting_phone";
  await ctx.reply("What's the WhatsApp number to mirror? Include the country code (e.g. +1234567890).", {
    reply_markup: { force_reply: true, input_field_placeholder: "+1234567890" },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_phone") return next();

  const phone = ctx.message.text.trim();
  if (!/^\+?[0-9]{7,15}$/.test(phone)) {
    await ctx.reply("That doesn't look like a valid phone number. Try again with the country code (e.g. +1234567890).");
    return;
  }

  ctx.session.phoneNumber = phone;
  ctx.session.step = "awaiting_admin_chat";
  await ctx.reply(`Got it. The admin chat is set to ${ADMIN_CHAT_ID}. Is this correct?`, {
    reply_markup: inlineKeyboard([
      [inlineButton("✅ Yes", "register:confirm"), inlineButton("❌ No, change it", "register:change_chat")],
    ]),
  });
});

composer.callbackQuery("register:change_chat", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  ctx.session.step = "awaiting_admin_chat";
  await ctx.reply("What's the Telegram chat ID where mirrored messages should go? You can forward a message from the target chat to get its ID.", {
    reply_markup: { force_reply: true, input_field_placeholder: "Chat ID (e.g. -1001234567890)" },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_admin_chat") return next();

  const chatId = ctx.message.text.trim();
  if (!/^-?[0-9]{5,}$/.test(chatId)) {
    await ctx.reply("That doesn't look like a valid chat ID. It should be a number like -1001234567890 or 123456789.");
    return;
  }

  ctx.session.adminChatId = chatId;
  ctx.session.step = "confirming_registration";
  await ctx.reply(
    `Register this setup?\n\nWhatsApp: ${ctx.session.phoneNumber}\nAdmin chat: ${ctx.session.adminChatId}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("✅ Confirm", "register:confirm"), inlineButton("❌ Cancel", "register:cancel")],
      ]),
    },
  );
});

composer.callbackQuery("register:confirm", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  if (!ctx.session.phoneNumber) {
    await ctx.reply("Something went wrong. Tap Register WhatsApp to start again.");
    ctx.session.step = undefined;
    return;
  }

  const chatId = ctx.session.adminChatId ?? ADMIN_CHAT_ID;

  await setWhatsAppNumber({
    phoneNumber: ctx.session.phoneNumber,
    displayName: "",
    registrationStatus: "active",
  });

  await setAdminChat({
    chatId: chatId,
    adminUsers: [ctx.from.id],
    lastSyncTime: Date.now(),
  });

  ctx.session.step = undefined;
  try {
    await ctx.editMessageText("✅ Registered! Mirrored messages will go to the admin chat.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  } catch {
    // Message not modified - send new message
    await ctx.reply("✅ Registered! Mirrored messages will go to the admin chat.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  }
});

composer.callbackQuery("register:cancel", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  ctx.session.step = undefined;
  ctx.session.phoneNumber = undefined;
  ctx.session.adminChatId = undefined;
  try {
    await ctx.editMessageText("Registration cancelled. Tap Register WhatsApp to start again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  } catch {
    // Message not modified - send new message
    await ctx.reply("Registration cancelled. Tap Register WhatsApp to start again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  }
});

export default composer;
