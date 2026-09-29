// Netlify Function: /api/telegram — Telegram bot webhook (hisobni ulash: /start <kod>)
import { handleTelegram } from "../../server/handler.mjs";
import { netlifyStorage } from "../../server/storage.mjs";

export default async (req) => handleTelegram(req, await netlifyStorage());

export const config = { path: "/api/telegram" };
