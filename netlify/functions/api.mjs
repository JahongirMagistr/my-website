// Netlify Function: /api — asosiy API
import { handleRequest } from "../../server/handler.mjs";
import { netlifyStorage } from "../../server/storage.mjs";

export default async (req) => handleRequest(req, await netlifyStorage());

export const config = { path: "/api" };
