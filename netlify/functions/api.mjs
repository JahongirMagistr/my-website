// Netlify Function: /api — barcha ma'lumotlar Netlify Blobs'da saqlanadi.
import { getStore } from "@netlify/blobs";
import { handleRequest } from "../../server/handler.mjs";

const KEY = "db";

export default async (req) => {
  const store = getStore({ name: "agricrowd", consistency: "strong" });
  return handleRequest(req, {
    async load() {
      const res = await store.getWithMetadata(KEY, { type: "json" });
      return res ? { db: res.data, etag: res.etag } : null;
    },
    async save(db, etag) {
      const opts = etag ? { onlyIfMatch: etag } : { onlyIfNew: true };
      const { modified } = await store.setJSON(KEY, db, opts);
      return modified;
    },
  });
};

export const config = { path: "/api" };
