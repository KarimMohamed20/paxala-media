"use client";

/**
 * The op outbox.
 *
 * Canvas mutations are queued here, coalesced, and flushed to the server as one
 * batch roughly every 120ms. Four properties matter, and each has a specific
 * failure it prevents:
 *
 * 1. STRICT FIFO. Ops are sent in the order they were made and a batch is never
 *    sent while a previous one is in flight. Out-of-order delivery would let a
 *    "move to X" overtake the "create" of the node it moves.
 *
 * 2. COALESCING PER (node, kind). A drag emits a move on every frame; only the
 *    LAST position matters. Superseding an unsent op in place — rather than
 *    appending — is what keeps a two-second drag to one op instead of 120.
 *    Coalescing never reorders: the superseded op keeps its original queue
 *    position, so a later create still cannot overtake an earlier one.
 *
 * 3. DURABILITY. The queue is mirrored to localStorage on every change, so a
 *    refresh, a crash or a closed laptop does not lose unsent work. It is
 *    reloaded and replayed on the next mount.
 *
 * 4. IDEMPOTENT REPLAY. Every op carries a `clientOpId`, unique per room. The
 *    server's unique constraint turns a duplicate into a no-op that returns the
 *    original sequence number, so replaying a queue whose response was lost is
 *    always safe. This is what allows blind retry.
 *
 * localStorage rather than IndexedDB: the payload is small, the API is
 * synchronous (so `pagehide` can write without a race), and IndexedDB's async
 * transaction can be killed mid-write when a tab is discarded — which is
 * precisely the moment durability is needed.
 */

export type OutboxOp = {
  clientOpId: string;
  type: string;
  nodeId: string;
  [key: string]: unknown;
};

export type OpResult = {
  clientOpId: string;
  ok: boolean;
  seq?: number;
  version?: number;
  code?: string;
  lockedByName?: string | null;
};

/**
 * `saved` is a transient confirmation shown briefly after the queue drains, then
 * it settles to `idle`. Without it the indicator would flick from "Saving…" to
 * nothing, which reads as the save having been abandoned.
 */
export type OutboxStatus =
  | "idle"
  | "pending"
  | "saving"
  | "saved"
  | "offline"
  | "error";

/** How long the "Saved" confirmation stays up before settling to idle. */
const SAVED_LINGER_MS = 2000;

const FLUSH_DELAY_MS = 120;
const MAX_BATCH = 100;
/** Cap so a long offline session cannot exhaust the storage quota. */
const MAX_QUEUE = 2000;
const STORAGE_PREFIX = "pmp.playground.outbox.";

/** Ops of these kinds supersede an earlier unsent op on the same node. */
const COALESCABLE = new Set([
  "NODE_MOVE",
  "NODE_RESIZE",
  "NODE_ORDER",
  "NODE_TEXT",
  "NODE_DATA",
  "NODE_STYLE",
]);

export type OutboxCallbacks = {
  onStatus?: (status: OutboxStatus, queued: number) => void;
  /** Per-op server verdicts, so the caller can reconcile stale or locked ops. */
  onResults?: (results: OpResult[]) => void;
};

export class Outbox {
  private queue: OutboxOp[] = [];
  private inFlight = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private retryDelay = 1000;
  private disposed = false;
  private savedTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly storageKey: string;

  constructor(
    private readonly roomId: string,
    private readonly callbacks: OutboxCallbacks = {}
  ) {
    this.storageKey = `${STORAGE_PREFIX}${roomId}`;
    this.queue = this.load();
    if (this.queue.length > 0) this.schedule();

    if (typeof window !== "undefined") {
      // `pagehide` fires on tab close, navigation AND bfcache entry, which
      // `beforeunload` does not reliably do on mobile Safari — the platform
      // where a backgrounded tab is most likely to be discarded outright.
      window.addEventListener("pagehide", this.onPageHide);
      window.addEventListener("online", this.onOnline);
    }
  }

  /** Queue an op, coalescing it against an unsent one where that is safe. */
  push(op: OutboxOp): void {
    if (this.disposed) return;

    if (COALESCABLE.has(op.type)) {
      // Search from the end: the most recent op for this node is the one to
      // supersede, and stopping at the first match keeps this O(1) in practice.
      for (let i = this.queue.length - 1; i >= 0; i--) {
        const existing = this.queue[i];
        if (existing.nodeId === op.nodeId && existing.type === op.type) {
          // Replace IN PLACE so queue order — and therefore causal order — is
          // untouched. Appending instead would let this op overtake others.
          // The new clientOpId is kept: the superseded op was never sent, so no
          // idempotency record exists for it on the server.
          this.queue[i] = op;
          this.persist();
          this.schedule();
          return;
        }
        // Stop coalescing past a delete or create for the same node: those are
        // causal boundaries, and merging across one would reorder history.
        if (
          existing.nodeId === op.nodeId &&
          (existing.type === "NODE_DELETE" || existing.type === "NODE_CREATE")
        ) {
          break;
        }
      }
    }

    this.queue.push(op);
    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    this.persist();
    this.schedule();
  }

  /** Number of ops waiting to be acknowledged. */
  get pending(): number {
    return this.queue.length;
  }

  async flushNow(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) clearTimeout(this.timer);
    if (this.savedTimer) clearTimeout(this.savedTimer);
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.onPageHide);
      window.removeEventListener("online", this.onOnline);
    }
  }

  // ---- internals ---------------------------------------------------------

  private schedule(): void {
    this.emit(this.queue.length > 0 ? "pending" : "idle");
    if (this.timer || this.inFlight || this.disposed) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, FLUSH_DELAY_MS);
  }

  private async flush(): Promise<void> {
    // The in-flight guard is what enforces FIFO: a second batch can never be
    // sent while the first is unacknowledged.
    if (this.inFlight || this.disposed || this.queue.length === 0) return;

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.emit("offline");
      return;
    }

    const batch = this.queue.slice(0, MAX_BATCH);
    this.inFlight = true;
    this.emit("saving");

    try {
      const res = await fetch(`/api/playground/rooms/${this.roomId}/ops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops: batch }),
      });

      if (!res.ok) {
        // 4xx that is not rate limiting means these ops will never be accepted;
        // retrying forever would wedge the queue and block every later op.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          this.retire(batch.map((op) => op.clientOpId));
          this.emit("error");
          return;
        }
        throw new Error(`ops failed: ${res.status}`);
      }

      const data = (await res.json()) as { results?: OpResult[] };
      const results = data.results ?? [];

      // Retire exactly what the server acknowledged. An op with no result stays
      // queued and is retried — losing a response must not lose the work.
      this.retire(results.map((r) => r.clientOpId));
      this.callbacks.onResults?.(results);

      this.retryDelay = 1000;
      if (this.queue.length > 0) {
        this.emit("pending");
      } else {
        this.emit("saved");
        if (this.savedTimer) clearTimeout(this.savedTimer);
        this.savedTimer = setTimeout(() => {
          this.savedTimer = null;
          // Only settle to idle if nothing new arrived in the meantime.
          if (!this.disposed && this.queue.length === 0) this.emit("idle");
        }, SAVED_LINGER_MS);
      }
    } catch {
      this.emit("offline");
      // Exponential backoff, capped, so a long outage does not spin the tab.
      this.retryDelay = Math.min(this.retryDelay * 2, 30_000);
      if (!this.disposed) {
        this.timer = setTimeout(() => {
          this.timer = null;
          void this.flush();
        }, this.retryDelay);
      }
    } finally {
      this.inFlight = false;
      if (!this.disposed && this.queue.length > 0 && !this.timer) this.schedule();
    }
  }

  private retire(ids: string[]): void {
    if (ids.length === 0) return;
    const done = new Set(ids);
    this.queue = this.queue.filter((op) => !done.has(op.clientOpId));
    this.persist();
  }

  private emit(status: OutboxStatus): void {
    this.callbacks.onStatus?.(status, this.queue.length);
  }

  private persist(): void {
    if (typeof window === "undefined") return;
    try {
      if (this.queue.length === 0) {
        window.localStorage.removeItem(this.storageKey);
      } else {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
      }
    } catch {
      // Quota exceeded or storage disabled (private mode, locked-down browser).
      // The in-memory queue still works for this session; only crash-durability
      // is lost, and that is not worth breaking the canvas over.
    }
  }

  private load(): OutboxOp[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private onPageHide = (): void => {
    if (this.queue.length === 0) return;
    this.persist();
    // A normal fetch is cancelled when the document goes away; sendBeacon is
    // handed to the browser and survives. Best-effort — anything it fails to
    // deliver is still in localStorage and replays on next load, and the
    // clientOpId makes double delivery harmless.
    try {
      const blob = new Blob(
        [JSON.stringify({ ops: this.queue.slice(0, MAX_BATCH) })],
        { type: "application/json" }
      );
      navigator.sendBeacon(`/api/playground/rooms/${this.roomId}/ops`, blob);
    } catch {
      // sendBeacon unavailable; localStorage replay covers it.
    }
  };

  private onOnline = (): void => {
    this.retryDelay = 1000;
    this.schedule();
  };
}

/** Create an op id. Matches the UUID shape the server validates. */
export function newOpId(): string {
  return crypto.randomUUID();
}
