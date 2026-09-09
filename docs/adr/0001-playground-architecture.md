# ADR 0001 — PMP Playground architecture

**Status:** accepted
**Date:** 2026-08-14

Decisions that are load-bearing, non-obvious, or deliberate deviations from how
the rest of this codebase works. Each one has a cheaper-looking alternative that
was rejected for a specific reason; if you are about to "simplify" one of these,
the reason is the part to read.

---

## 1. Client Mode is one chokepoint, not a parallel table family

**Decision.** Every read on behalf of a `CLIENT` actor goes through
`clientNodeWhere()` and the allowlist `clientNodeSelect` in
`src/lib/playground/client-scope.ts`, applied by `src/lib/playground/repo.ts`.
An eslint `no-restricted-syntax` rule bans `db.playground*` anywhere else.

A node is client-readable only when **both** hold:

- `visibility != TEAM_ONLY` — the author marked it shareable, and
- `clientVisibleSince != null` — a staff member ran "Publish to client".

**Why the second term exists.** Without it, flipping a visibility flag during a
brainstorm would silently expose work. The brief requires publication to be a
deliberate act, and this is that act.

**Why an allowlist `select` rather than fetch-then-strip.** A column added to
`PlaygroundNode` next year is invisible to clients by default. The strip
approach leaks every new column until someone remembers to add it to a
deny-list — which is precisely the failure it claims to prevent.

**Why not frozen snapshot tables for the client read path.** A snapshot still
has to be built by *some* serializer, so it relocates the forgotten-field
problem rather than removing it; and it cannot express un-publishing, which is
the recovery path for the mistake that actually happens (publishing the wrong
card). Bytes *are* frozen, but once and for one purpose — see §2.

**Precedent.** This repo has shipped exactly this class of bug before: migration
`20260811000000_add_folder_client_owner` exists because a missing `WHERE` term
surfaced one client's folder names inside another client's Asset Library.

---

## 2. Approval payloads are frozen; the board is not

**Decision.** `PlaygroundApproval.payload` holds an immutable copy of the
approved content, with a SHA-256 `contentHash` and the room sequence `atSeq`.
Built by an enumerated-column serializer in `src/lib/playground/publish.ts`,
never by `findMany()` + strip.

**Why.** "The client approved this" is worthless if the thing they approved has
since been edited. PMP must be able to keep working without invalidating a
signature. This is the pattern `Invoice` already uses: `items`, `subtotal` and
`total` are frozen at the moment of commitment while the client goes on browsing
live `Milestone` rows.

**The structural pruning is the subtle part.** An edge needs *both* endpoints;
a frame needs *every* child, iterated to a fixed point because dropping an inner
frame orphans the outer one. A dangling arrow or a gap in a frame **discloses
that something was removed** — a subtler leak than showing the content. Tests
in `publish.test.ts` cover each case; they are not incidental.

---

## 3. Soft delete on canvas rows only

**Deviation.** This schema has no soft delete anywhere. Playground introduces
`deletedAt` on nothing — but it *does* keep the full node payload, its comments
and its reaction tally in the `NODE_DELETE` event.

**Why.** Undo has to restore more than the node. Comments and reactions cascade,
so an undo that only recreated the node would silently destroy the vote tally —
which is the room's actual output. The event payload is the restore record.

**Why not a tombstone column.** Node ids are client-minted UUIDs and
`NODE_CREATE`/`NODE_UPDATE` are separate ops (update can never create), so no
replay path can resurrect a deleted node. The tombstone would buy nothing and
would break the repo's no-soft-delete invariant for no gain.

---

## 4. Realtime is per-process, and that is now a deployment invariant

**Decision.** `src/lib/playground/bus.ts` is a module singleton pinned to
`globalThis` — unconditionally, not dev-only like `src/lib/db.ts`, because
Turbopack re-evaluates route modules on hot reload and would orphan a plain
module-level `Map`.

**The invariant.** At two app containers there are two buses, each seeing only
its own subscribers, **with no error** — just silently missing updates.
`docker-compose.yml` defines one app service with no replicas, so this holds
today. It is the same limitation `rateLimit()` in `src/lib/security.ts` already
documents.

**Migration path, and its cost.** Postgres `LISTEN/NOTIFY` inside `publish` and
`subscribe`. It is **not** dependency-free: Prisma 5 exposes no
async-notification callback, so it needs `pg` on a dedicated connection.

**Corollary.** The AI monthly spend cap is a Postgres `COUNT`, not a rate-limit
bucket, precisely because the in-memory ones reset on deploy and are
per-process. Money needs a durable ceiling.

---

## 5. Reconnect refetches; it does not replay

**Decision.** A client that missed events is told to `resync` and refetches the
snapshot. `PlaygroundEvent` is not replayed into the client store.

**Why.** Event payloads are an *audit* log, deliberately lossy — a
`NODE_CREATE` event records kind and geometry but not text, data or style,
because the node row already holds those. Replaying one would reconstruct a node
with its content missing: a board that looks subtly wrong and never corrects
itself, which is far worse than a moment's reload.

**If reconnects ever become frequent enough to matter**, the fix is to fatten
event payloads into complete redo records. The sequence plumbing already
supports it.

---

## 6. Geometry ops are unguarded; text takes a server-enforced lock

**Decision.** `NODE_MOVE` / `NODE_RESIZE` / `NODE_ORDER` are plain updates with
no version guard — true last-write-wins. Discrete ops (text, data, style,
visibility) use the optimistic `updateMany` guard from the content-calendar
approve route. Text *additionally* takes a lock held in columns
(`editLockById` / `editLockAt`, 30s TTL).

**Why geometry is unguarded.** A version guard is
first-writer-wins-and-reject-the-rest. Applied to a continuous drag, two people
rubber-band against each other for the whole gesture. Losing the last 40ms of
someone's drag is invisible; fighting them is not.

**Why text needs more.** `rich-text-editor.tsx` emits the whole document on
every keystroke, so last-write-wins there means a colleague's paragraph vanishes
with no diff and no recovery — undo is local-only.

**Why the lock is in columns, not memory.** An in-process lock cannot survive a
deploy and cannot see a client whose SSE pipe died silently. Both cases leave a
node either permanently locked or effectively unlocked.

**The accepted cost.** Two people cannot type in the same sticky; the second
sees "Sara is editing". This will be described as "not real-time
collaboration". It is the deliberate trade that lets the CRDT be deferred.

**If it is rejected**, the escape is a per-field Y.Doc stored as `Bytes` on the
node row (~5 days, plus `yjs` / `y-prosemirror` / tiptap collaboration). Note:
Yjs does **not** require a WebSocket server — it is transport-agnostic and would
ride the existing SSE+POST channel. A *room-scoped* Y.Doc is what cannot work
here, because the protocol exchanges opaque struct updates that cannot be
authorized per item on the server.

---

## 7. The canvas is hand-built

**Decision.** DOM + CSS transform + SVG, no tldraw/excalidraw/konva.

**Why.** The approval payload must be a format we own and can hash (§2), and
tldraw's watermark-removal licence is a recurring vendor cost for a small
studio. A third-party store would also fight the server-authoritative op model
and the per-item visibility rule.

**The cost, stated plainly.** ~20 developer-days, in a codebase with zero canvas
prior art. The failure mode is not "it doesn't work" but "it feels bad", and
touch is the part most likely to be discovered as unshipped late.

**Two browser traps this depends on, both invisible in a naive implementation:**

1. React registers `wheel`/`touchstart`/`touchmove` as **passive**, so
   `preventDefault()` inside an `onWheel` prop is a silent no-op. The listener is
   attached imperatively with `{ passive: false }`.
2. Lenis (mounted app-wide) installs its own non-passive wheel listener. It is
   **not instantiated at all** on `/playground` — `lenis.stop()` would be wrong,
   because a stopped instance keeps its listeners and `preventDefault`s
   everything, killing iPad pinch.

---

## 8. Canvas coordinates never mirror

**Decision.** The viewport root is pinned `dir="ltr"`. Node bodies carry
`dir="auto"`. All chrome uses logical properties, enforced by
`npm run lint:rtl`.

**Why.** A spatial coordinate system that mirrors means two people in the same
meeting see the same note in different places. `src/styles/rtl.css` also
contains a global `[dir="rtl"] .flex-row { flex-direction: row-reverse }`, which
would corrupt any canvas chrome built with `flex-row`.

---

## 9. Calls are peer-to-peer mesh, signalled over the existing SSE channel

Rooms carry live calls (camera, screen share, mute, raise hand) for up to five
participants. Two decisions carry the design.

**Mesh, not an SFU.** Every participant sends their media directly to every
other one. Above roughly five people that stops working — each extra person is
another full copy of your outgoing video — but below it, a media server is
infrastructure to host, pay for and secure in exchange for nothing. PMP's
calls are an agency and a client looking at a board together, not a webinar.
Passing five would mean adding an SFU (LiveKit self-hosted), and the roster is
capped server-side so that limit is enforced rather than discovered.

**Signalling reuses the room's transport.** Offers, answers and ICE candidates
go out over `POST /api/playground/rooms/[roomId]/call` and come back on the
room's SSE stream — the same client→server / server→client split the op
pipeline already uses, and for the same reason: an App Router handler receives
a `Request`, never the socket, so a WebSocket upgrade is impossible without
abandoning `output: "standalone"` (decision 3). This needed one new primitive:
the bus could only broadcast, and an SDP offer is addressed to exactly one
peer, so `sendTo` was added alongside it.

Call state is in-memory beside the bus and is **never persisted**. A call is
something happening right now; after a restart there is none, which is the
truth. Routing signalling through `PlaygroundEvent` would also serialise every
message on the room row and inflate the op sequence that every client's gap
detector watches (decision 5).

The consequence to know about: participants are addressed by SSE
`connectionId`, and that changes every time a stream reconnects — which it
does on a 15-minute timer. A dropped participant therefore keeps their seat
for a 25-second grace window and reclaims it when the same user reappears, so
a routine recycle looks like nothing at all instead of everybody dropping out
of the call together.

TURN (`coturn`, opt-in behind a compose profile) is reliability only: the
peers that cannot connect directly are relayed, and everyone else never
touches it. Credentials are HMAC-derived per user and expire; the shared
secret never leaves the server.

---

## What is deliberately NOT built

- ~~**Live video.**~~ Built later as mesh WebRTC (see below); this entry is
  kept for the record.
- **Private file serving.** Owner decision: room uploads go to `public/uploads`,
  consistent with every other asset on the platform. Accepted residual risk — a
  leaked URL is readable without a session.
- **Scheduling.** No `scheduledAt`, so the dashboard has no "Upcoming sessions"
  section. An empty heading would be a promise the product does not keep.
