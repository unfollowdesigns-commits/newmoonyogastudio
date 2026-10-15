import type { StudioConfig } from "./types";
import newmoon from "./newmoon/studio";

// Add each new studio here. The deployment picks one with NEXT_PUBLIC_CLIENT.
const CLIENTS: Record<string, StudioConfig> = { newmoon };

const id = process.env.NEXT_PUBLIC_CLIENT || "newmoon";
if (!CLIENTS[id]) throw new Error(`Unknown client "${id}" — add it to clients/index.ts`);

export const studio: StudioConfig = CLIENTS[id];
export type { StudioConfig, Text } from "./types";
