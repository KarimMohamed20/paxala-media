import { createGeminiProvider } from "./gemini";
import { mockProvider } from "./mock";

/**
 * PAX AI provider abstraction.
 *
 * SERVER ONLY. This module reads the API key, and an eslint `no-restricted-imports`
 * rule bans importing anything under `@/lib/playground/ai/**` from components and
 * pages — `server-only` is not a dependency of this project, so the lint rule is
 * the guard.
 *
 * Two adapters: Gemini, and a deterministic mock used whenever no key is
 * configured. The mock is not a test stub — it is what the product runs on
 * before anyone buys credit, so the whole PAX AI surface is demonstrable and
 * reviewable without spend, and the dock never has to render a dead state.
 */

export type AiRequest = {
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens?: number;
};

export type AiResponse = {
  text: string;
  provider: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  generate(request: AiRequest): Promise<AiResponse>;
}

/** Hard ceiling on a single generation. A campaign route is not a novel. */
export const MAX_OUTPUT_TOKENS = 2048;

/**
 * Wall-clock limit for one provider call.
 *
 * The request is made OUTSIDE any database transaction precisely so this can be
 * generous — holding a Prisma transaction open across a 20-second network call
 * would pin a connection from a pool that defaults to five.
 */
export const AI_TIMEOUT_MS = 45_000;

let cached: AiProvider | null | undefined;

/**
 * The configured provider, or null when PAX AI is switched off.
 *
 * Resolved once per process. `null` is a first-class answer: callers render an
 * honest "not configured" state rather than failing a request.
 */
export function getAiProvider(): AiProvider | null {
  if (cached === undefined) cached = resolveProvider();
  return cached;
}

function resolveProvider(): AiProvider | null {
  const configured = (process.env.PLAYGROUND_AI_PROVIDER ?? "gemini").toLowerCase();

  if (configured === "off" || configured === "none") return null;
  if (configured === "mock") return mockProvider;

  if (configured === "gemini") {
    // No key: fall back to the mock rather than throwing, so a missing
    // environment variable degrades the feature instead of taking the room down.
    return process.env.GEMINI_API_KEY ? createGeminiProvider() : mockProvider;
  }

  return null;
}

/** True when a real, billable provider is configured. */
export function isAiBillable(): boolean {
  const provider = getAiProvider();
  return !!provider && provider.name !== "mock";
}

/** Test seam: forget the memoised provider after changing the environment. */
export function resetAiProviderCache(): void {
  cached = undefined;
}
