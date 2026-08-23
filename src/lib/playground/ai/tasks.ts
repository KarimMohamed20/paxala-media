/**
 * The PAX AI task registry.
 *
 * THE CLIENT SENDS A TASK ID, NEVER A PROMPT. This is the difference between a
 * feature and an open proxy: if the browser supplied the system prompt, the
 * endpoint would be a free, authenticated Gemini relay that anyone with a PMP
 * login could point at anything. Here the browser can only choose from this
 * list, and the prompt it selects never leaves the server.
 *
 * The tasks come from the brief's own list, plus the six Creative Spark
 * categories. Each is written to produce something a creative director would
 * actually use: specific, opinionated, and short enough to fit on a card.
 */

export type AiTask = {
  id: string;
  /** Needs canvas content to work on. */
  needsSelection: boolean;
  system: string;
  /** Built from the selected nodes' text. */
  instruction: string;
};

/**
 * Shared framing.
 *
 * Two constraints matter. "No preamble" — a model that opens with "Certainly!
 * Here are three directions" wastes the top third of a card. And the refusal to
 * invent facts: this output is drafted for a real client's campaign, and a
 * confidently fabricated statistic is worse than a blank card.
 */
const HOUSE = [
  "You are PAX, the creative partner inside PMP — Paxala Media Production,",
  "a creative studio working with Arabic- and Hebrew-speaking clients.",
  "",
  "Rules:",
  "- Answer with the work itself. No preamble, no sign-off, no 'here is'.",
  "- Be specific. A named, concrete idea beats three vague ones.",
  "- Never invent statistics, client names, budgets or research findings.",
  "- If the material given is too thin to work from, say so in one line",
  "  and name what is missing.",
  "- Match the language of the material you are given.",
].join("\n");

export const AI_TASKS: Record<string, AiTask> = {
  campaign_route: {
    id: "campaign_route",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Turn the notes below into ONE campaign route. Give it a short name, a one-sentence idea, and three lines on how it shows up in practice.",
  },
  three_directions: {
    id: "three_directions",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Propose THREE genuinely different creative directions from the material below. They must differ in strategy, not just in wording. Name each one and give it two sentences.",
  },
  headline: {
    id: "headline",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Write six headline options for the material below. Vary the register: some plain, some emotional, some playful. One line each, no numbering commentary.",
  },
  script: {
    id: "script",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Write a 30-second script from the material below. Format as timestamped beats with visual and voice/text on each line.",
  },
  shot_list: {
    id: "shot_list",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Turn the material below into a shot list. One line per shot: framing, subject, movement. Aim for eight to twelve shots.",
  },
  summarize: {
    id: "summarize",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Summarise the references below: what they have in common, what they disagree about, and the one visual idea that recurs.",
  },
  themes: {
    id: "themes",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Find the common visual and tonal themes across the material below. Name each theme and cite which items support it.",
  },
  social: {
    id: "social",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Suggest five social executions from the material below. For each: platform, format, and the hook in one line.",
  },
  challenge: {
    id: "challenge",
    needsSelection: true,
    system: `${HOUSE}\n\nFor this task you are a sceptical strategist, not a supporter.`,
    instruction:
      "Challenge the idea below. Name its three weakest assumptions and, for each, what would have to be true for it to work.",
  },
  combine: {
    id: "combine",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Combine the ideas below into one stronger concept. Say explicitly what each contributed and what you dropped.",
  },
  client_explain: {
    id: "client_explain",
    needsSelection: true,
    system: HOUSE,
    instruction:
      "Explain the idea below to a non-technical client in plain language. Lead with what they get, not with how it is made. Four sentences maximum.",
  },

  session_summary: {
    id: "session_summary",
    needsSelection: false,
    system: `${HOUSE}\n\nYou are writing a record, not a pitch. Report only what the material shows.`,
    instruction: [
      "Write a session summary from the material below, under these headings,",
      "omitting any heading you have nothing real to put under:",
      "Objective / Ideas discussed / Selected directions / Rejected directions /",
      "Decisions / Open questions / Action items / Awaiting the client.",
      "Attribute nothing you cannot see. If the board is thin, say so plainly.",
    ].join(" "),
  },

  // ---- Creative Sparks: deliberately provocative, deliberately short -------
  spark_visual: {
    id: "spark_visual",
    needsSelection: false,
    system: HOUSE,
    instruction:
      "Give one unexpected VISUAL direction for this brief — a specific image, not a mood word. Two sentences.",
  },
  spark_story: {
    id: "spark_story",
    needsSelection: false,
    system: HOUSE,
    instruction:
      "Give one STORY angle for this brief: whose point of view, and what changes for them. Two sentences.",
  },
  spark_headline: {
    id: "spark_headline",
    needsSelection: false,
    system: HOUSE,
    instruction: "Give three headlines for this brief. One line each.",
  },
  spark_camera: {
    id: "spark_camera",
    needsSelection: false,
    system: HOUSE,
    instruction:
      "Give one CAMERA idea for this brief — a specific move, lens or vantage point that would make it memorable. Two sentences.",
  },
  spark_social: {
    id: "spark_social",
    needsSelection: false,
    system: HOUSE,
    instruction:
      "Give one social-first idea for this brief that would only work as a short vertical video. Two sentences.",
  },
  spark_unexpected: {
    id: "spark_unexpected",
    needsSelection: false,
    system: `${HOUSE}\n\nBe provocative. A safe answer is a wasted one here.`,
    instruction:
      "Give one direction for this brief that PMP would not normally propose, and say in one line why it might work anyway.",
  },
};

export function getTask(id: unknown): AiTask | null {
  if (typeof id !== "string") return null;
  return AI_TASKS[id] ?? null;
}

export const AI_TASK_IDS = Object.keys(AI_TASKS);
