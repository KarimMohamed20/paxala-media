import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/assets";
import { getFileUrl } from "@/lib/utils";
import { resolveRoomActor } from "@/lib/playground/actors";
import {
  createRoomFile,
  getMembership,
  getRoomForAccess,
  listRoomFiles,
} from "@/lib/playground/repo";

/**
 * Room file uploads.
 *
 * Files land in `public/uploads/playground/<roomId>/`, consistent with the rest
 * of the platform's asset handling (the owner's explicit decision). The
 * ACCEPTED trade-off: like every other asset here, a leaked URL is readable
 * without a session.
 *
 * Two things are done to narrow that: filenames are random UUIDs rather than
 * `timestamp-originalname`, so a room's references cannot be enumerated by
 * guessing; and the original name is kept in the database for display, so
 * nothing is lost by not putting it in the path.
 *
 * A room upload is NOT an Asset Library entry. `PlaygroundFile.projectFileId`
 * stays null until someone deliberately promotes it, which keeps brainstorm
 * scraps out of the client's library.
 */

export const maxDuration = 300;

/**
 * Accepted types, deliberately narrower than the Asset Library's list: a canvas
 * renders images, video and documents, and there is no reason for a room to
 * accept a zip or an executable-adjacent archive.
 */
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

/** Cap below the Asset Library's 500MB: a canvas reference is not a master. */
const MAX_ROOM_UPLOAD_BYTES = Math.min(MAX_UPLOAD_BYTES, 50 * 1024 * 1024);

const EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "text/plain": ".txt",
};

/**
 * Magic-byte signatures.
 *
 * `file.type` is supplied by the browser and is trivially forged. Checking the
 * leading bytes means a file CLAIMING to be a PNG actually starts like one —
 * the extension is derived from the verified type, never from the upload's own
 * filename, so a `.html` cannot be smuggled onto a domain that also serves the
 * app. Formats without a stable signature (text, office XML) fall back to the
 * declared type, which is why the allow-list stays narrow.
 */
const SIGNATURES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "video/mp4", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
  { mime: "video/quicktime", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
];

function signatureMatches(buffer: Buffer, mime: string): boolean {
  const candidates = SIGNATURES.filter((s) => s.mime === mime);
  // No signature on record — accept the declared type. The allow-list is the
  // real guard for these.
  if (candidates.length === 0) return true;
  return candidates.some(({ bytes, offset = 0 }) =>
    bytes.every((byte, i) => buffer[offset + i] === byte)
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const room = await getRoomForAccess(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const membership = await getMembership(roomId, session.user.id);
    const access = resolveRoomActor(session, { room, membership });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!access.actor.can("EDIT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-upload:${access.actor.userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many uploads. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_ROOM_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `Files must be under ${formatBytes(MAX_ROOM_UPLOAD_BYTES)}. Put masters in the Asset Library instead.`,
        },
        { status: 413 }
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: `Cannot add "${file.type || "unknown"}" files to a room.` },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!signatureMatches(buffer, file.type)) {
      return NextResponse.json(
        { error: "This file's contents do not match its type." },
        { status: 415 }
      );
    }

    // Path derived entirely from ids and the VERIFIED mime — never from the
    // upload's own filename, so there is nothing to traverse with.
    const fileId = randomUUID();
    const extension = EXTENSION[file.type] ?? "";
    const directory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "playground",
      roomId
    );
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, `${fileId}${extension}`), buffer);

    const url = getFileUrl(`/uploads/playground/${roomId}/${fileId}${extension}`);

    // The thumbnail is generated in the BROWSER before upload (canvas.toBlob)
    // and posted alongside, so no image library enters the server image.
    const thumb = formData.get("thumb");
    let thumbUrl: string | null = null;
    if (thumb instanceof File && thumb.size > 0 && thumb.size < 2_000_000) {
      const thumbBuffer = Buffer.from(await thumb.arrayBuffer());
      if (signatureMatches(thumbBuffer, "image/webp")) {
        await writeFile(path.join(directory, `${fileId}-thumb.webp`), thumbBuffer);
        thumbUrl = getFileUrl(
          `/uploads/playground/${roomId}/${fileId}-thumb.webp`
        );
      }
    }

    const record = await createRoomFile({
      roomId,
      name: file.name.slice(0, 200),
      url,
      mime: file.type,
      size: file.size,
      thumbUrl,
      uploadedById: access.actor.userId,
      uploadedByName: access.actor.name,
    });

    return NextResponse.json({ file: record }, { status: 201 });
  } catch (error) {
    console.error("Playground file upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

// GET — files already in this room, for the "add existing" picker.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const room = await getRoomForAccess(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const membership = await getMembership(roomId, session.user.id);
    const access = resolveRoomActor(session, { room, membership });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json({ files: await listRoomFiles(roomId) });
  } catch (error) {
    console.error("Playground files GET error:", error);
    return NextResponse.json({ error: "Failed to load files" }, { status: 500 });
  }
}
