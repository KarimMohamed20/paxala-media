import type { AiProvider, AiRequest, AiResponse } from "./provider";

/**
 * Deterministic stand-in used whenever no API key is configured.
 *
 * NOT a test double. It is what the product runs on before anyone buys credit,
 * so the entire PAX AI surface — the dock, the result card, insert, regenerate,
 * discard — can be built, reviewed and demonstrated without spending anything.
 *
 * It is deliberately, visibly fake. Output that could pass for a real
 * suggestion would eventually end up in front of a client, so every response
 * says what it is. The alternative — plausible filler — is the exact failure
 * mode the brief warns about with templates.
 */
export const mockProvider: AiProvider = {
  name: "mock",
  model: "mock-1",

  async generate(request: AiRequest): Promise<AiResponse> {
    // A short delay so the loading state is exercised rather than skipped.
    await new Promise((resolve) => setTimeout(resolve, 400));

    const subject = request.userPrompt
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    // "Build on the board" asks for a plan, not prose. The plan is as
    // obviously fake as the text answer: every item says it is a placeholder,
    // so nothing added from the mock could be mistaken for a real idea.
    if (request.responseSchema) {
      const request_ = request.userPrompt.match(
        /--- REQUEST[^\n]*\n([\s\S]*?)\n--- END REQUEST ---/
      )?.[1];
      const asked = (request_ ?? subject).replace(/\s+/g, " ").trim().slice(0, 120);
      return {
        text: JSON.stringify({
          title: "PAX preview (not connected)",
          summary: "A placeholder plan — PAX AI is not connected yet.",
          groups: [
            {
              heading: "Placeholder",
              items: [
                {
                  ref: "i1",
                  kind: "sticky",
                  color: "yellow",
                  text: "PAX AI is not connected yet — this is a placeholder item.",
                },
                {
                  ref: "i2",
                  kind: "sticky",
                  color: "blue",
                  text: `It was asked: “${asked || "nothing"}”.`,
                },
              ],
            },
          ],
          connections: [{ from: "i1", to: "i2" }],
        }),
        provider: "mock",
        model: "mock-1",
        tokensIn: null,
        tokensOut: null,
      };
    }

    return {
      text: [
        "PAX AI is not connected yet — this is a placeholder response.",
        "",
        `It was asked about: “${subject || "an empty selection"}”.`,
        "",
        "Once a provider key is configured, this card will carry a real",
        "suggestion you can edit, insert onto the board, or discard.",
      ].join("\n"),
      provider: "mock",
      model: "mock-1",
      tokensIn: null,
      tokensOut: null,
    };
  },
};
