import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const WELCOME = "👋 Welcome! Tap a button below to get started.";

composer.command("start", async (ctx) => {
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  try {
    await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
  } catch {
    // Message not modified or other error - ignore
  }
});

export default composer;
