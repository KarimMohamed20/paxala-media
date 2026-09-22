/**
 * The shape of a PAX "build on the board" plan — shared by the server that
 * validates it and the browser that lays it out.
 *
 * Deliberately OUTSIDE `@/lib/playground/ai/`: components are banned from
 * importing that directory (it holds the provider key), but they need these
 * types and the colour table to place a plan on the canvas.
 *
 * A plan is SEMANTIC, not spatial. It says "a column headed Audience with
 * these four stickies", never "a sticky at (412, 88)". Language models are
 * poor at two-dimensional layout — asked for coordinates they overlap
 * existing work and drift off-screen — so placement is done by a
 * deterministic layout engine in the browser (canvas/compose-layout.ts).
 */

/** What PAX may create. Polls and decisions are excluded: both carry votes
 * or outcomes that only people should record. */
export const COMPOSE_KINDS = [
  "sticky",
  "text",
  "shape",
  "campaign_route",
  "script",
  "palette",
] as const;

export type ComposeKind = (typeof COMPOSE_KINDS)[number];

/**
 * Sticky colours by NAME, matching the inspector's paper tones exactly.
 * The model picks a name ("green"), never a hex: names are what it can use
 * consistently to encode meaning, and a hex it invented would not match any
 * swatch a person could pick afterwards.
 */
export const STICKY_COLOR_HEX = {
  yellow: "#F5E6A8",
  orange: "#F7C8A0",
  pink: "#F2A8A8",
  green: "#C9E4C5",
  blue: "#B8D8E8",
  purple: "#D9C7E8",
  white: "#FFFFFF",
} as const;

export type StickyColor = keyof typeof STICKY_COLOR_HEX;

export const STICKY_COLORS = Object.keys(STICKY_COLOR_HEX) as StickyColor[];

export type ComposeItem = {
  /** Local id, unique within the plan; only used to wire connections. */
  ref: string;
  kind: ComposeKind;
  text: string;
  /** Campaign routes, scripts and palettes carry a title. */
  title: string | null;
  /** Stickies only. */
  color: StickyColor | null;
  /** Palettes only — validated `#rrggbb`. */
  colors: string[];
};

export type ComposeGroup = {
  heading: string;
  items: ComposeItem[];
};

/**
 * One end of a connector: an item in this plan, or an item ALREADY on the
 * board. Existing ends are real node ids, resolved server-side from the
 * short refs the model saw — the model never sees or writes a raw id.
 */
export type ComposeEndpoint = { item: string } | { existing: string };

export type ComposeConnection = {
  from: ComposeEndpoint;
  to: ComposeEndpoint;
};

export type ComposePlan = {
  /** Becomes the frame's title. */
  title: string;
  /** One line, shown in the preview before anything is added. */
  summary: string;
  groups: ComposeGroup[];
  connections: ComposeConnection[];
};

/** Longest request a person may type. Long enough for a real brief. */
export const MAX_COMPOSE_INSTRUCTION = 1000;

/** Ceilings on what one plan can put on a board. */
export const MAX_COMPOSE_GROUPS = 6;
export const MAX_COMPOSE_ITEMS_PER_GROUP = 8;
export const MAX_COMPOSE_ITEMS = 30;
export const MAX_COMPOSE_CONNECTIONS = 30;

/** Every item in reading order, flattened across groups. */
export function planItems(plan: ComposePlan): ComposeItem[] {
  return plan.groups.flatMap((group) => group.items);
}
