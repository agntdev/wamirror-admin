import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getActiveWhatsAppNumber, getRetentionPolicy, getMirroredMessages } from "../storage.js";

registerMainMenuItem({ label: "📊 System Status", data: "status:show", order: 50 });

const composer = new Composer<Ctx>();

composer.callbackQuery("status:show", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});

  const policy = await getRetentionPolicy();
  const { total } = await getMirroredMessages();
  const number = await getActiveWhatsAppNumber();

  const lines = [
    "📊 System Status",
    "",
    `WhatsApp: ${number ? number.phoneNumber + " (" + number.registrationStatus + ")" : "Not registered"}`,
    `Retention: ${policy.days} days`,
    `Messages mirrored: ${total}`,
  ];

  await ctx.reply(lines.join("\n"), {
    reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
  });
});

export default composer;
