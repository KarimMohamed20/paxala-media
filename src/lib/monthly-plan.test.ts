import { describe, expect, it } from "vitest";
import { ContentFormat, PlanItemStatus } from "@prisma/client";
import {
  calculatePlanProgress,
  monthWindow,
  resolveDeliverables,
  type DeliverableInput,
} from "./monthly-plan";

/**
 * The maths behind the portal overview tiles and the Monthly Plan ring.
 *
 * Both surfaces read the same two functions, so these tests are what stops the
 * dashboard and the plan page drifting apart again: the overview's "Deliverables
 * X / Y" tile is `calculatePlanProgress().deliverables`, and its hero ring is
 * `.percent`.
 */

const row = (over: Partial<DeliverableInput> = {}): DeliverableInput => ({
  id: "d1",
  label: "Reels",
  icon: null,
  target: 4,
  formats: [ContentFormat.REEL],
  manualDone: null,
  order: 0,
  ...over,
});

describe("resolveDeliverables", () => {
  it("counts delivered items per format", () => {
    const [reels] = resolveDeliverables(
      [row()],
      [{ format: ContentFormat.REEL, _count: 3 }]
    );
    expect(reels.done).toBe(3);
    expect(reels.auto).toBe(true);
    expect(reels.percent).toBe(75);
  });

  it("sums every format a row claims", () => {
    const [mixed] = resolveDeliverables(
      [
        row({
          target: 10,
          formats: [ContentFormat.REEL, ContentFormat.CAROUSEL],
        }),
      ],
      [
        { format: ContentFormat.REEL, _count: 3 },
        { format: ContentFormat.CAROUSEL, _count: 2 },
        // Not claimed by the row — must not leak into it.
        { format: ContentFormat.STORIES, _count: 9 },
      ]
    );
    expect(mixed.done).toBe(5);
  });

  it("ignores a format the month produced none of", () => {
    const [reels] = resolveDeliverables(
      [row()],
      [{ format: ContentFormat.VIDEO, _count: 5 }]
    );
    expect(reels.done).toBe(0);
  });

  it("uses manualDone when a row tracks no format", () => {
    const [manual] = resolveDeliverables(
      [row({ formats: [], manualDone: 2 })],
      [{ format: ContentFormat.REEL, _count: 7 }]
    );
    // The format counts are irrelevant to a hand-entered row.
    expect(manual.done).toBe(2);
    expect(manual.auto).toBe(false);
  });

  it("treats a missing manualDone as zero rather than NaN", () => {
    const [manual] = resolveDeliverables([row({ formats: [] })], []);
    expect(manual.done).toBe(0);
    expect(manual.percent).toBe(0);
  });

  it("reports raw over-delivery but caps the percentage", () => {
    const [over] = resolveDeliverables(
      [row({ target: 4 })],
      [{ format: ContentFormat.REEL, _count: 10 }]
    );
    expect(over.done).toBe(10);
    expect(over.percent).toBe(100);
  });
});

describe("calculatePlanProgress", () => {
  const week = (...statuses: PlanItemStatus[]) => ({
    items: statuses.map((status) => ({ status })),
  });

  it("returns zero — not NaN — for a plan with nothing in it", () => {
    const p = calculatePlanProgress({ weeks: [], deliverables: [] });
    expect(p.percent).toBe(0);
    expect(p.deliverables).toEqual({ done: 0, target: 0, percent: 0 });
    expect(p.timeline.percent).toBe(0);
  });

  it("caps each deliverable row so over-delivery cannot pass 100", () => {
    const p = calculatePlanProgress({
      weeks: [],
      deliverables: [{ target: 4, done: 10 }],
    });
    // This is the number the overview tile shows: 4 / 4, not 10 / 4.
    expect(p.deliverables).toEqual({ done: 4, target: 4, percent: 100 });
    expect(p.percent).toBe(100);
  });

  it("skips rows with no target so they cannot drag the ratio down", () => {
    const p = calculatePlanProgress({
      weeks: [],
      deliverables: [
        { target: 0, done: 0 },
        { target: 2, done: 1 },
      ],
    });
    expect(p.deliverables).toEqual({ done: 1, target: 2, percent: 50 });
  });

  it("gives half credit to work in flight", () => {
    const p = calculatePlanProgress({
      weeks: [
        week(
          PlanItemStatus.COMPLETED,
          PlanItemStatus.IN_PROGRESS,
          PlanItemStatus.AWAITING_CLIENT,
          PlanItemStatus.SCHEDULED
        ),
      ],
      deliverables: [],
    });
    expect(p.timeline.completed).toBe(1);
    // IN_PROGRESS and AWAITING_CLIENT count as started; SCHEDULED does not.
    expect(p.timeline.inFlight).toBe(2);
    expect(p.timeline.total).toBe(4);
    expect(p.timeline.score).toBe(2); // 1 + 0.5 + 0.5 + 0
    expect(p.timeline.percent).toBe(50);
  });

  it("blends deliverables and timeline into one ratio", () => {
    const p = calculatePlanProgress({
      weeks: [week(PlanItemStatus.COMPLETED, PlanItemStatus.SCHEDULED)],
      deliverables: [{ target: 4, done: 2 }],
    });
    // (2 done + 1 score) / (4 target + 2 items) = 50%
    expect(p.percent).toBe(50);
  });

  it("negative done cannot subtract from progress", () => {
    const p = calculatePlanProgress({
      weeks: [],
      deliverables: [{ target: 4, done: -3 }],
    });
    expect(p.deliverables.done).toBe(0);
  });
});

describe("monthWindow", () => {
  it("spans the month in UTC, half-open", () => {
    const { startDate, endDate } = monthWindow(2026, 8);
    expect(startDate.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("rolls over the year boundary", () => {
    const { startDate, endDate } = monthWindow(2026, 12);
    expect(startDate.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("keeps an item scheduled just after UTC midnight inside its own month", () => {
    // The bug this guards: local-time bounds on a server east of Greenwich
    // (Riyadh, UTC+3) pushed a 00:30Z item into the previous month.
    const { startDate, endDate } = monthWindow(2026, 8);
    const justAfterMidnight = new Date("2026-08-01T00:30:00.000Z");
    expect(justAfterMidnight >= startDate).toBe(true);
    expect(justAfterMidnight < endDate).toBe(true);
  });
});
