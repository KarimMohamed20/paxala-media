import path from "path";

/**
 * Resolve a requested upload path STRICTLY inside the uploads root.
 *
 * The catch-all route receives `params.path` segments that, while normally
 * decoded by Next, must never be trusted to stay inside `public/uploads` —
 * a `..` segment (or an absolute one) would otherwise walk the join out of
 * the root and serve arbitrary files. Returns null for anything that resolves
 * outside the root, is empty, or smuggles a NUL byte.
 */
export function resolveUploadPath(
  root: string,
  segments: readonly string[]
): string | null {
  if (segments.length === 0) return null;

  for (const segment of segments) {
    if (!segment || segment.includes("\0")) return null;
  }

  const rootResolved = path.resolve(root);
  const resolved = path.resolve(rootResolved, ...segments);

  // Prefix check against root + separator so "/uploads-evil" cannot pass as
  // being inside "/uploads".
  if (!resolved.startsWith(rootResolved + path.sep)) return null;

  return resolved;
}
