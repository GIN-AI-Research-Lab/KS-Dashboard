// Server-side dictionary registry. Only imported by server code (the layout
// resolves the active dictionary and passes it to the client provider as a
// prop), so all three locales bundling here never reaches the client.

import type { Locale } from "../config";
import vi, { type Dictionary } from "./vi";
import en from "./en";
import ja from "./ja";

export type { Dictionary };

export const dictionaries: Record<Locale, Dictionary> = { vi, en, ja };
