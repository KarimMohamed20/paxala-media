/**
 * Derives a version history from the ContentApproval log.
 *
 * Every SUBMITTED entry starts a new version; whatever verdict follows it (before
 * the next submission) is that version's outcome. No separate version table is
 * needed — a resubmission after "changes requested" IS the next version, and the
 * log already records who did what and when.
 *
 * Pure and dependency-free so both API routes and client components can use it.
 */

export type VersionState = "CURRENT" | "REVIEWED" | "ARCHIVED";

export interface ApprovalLike {
  id: string;
  action: "SUBMITTED" | "APPROVED" | "REJECTED";
  notes: string | null;
  reviewerName: string | null;
  reviewerRole: "ADMIN" | "STAFF" | "CLIENT";
  createdAt: string | Date;
}

export interface DerivedVersion {
  /** 1-based; V1 is the first submission. */
  version: number;
  state: VersionState;
  submittedAt: string;
  submittedBy: string | null;
  submittedByRole: "ADMIN" | "STAFF" | "CLIENT";
  /** null while the version is still awaiting a decision. */
  verdict: "APPROVED" | "REJECTED" | null;
  verdictAt: string | null;
  verdictBy: string | null;
  verdictNotes: string | null;
  /** The timestamp/actor a UI row should show for this version. */
  displayAt: string;
  displayBy: string | null;
}

const iso = (v: string | Date) =>
  typeof v === "string" ? v : v.toISOString();

export function deriveVersions(approvals: ApprovalLike[]): DerivedVersion[] {
  // The API returns newest-first; version numbering needs oldest-first.
  const ordered = [...approvals].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
  );

  const versions: DerivedVersion[] = [];

  for (const entry of ordered) {
    if (entry.action === "SUBMITTED") {
      versions.push({
        version: versions.length + 1,
        state: "CURRENT",
        submittedAt: iso(entry.createdAt),
        submittedBy: entry.reviewerName,
        submittedByRole: entry.reviewerRole,
        verdict: null,
        verdictAt: null,
        verdictBy: null,
        verdictNotes: null,
        displayAt: iso(entry.createdAt),
        displayBy: entry.reviewerName,
      });
      continue;
    }

    // A verdict belongs to the most recent submission. If a verdict somehow
    // precedes any submission (legacy/imported data), synthesise V1 so the
    // decision is not silently dropped.
    let current = versions[versions.length - 1];
    if (!current) {
      current = {
        version: 1,
        state: "CURRENT",
        submittedAt: iso(entry.createdAt),
        submittedBy: null,
        submittedByRole: entry.reviewerRole,
        verdict: null,
        verdictAt: null,
        verdictBy: null,
        verdictNotes: null,
        displayAt: iso(entry.createdAt),
        displayBy: null,
      };
      versions.push(current);
    }

    current.verdict = entry.action;
    current.verdictAt = iso(entry.createdAt);
    current.verdictBy = entry.reviewerName;
    current.verdictNotes = entry.notes;
  }

  const last = versions.length - 1;
  return versions.map((v, i) => {
    if (i === last) return { ...v, state: "CURRENT" as const };
    // A superseded version that was actually reviewed reads as "Reviewed" and
    // should surface the decision; one that was replaced without a verdict is
    // just archived, so it keeps its submission stamp.
    if (v.verdict) {
      return {
        ...v,
        state: "REVIEWED" as const,
        displayAt: v.verdictAt ?? v.submittedAt,
        displayBy: v.verdictBy,
      };
    }
    return { ...v, state: "ARCHIVED" as const };
  });
}

/** Convenience: the current version number, or 0 when never submitted. */
export function currentVersionNumber(approvals: ApprovalLike[]): number {
  return deriveVersions(approvals).length;
}

/** "0:12" / "1:04:07" from a seconds offset. */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
