import {
  AI_TIMEOUT_MS,
  MAX_OUTPUT_TOKENS,
  type AiProvider,
  type AiRequest,
  type AiResponse,
} from "./provider";

/**
 * Gemini adapter.
 *
 * Plain `fetch` against the REST endpoint — no SDK. The whole surface is one
 * POST with a JSON body, and a dependency tree for that would be more code to
 * audit than the twenty lines it replaces.
 *
 * Verified against Google's current documentation rather than recalled:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 *   auth   x-goog-api-key header
 *   body   { contents:[{role,parts:[{text}]}], systemInstruction, generationConfig }
 *   text   candidates[0].content.parts[0].text
 *   usage  usageMetadata.{promptTokenCount,candidatesTokenCount}
 *
 * The key goes in a HEADER, not the `?key=` query parameter that older guides
 * show. Both authenticate, but a key in a query string is written to every
 * access log, proxy log and error report between here and Google.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Default model.
 *
 * `gemini-2.0-flash` — the obvious guess from memory — has been SHUT DOWN, so
 * this is pinned to a current-generation flash model and made overridable, on
 * the assumption that this line ages faster than the rest of the file.
 */
const DEFAULT_MODEL = "gemini-3.6-flash";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string; status?: string };
};

export function createGeminiProvider(): AiProvider {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  return {
    name: "gemini",
    model,

    async generate(request: AiRequest): Promise<AiResponse> {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

      const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: request.userPrompt }] },
          ],
          systemInstruction: { parts: [{ text: request.systemPrompt }] },
          generationConfig: {
            maxOutputTokens: request.maxOutputTokens ?? MAX_OUTPUT_TOKENS,
            // Creative work wants range, but not so much that two runs of the
            // same brief are unrecognisable to each other.
            temperature: 0.9,
            topP: 0.95,
            candidateCount: 1,
          },
        }),
        // Bounded so a hung upstream cannot occupy a Node request slot
        // indefinitely.
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });

      const data = (await response.json().catch(() => ({}))) as GeminiResponse;

      if (!response.ok) {
        // Google's message is echoed but the key never is — this string reaches
        // a log, and possibly a screen.
        throw new Error(
          `Gemini ${response.status}: ${data.error?.message ?? response.statusText}`
        );
      }

      const text = data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        // An empty candidate is usually a safety block. Say so, rather than
        // returning "" and letting the user think the feature is broken.
        const reason = data.candidates?.[0]?.finishReason;
        throw new Error(
          reason && reason !== "STOP"
            ? `Gemini returned no content (${reason})`
            : "Gemini returned no content"
        );
      }

      return {
        text,
        provider: "gemini",
        model,
        tokensIn: data.usageMetadata?.promptTokenCount ?? null,
        tokensOut: data.usageMetadata?.candidatesTokenCount ?? null,
      };
    },
  };
}
