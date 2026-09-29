// Netlify Function: /api/payme — Payme Merchant API (to'lov tizimi shu manzilga murojaat qiladi)
import { handlePayme } from "../../server/handler.mjs";
import { netlifyStorage } from "../../server/storage.mjs";

export default async (req) => handlePayme(req, await netlifyStorage());

export const config = { path: "/api/payme" };
