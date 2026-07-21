import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getRetentionPolicy, setRetentionPolicy } from "../storage.js";

registerMainMenuItem({ label: "⚙️ Configure Retention", data: "retention:edit", order: 40 });

const composer = new Composer<Ctx>();

composer.callbackQuery("retention:edit", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const policy = await getRetentionPolicy();
  ctx.session.retentionDays = policy.days;
  await ctx.reply(
    `Current retention: ${policy.days} days.\n\nMedia files older than this are automatically cleaned up.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("✏️ Change period", "retention:set")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("retention:set", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  ctx.session.step = "awaiting_retention_days";
  await ctx.reply("How many days should media be retained? Enter a number between 1 and 365.", {
    reply_markup: { force_reply: true, input_field_placeholder: "Number of days (1–365)" },
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "awaiting_retention_days") return next();

  const days = parseInt(ctx.message.text.trim(), 10);
  if (isNaN(days) || days < 1 || days > 365) {
    await ctx.reply("Please enter a number between 1 and 365.");
    return;
  }

  ctx.session.retentionDays = days;
  ctx.session.step = "confirming_retention";
  await ctx.reply(`Set retention to ${days} days?`, {
    reply_markup: inlineKeyboard([
      [inlineButton("✅ Confirm", "retention:confirm"), inlineButton("❌ Cancel", "retention:cancel")],
    ]),
  });
});

composer.callbackQuery("retention:confirm", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const days = ctx.session.retentionDays;
  if (!days) {
    await ctx.reply("Something went wrong. Tap Configure Retention to try again.");
    ctx.session.step = undefined;
    return;
  }

  await setRetentionPolicy({ days, lastUpdated: Date.now() });
  ctx.session.step = undefined;
  try {
    await ctx.editMessageText(`✅ Retention updated to ${days} days.`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  } catch {
    // Message not modified - send new message
    await ctx.reply(`✅ Retention updated to ${days} days.`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  }
});

composer.callbackQuery("retention:cancel", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  ctx.session.step = undefined;
  ctx.session.retentionDays = undefined;
  try {
    await ctx.editMessageText("Retention change cancelled.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  } catch {
    // Message not modified - send new message
    await ctx.reply("Retention change cancelled.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
  }
});

export default composer;
