import { describe, expect, it } from "vitest";
import { Role, RoomMemberRole } from "@prisma/client";
import type { Session } from "next-auth";
import { clampGrant, requireStudioActor, resolveRoomActor } from "./actors";

function session(id: string, role: Role): Session {
  return {
    user: { id, role, name: "Test User", email: null, image: null },
    expires: "2099-01-01T00:00:00.000Z",
  } as unknown as Session;
}

const room = { id: "room_1", clientId: "client_1", restricted: false };

describe("clampGrant — the global-role ceiling", () => {
  it("clamps a CLIENT holding OWNER down to APPROVER", () => {
    // The load-bearing case. A PlaygroundMember row granting a client OWNER —
    // via a bug, a bad import, or a malicious write — must not escalate them.
    expect(clampGrant(Role.CLIENT, RoomMemberRole.OWNER)).toBe(
      RoomMemberRole.APPROVER
    );
  });

  it("clamps a CLIENT holding EDITOR down to APPROVER", () => {
    expect(clampGrant(Role.CLIENT, RoomMemberRole.EDITOR)).toBe(
      RoomMemberRole.APPROVER
    );
  });

  it("leaves a deliberately-restricted grant alone", () => {
    // Clamping is a ceiling, never a floor: a STAFF member explicitly limited to
    // VIEWER on a sensitive room stays a VIEWER.
    expect(clampGrant(Role.STAFF, RoomMemberRole.VIEWER)).toBe(
      RoomMemberRole.VIEWER
    );
    expect(clampGrant(Role.CLIENT, RoomMemberRole.VIEWER)).toBe(
      RoomMemberRole.VIEWER
    );
  });

  it("lets the agency hold OWNER", () => {
    expect(clampGrant(Role.ADMIN, RoomMemberRole.OWNER)).toBe(RoomMemberRole.OWNER);
    expect(clampGrant(Role.STAFF, RoomMemberRole.OWNER)).toBe(RoomMemberRole.OWNER);
  });
});

describe("resolveRoomActor — mode cannot be coerced", () => {
  it("pins a CLIENT to CLIENT mode even when the request asks for studio", () => {
    const result = resolveRoomActor(session("client_1", Role.CLIENT), {
      room,
      membership: { role: RoomMemberRole.APPROVER },
      requestedMode: "studio",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.mode).toBe("CLIENT");
  });

  it.each(["studio", "STUDIO", "Studio", "", null, undefined, "anything"])(
    "pins a CLIENT to CLIENT mode for requestedMode=%s",
    (requestedMode) => {
      const result = resolveRoomActor(session("client_1", Role.CLIENT), {
        room,
        membership: { role: RoomMemberRole.APPROVER },
        requestedMode: requestedMode as string | null | undefined,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.actor.mode).toBe("CLIENT");
    }
  );

  it("lets staff preview as a client", () => {
    const result = resolveRoomActor(session("staff_1", Role.STAFF), {
      room,
      membership: null,
      requestedMode: "client",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.mode).toBe("CLIENT");
  });

  it("defaults staff to STUDIO", () => {
    const result = resolveRoomActor(session("staff_1", Role.STAFF), {
      room,
      membership: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.mode).toBe("STUDIO");
    expect(result.actor.effectiveRole).toBe(RoomMemberRole.EDITOR);
  });
});

describe("resolveRoomActor — capabilities", () => {
  it("denies a client EDIT even with a misfiled OWNER membership row", () => {
    const result = resolveRoomActor(session("client_1", Role.CLIENT), {
      room,
      membership: { role: RoomMemberRole.OWNER },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.actor.effectiveRole).toBe(RoomMemberRole.APPROVER);
    expect(result.actor.can("EDIT")).toBe(false);
    expect(result.actor.can("PUBLISH")).toBe(false);
    expect(result.actor.can("MANAGE")).toBe(false);
    expect(result.actor.can("USE_AI")).toBe(false);
    // What they legitimately can do:
    expect(result.actor.can("APPROVE")).toBe(true);
    expect(result.actor.can("COMMENT")).toBe(true);
    expect(result.actor.can("VOTE")).toBe(true);
  });

  it("strips studio powers from staff while previewing as a client", () => {
    // Otherwise the preview would show affordances a real client never has, and
    // a staff member could edit through it by accident.
    const result = resolveRoomActor(session("admin_1", Role.ADMIN), {
      room,
      membership: { role: RoomMemberRole.OWNER },
      requestedMode: "client",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.can("EDIT")).toBe(false);
    expect(result.actor.can("PUBLISH")).toBe(false);
    expect(result.actor.can("USE_AI")).toBe(false);
    expect(result.actor.can("VIEW")).toBe(true);
  });

  it("gives a VIEWER nothing but VIEW", () => {
    const result = resolveRoomActor(session("guest_1", Role.CLIENT), {
      room: { ...room, clientId: "someone_else" },
      membership: { role: RoomMemberRole.VIEWER },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.can("VIEW")).toBe(true);
    expect(result.actor.can("COMMENT")).toBe(false);
    expect(result.actor.can("APPROVE")).toBe(false);
  });
});

describe("resolveRoomActor — access", () => {
  it("rejects an anonymous caller with 401", () => {
    const result = resolveRoomActor(null, { room, membership: null });
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("returns 404 — not 403 — to an unrelated client", () => {
    // 403 would confirm the room exists, letting an outsider enumerate PMP's
    // client list one request at a time.
    const result = resolveRoomActor(session("other_client", Role.CLIENT), {
      room: { ...room, clientId: "client_1" },
      membership: null,
    });
    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("admits the owning client without an explicit membership row", () => {
    const result = resolveRoomActor(session("client_1", Role.CLIENT), {
      room,
      membership: null,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.effectiveRole).toBe(RoomMemberRole.APPROVER);
  });

  it("keeps staff out of a restricted room they do not belong to", () => {
    const result = resolveRoomActor(session("staff_1", Role.STAFF), {
      room: { ...room, restricted: true },
      membership: null,
    });
    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("defaults an unrecognised role to the least privilege", () => {
    // getActor() falls back to CLIENT for anything it does not recognise, so a
    // tampered or stale JWT cannot buy edit rights.
    const tampered = {
      user: { id: "x", role: "SUPERUSER", name: null },
      expires: "2099-01-01T00:00:00.000Z",
    } as unknown as Session;

    const result = resolveRoomActor(tampered, {
      room,
      membership: { role: RoomMemberRole.OWNER },
      requestedMode: "studio",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.actor.effectiveRole).toBe(RoomMemberRole.APPROVER);
    expect(result.actor.mode).toBe("CLIENT");
    expect(result.actor.can("EDIT")).toBe(false);
  });
});

describe("requireStudioActor", () => {
  it("refuses a client", () => {
    const result = resolveRoomActor(session("client_1", Role.CLIENT), {
      room,
      membership: { role: RoomMemberRole.APPROVER },
    });
    if (!result.ok) throw new Error("expected ok");
    expect(requireStudioActor(result.actor)).toBe(false);
  });

  it("refuses staff who are previewing as a client", () => {
    const result = resolveRoomActor(session("staff_1", Role.STAFF), {
      room,
      membership: null,
      requestedMode: "client",
    });
    if (!result.ok) throw new Error("expected ok");
    expect(requireStudioActor(result.actor)).toBe(false);
  });

  it("admits staff in studio mode", () => {
    const result = resolveRoomActor(session("staff_1", Role.STAFF), {
      room,
      membership: null,
    });
    if (!result.ok) throw new Error("expected ok");
    expect(requireStudioActor(result.actor)).toBe(true);
  });
});
