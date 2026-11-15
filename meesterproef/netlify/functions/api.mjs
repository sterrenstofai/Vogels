// Netlify Function (v2): geeft elk verzoek op /api/* door aan de eigenlijke API.
import { behandel } from "../lib/api.mjs";

export default async (req, context) => behandel(req, context);

export const config = { path: "/api/*" };
