/**
 * Gap detection for the room stream.
 *
 * The server stamps each SSE ops frame with the room seq AFTER the whole
 * batch, and (since firstSeq shipped) also says which seq the batch STARTED
 * at. A frame is only a gap when its first seq skips past what we last
 * applied — a stamped id jumping by three because the frame carries three ops
 * is normal operation, and resyncing on it made every multi-op batch trigger
 * a full snapshot refetch for every subscriber.
 *
 * Pure and framework-free so it can be tested directly; the SSE handler in
 * use-room-stream.ts is just plumbing around this decision.
 */
export function shouldResync(
  lastApplied: number,
  stamped: number | null,
  firstSeq: number | null
): boolean {
  // No usable stamp on the frame: nothing to gap-check against. Apply.
  if (stamped === null || !Number.isFinite(stamped)) return false;
  // First frame after connect/reload — the snapshot fetch established our
  // baseline out of band, and a 0 baseline means we have not applied anything.
  if (lastApplied <= 0) return false;
  // A frame from a pre-firstSeq server is checked by its stamp alone, which
  // keeps the old (conservative, over-resyncing) behaviour during a deploy.
  const start = firstSeq !== null && Number.isFinite(firstSeq) ? firstSeq : stamped;
  return start > lastApplied + 1;
}
