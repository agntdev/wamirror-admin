import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard, paginate } from "../toolkit/index.js";
import { getMirroredMessages } from "../storage.js";

registerMainMenuItem({ label: "📜 Message History", data: "history:view", order: 30 });

const composer = new Composer<Ctx>();

async function showHistory(ctx: Ctx, page: number, filter?: "all" | "incoming" | "outgoing", isNew = false) {
  const direction = filter ?? ctx.session.historyFilter ?? "all";
  ctx.session.historyFilter = direction;
  ctx.session.historyPage = page;

  const { messages, total } = await getMirroredMessages({ direction, limit: 5, offset: page * 5 });

  const send = (text: string, markup: ReturnType<typeof inlineKeyboard>) =>
    isNew ? ctx.reply(text, { reply_markup: markup }) : ctx.editMessageText(text, { reply_markup: markup });

  const filterKb = inlineKeyboard([
    [
      inlineButton(direction === "all" ? "📥 All ✓" : "📥 All", "history:filter:all"),
      inlineButton(direction === "incoming" ? "⬇️ Incoming ✓" : "⬇️ Incoming", "history:filter:incoming"),
      inlineButton(direction === "outgoing" ? "⬆️ Outgoing ✓" : "⬆️ Outgoing", "history:filter:outgoing"),
    ],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  if (total === 0) {
    await send("No mirrored messages yet. Messages will appear here once WhatsApp forwarding is active.", filterKb);
    return;
  }

  const lines = messages.map((m) => {
    const dir = m.direction === "incoming" ? "⬇️" : "⬆️";
    const time = new Date(m.timestamp).toLocaleString();
    const text = m.messageText.length > 60 ? m.messageText.slice(0, 57) + "..." : m.messageText;
    return `${dir} ${time}\n${text}`;
  });

  const { pageItems, controls, totalPages } = paginate(
    messages.map((m, i) => ({ text: lines[i], id: m.id })),
    { page, perPage: 5, callbackPrefix: "history:page" },
  );

  const header = `Messages (${total} total, page ${page + 1}/${totalPages}):\n`;
  const body = pageItems.map((item) => item.text).join("\n\n");

  const kb = inlineKeyboard([
    [
      inlineButton(direction === "all" ? "📥 All ✓" : "📥 All", "history:filter:all"),
      inlineButton(direction === "incoming" ? "⬇️ Incoming ✓" : "⬇️ Incoming", "history:filter:incoming"),
      inlineButton(direction === "outgoing" ? "⬆️ Outgoing ✓" : "⬆️ Outgoing", "history:filter:outgoing"),
    ],
    ...controls.inline_keyboard.map((row) => row),
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await send(header + body, kb);
}

composer.callbackQuery("history:view", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showHistory(ctx, 0, undefined, true);
});

composer.callbackQuery(/^history:filter:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const filter = ctx.match![1] as "all" | "incoming" | "outgoing";
  await showHistory(ctx, 0, filter);
});

composer.callbackQuery(/^history:page:(prev|next):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = parseInt(ctx.match![2], 10);
  await showHistory(ctx, page);
});

export default composer;
