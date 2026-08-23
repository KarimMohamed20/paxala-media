"use client";

import * as React from "react";
import type { PlaygroundNodeKind } from "@prisma/client";
import { formatBytes } from "@/lib/assets";

/**
 * Dropping files onto the canvas.
 *
 * THUMBNAILS ARE GENERATED IN THE BROWSER, before upload. A board opening forty
 * references should pull forty ~15KB WebP files rather than forty masters, and
 * doing that server-side would mean putting `sharp` (a native binary) into the
 * production image for a job the client can already do with `canvas.toBlob`.
 *
 * Uploads run at a small fixed concurrency for the same reason the Asset Library
 * modal does: a dozen parallel requests on a phone connection starve each other
 * and the whole batch finishes later than a queue would.
 */

const MAX_THUMB_EDGE = 640;
const THUMB_QUALITY = 0.72;
/** Matches UPLOAD_CONCURRENCY in the Asset Library. */
const CONCURRENCY = 3;

export type UploadedFile = {
  id: string;
  name: string;
  url: string;
  mime: string;
  size: number | null;
  thumbUrl: string | null;
};

/**
 * Render an image to a WebP thumbnail.
 *
 * Returns null rather than throwing for anything that is not a decodable image —
 * a PDF or a video simply has no client-side thumbnail, and the node falls back
 * to its file chip.
 */
export async function makeThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  if (typeof createImageBitmap !== "function") return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Corrupt or unsupported image data. The upload itself can still proceed.
    return null;
  }

  try {
    const scale = Math.min(
      1,
      MAX_THUMB_EDGE / Math.max(bitmap.width, bitmap.height)
    );
    // Already small enough that a thumbnail would not save anything.
    if (scale === 1 && file.size < 120_000) return null;

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/webp", THUMB_QUALITY);
    });
  } finally {
    // Bitmaps hold decoded pixel data; dropping a 4000x3000 photo without this
    // keeps ~48MB alive until GC decides otherwise.
    bitmap.close();
  }
}

/** Which node kind represents this file on the board. */
export function kindForMime(mime: string): PlaygroundNodeKind {
  if (mime.startsWith("image/")) return "IMAGE";
  return "FILE";
}

/** Natural node size for a file, so a photo does not land as a square. */
async function naturalSize(
  file: File
): Promise<{ w: number; h: number }> {
  if (!file.type.startsWith("image/") || typeof createImageBitmap !== "function") {
    return { w: 280, h: 96 };
  }
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 360 / Math.max(bitmap.width, bitmap.height));
      return {
        w: Math.max(80, Math.round(bitmap.width * scale)),
        h: Math.max(80, Math.round(bitmap.height * scale)),
      };
    } finally {
      bitmap.close();
    }
  } catch {
    return { w: 320, h: 220 };
  }
}

export function useUploads({
  roomId,
  enabled,
  onUploaded,
  onError,
}: {
  roomId: string;
  enabled: boolean;
  /** Called per file, with the world position it should occupy. */
  onUploaded: (
    file: UploadedFile,
    placement: { x: number; y: number; w: number; h: number }
  ) => void;
  onError?: (message: string) => void;
}) {
  const [uploading, setUploading] = React.useState(0);

  const uploadOne = React.useCallback(
    async (file: File, at: { x: number; y: number }) => {
      const body = new FormData();
      body.append("file", file);

      const [thumb, size] = await Promise.all([
        makeThumbnail(file),
        naturalSize(file),
      ]);
      if (thumb) body.append("thumb", thumb, "thumb.webp");

      const res = await fetch(`/api/playground/rooms/${roomId}/files`, {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // The server's message is specific ("Files must be under 50 MB") and is
        // better than anything this layer could invent.
        throw new Error(data.error ?? `Upload failed (${res.status})`);
      }

      const data = await res.json();
      onUploaded(data.file as UploadedFile, { ...at, ...size });
    },
    [onUploaded, roomId]
  );

  /**
   * Upload a batch, laying them out left to right from the drop point so a
   * multi-file drop does not stack every node on the same pixel.
   */
  const upload = React.useCallback(
    async (files: File[], at: { x: number; y: number }) => {
      if (!enabled || files.length === 0) return;

      setUploading((n) => n + files.length);

      const queue = files.map((file, index) => ({
        file,
        at: { x: at.x + (index % 4) * 40, y: at.y + Math.floor(index / 4) * 40 },
      }));

      let cursor = 0;
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, queue.length) },
        async () => {
          while (cursor < queue.length) {
            const item = queue[cursor++];
            try {
              await uploadOne(item.file, item.at);
            } catch (error) {
              onError?.(
                error instanceof Error
                  ? error.message
                  : `Could not add ${item.file.name}`
              );
            } finally {
              setUploading((n) => Math.max(0, n - 1));
            }
          }
        }
      );

      await Promise.all(workers);
    },
    [enabled, onError, uploadOne]
  );

  return { upload, uploading, formatBytes };
}
