import { describe, expect, it } from "vitest";
import { MessageChannel, NodeVisibility } from "@prisma/client";
import {
  clientCommentSelect,
  clientCommentWhere,
  clientEdgeWhere,
  clientMessageSelect,
  clientMessageWhere,
  clientNodeSelect,
  clientNodeWhere,
  isPublishableKind,
} from "./client-scope";

/**
 * The Client Mode boundary.
 *
 * These assert the SHAPE of the queries rather than running them, because the
 * failure mode being guarded against is a dropped WHERE term or a widened
 * select — both of which type-check perfectly and are invisible to the build.
 */

describe("clientNodeWhere", () => {
  const where = clientNodeWhere("room_1");

  it("scopes to the room", () => {
    expect(where.roomId).toBe("room_1");
  });

  it("excludes TEAM_ONLY nodes", () => {
    expect(where.visibility).toEqual({ not: NodeVisibility.TEAM_ONLY });
  });

  it("excludes nodes that were never deliberately published", () => {
    // Without this term, flipping a node to CLIENT_SELECTED in Studio Mode would
    // silently expose it — the brief requires an explicit publish action.
    expect(where.clientVisibleSince).toEqual({ not: null });
  });

  it("requires BOTH terms, not either", () => {
    // Guards against someone "simplifying" the predicate into an OR, which would
    // expose every published-then-retracted node, and every team-only node that
    // had ever been published.
    expect(where).not.toHaveProperty("OR");
    expect(Object.keys(where).sort()).toEqual([
      "clientVisibleSince",
      "roomId",
      "visibility",
    ]);
  });
});

describe("clientNodeSelect", () => {
  const keys = Object.keys(clientNodeSelect);

  it.each([
    ["visibility", "internal taxonomy"],
    ["createdById", "internal user id"],
    ["version", "op-pipeline internal"],
    ["editLockById", "reveals who on the PMP team is typing"],
    ["editLockAt", "reveals internal editing activity"],
  ])("never exposes %s (%s)", (field) => {
    expect(keys).not.toContain(field);
  });

  it("is an allowlist, so a future column is hidden by default", () => {
    // If this fails because a column was added to the select, that is the point:
    // adding a field to the client projection is a security decision and should
    // require deliberately updating this list.
    expect(keys.sort()).toEqual(
      [
        "clientVisibleSince",
        "createdAt",
        "createdByName",
        "data",
        "fileId",
        "frameId",
        "h",
        "id",
        "kind",
        "roomFileId",
        "rotation",
        "style",
        "text",
        "updatedAt",
        "w",
        "x",
        "y",
        "z",
      ].sort()
    );
  });

  it("selects only true values (no nested includes that could widen it)", () => {
    expect(Object.values(clientNodeSelect).every((v) => v === true)).toBe(true);
  });
});

describe("clientEdgeWhere", () => {
  it("requires BOTH endpoints to be client-visible", () => {
    const where = clientEdgeWhere("room_1");
    const visible = {
      visibility: { not: NodeVisibility.TEAM_ONLY },
      clientVisibleSince: { not: null },
    };

    // An edge with one hidden end renders as an arrow into empty space, which
    // discloses that something was removed.
    expect(where.fromNode).toEqual({ is: visible });
    expect(where.toNode).toEqual({ is: visible });
  });
});

describe("clientMessageWhere", () => {
  it("restricts a client to the SHARED channel", () => {
    const where = clientMessageWhere("room_1");
    expect(where.channel).toBe(MessageChannel.SHARED);
    expect(where.roomId).toBe("room_1");
  });

  it("never exposes the author's user id", () => {
    expect(Object.keys(clientMessageSelect)).not.toContain("authorId");
  });
});

describe("clientCommentWhere", () => {
  it("only returns comments anchored to a node the client can already see", () => {
    const where = clientCommentWhere("room_1");
    expect(where.node).toEqual({
      is: {
        visibility: { not: NodeVisibility.TEAM_ONLY },
        clientVisibleSince: { not: null },
      },
    });
  });

  it("does not return room-level comments, which are internal working notes", () => {
    const where = clientCommentWhere("room_1");
    expect(where).not.toHaveProperty("OR");
  });

  it("never exposes the author's user id", () => {
    expect(Object.keys(clientCommentSelect)).not.toContain("authorId");
  });
});

describe("isPublishableKind", () => {
  it("refuses to publish a raw AI generation", () => {
    // Independent of visibility: an experimental generation becomes client-facing
    // only by a human copying its content into a real card.
    expect(isPublishableKind("AI_CARD")).toBe(false);
  });

  it("allows ordinary creative kinds", () => {
    for (const kind of ["STICKY", "IMAGE", "FRAME", "CAMPAIGN_ROUTE", "SCRIPT"]) {
      expect(isPublishableKind(kind)).toBe(true);
    }
  });
});
