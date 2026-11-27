import type { ChartPayload } from "./payload.js";
/** The payload typed, or null when it isn't a valid v1 chart payload. Unknown fields are ignored. */
export declare function parsePayload(raw: unknown): ChartPayload | null;
