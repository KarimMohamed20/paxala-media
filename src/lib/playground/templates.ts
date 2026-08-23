import type { PlaygroundNodeKind } from "@prisma/client";

/**
 * Room templates.
 *
 * A template preloads TITLED, EMPTY FRAMES — the shape of a session, not its
 * content. The brief is explicit that templates must not fill a room with fake
 * material, and it is right to be: a canvas that opens pre-populated with
 * plausible-looking placeholder ideas is worse than an empty one, because
 * someone eventually presents a slide that PMP never wrote.
 *
 * Frames are the whole mechanism. They give a session a structure to fill, they
 * can be moved and deleted like anything else, and an unused one costs nothing.
 *
 * Deliberately deferred out of the room-creation stage: until frames existed, a
 * template picker would have been a control that changed nothing.
 */

export type TemplateFrame = {
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type RoomTemplate = {
  id: string;
  /** Frames laid left-to-right in reading order at the world origin. */
  frames: TemplateFrame[];
};

/** Standard frame, and the gap between them. Keeps every template on one grid. */
const W = 560;
const H = 420;
const GAP = 80;

/** Lay frames in a row, so a new room opens with everything in view after "fit". */
function row(titles: string[]): TemplateFrame[] {
  return titles.map((title, index) => ({
    title,
    x: index * (W + GAP),
    y: 0,
    w: W,
    h: H,
  }));
}

/**
 * The nine templates from the brief.
 *
 * Titles are i18n KEYS, not English strings: a Playground room is opened by an
 * Arabic- or Hebrew-speaking team as often as an English-speaking one, and a
 * template that always seeds English frame labels would quietly make the board
 * English-first. Resolved at creation time against the creator's locale.
 */
export const ROOM_TEMPLATES: RoomTemplate[] = [
  { id: "BLANK", frames: [] },
  {
    id: "CAMPAIGN_BRAINSTORM",
    frames: row(["brief", "references", "insights", "directions"]),
  },
  {
    id: "BRAND_IDENTITY",
    frames: row(["brief", "moodboard", "typography", "palette", "applications"]),
  },
  {
    id: "VIDEO_CONCEPT",
    frames: row(["brief", "references", "treatment", "storyboard", "shotList"]),
  },
  {
    id: "SOCIAL_CAMPAIGN",
    frames: row(["brief", "audience", "contentPillars", "executions", "calendar"]),
  },
  {
    id: "WEBSITE_EXPERIENCE",
    frames: row(["brief", "references", "sitemap", "wireframes", "visualDirection"]),
  },
  {
    id: "PRODUCT_LAUNCH",
    frames: row(["brief", "positioning", "keyMessages", "assets", "timeline"]),
  },
  {
    id: "CLIENT_PRESENTATION",
    frames: row(["theProblem", "theIdea", "theExecution", "nextSteps"]),
  },
  {
    id: "PRODUCTION_PLANNING",
    frames: row(["deliverables", "schedule", "crew", "locations", "budget"]),
  },
];

export const TEMPLATE_IDS = ROOM_TEMPLATES.map((template) => template.id);

export function parseTemplateId(value: unknown): string {
  return typeof value === "string" && TEMPLATE_IDS.includes(value)
    ? value
    : "BLANK";
}

export function getTemplate(id: string): RoomTemplate {
  return ROOM_TEMPLATES.find((template) => template.id === id) ?? ROOM_TEMPLATES[0];
}

/**
 * Nodes to seed a new room with.
 *
 * Created TEAM_ONLY by the schema default like anything else: a template's
 * frames are internal scaffolding until someone publishes them, and a room that
 * opened with client-visible content would defeat the deliberate-publish rule
 * before anyone had typed a word.
 */
export function templateNodes(
  id: string,
  translate: (key: string) => string
): Array<{
  kind: PlaygroundNodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  data: Record<string, unknown>;
}> {
  return getTemplate(id).frames.map((frame, index) => ({
    kind: "FRAME" as PlaygroundNodeKind,
    x: frame.x,
    y: frame.y,
    w: frame.w,
    h: frame.h,
    z: index,
    data: { title: translate(frame.title) },
  }));
}
