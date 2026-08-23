import type { Prisma } from "@prisma/client";

/**
 * Room-scoped operation sequence allocation.
 *
 * Every mutation in a room gets a `seq`, and reconnecting clients ask for
 * "everything after N". That only works if the log is GAPLESS and its order
 * matches COMMIT order.
 *
 * A Postgres sequence (or an autoincrement column) gives neither: sequences
 * allocate outside transaction control, so two concurrent writers can take 5 and
 * 6 while 6 commits first. A client that reconnects in between sees 6, records
 * `lastSeq = 6`, and then asks for `seq > 6` — permanently skipping 5. The bug
 * is invisible in testing and looks like "sometimes a sticky doesn't appear".
 *
 * `UPDATE ... RETURNING` on the room row takes a row lock held until commit, so
 * a second writer for the same room blocks until the first is durable. Sequence
 * order therefore equals commit order by construction, and the log has no holes.
 *
 * Cost, stated plainly: writes to a single room serialize. At ~20 participants
 * each flushing one batch per 120ms that is ~160 short transactions per second
 * on one row — comfortably within Postgres, but it is a real per-room ceiling.
 */

/**
 * Reserve `count` consecutive sequence numbers for `roomId`.
 *
 * MUST be called inside the same transaction as the writes it numbers —
 * passing the interactive-transaction client is what holds the row lock. Calling
 * it on the bare `db` client allocates and commits immediately, which reopens
 * the gap this function exists to close.
 *
 * Returns the FIRST allocated number; the caller owns `[first, first + count)`.
 */
export async function allocSeq(
  tx: Prisma.TransactionClient,
  roomId: string,
  count = 1
): Promise<number> {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`allocSeq: count must be a positive integer, got ${count}`);
  }

  const rows = await tx.$queryRaw<Array<{ opSeq: number }>>`
    UPDATE "PlaygroundRoom"
    SET "opSeq" = "opSeq" + ${count}
    WHERE "id" = ${roomId}
    RETURNING "opSeq"
  `;

  const row = rows[0];
  if (!row) {
    // The room was deleted between the access check and this write.
    throw new Error(`allocSeq: room ${roomId} not found`);
  }

  // opSeq now holds the LAST allocated number, so the block starts here.
  return row.opSeq - count + 1;
}
