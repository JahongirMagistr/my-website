// Netlify Function: /api/click — Click SHOP API (prepare / complete)
import { handleClick } from "../../server/handler.mjs";
import { netlifyStorage } from "../../server/storage.mjs";

export default async (req) => handleClick(req, await netlifyStorage());

export const config = { path: "/api/click" };
