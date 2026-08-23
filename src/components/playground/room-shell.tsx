"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Loader2, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { CanvasBoard } from "./canvas/canvas-board";
import type { OutboxStatus } from "./canvas/outbox";
import type { CanvasEdgeData, CanvasNodeData } from "./canvas/types";
import { useCanvasNodes } from "./canvas/use-canvas-nodes";
import { usePresenceSender } from "./canvas/use-presence-sender";
import { kindForMime, useUploads } from "./canvas/use-uploads";
import { useRoomStream } from "./canvas/use-room-stream";
import { CreativeToolbar, type ToolId } from "./creative-toolbar";
import { MeetingPill } from "./meeting-pill";
import { ModeIndicator } from "./mode-indicator";
import { PaxAiDock } from "./pax-ai-dock";
import { RoomHeader } from "./room-header";
import { InviteDialog } from "./invite-dialog";
import { NodeInspector } from "./node-inspector";
import { RoomPanel } from "./room-panel";
import { VisibilityBar } from "./visibility-bar";
import type { RoomDetailData, RoomViewer } from "./types";

/**
 * The room. Edge-to-edge, no page scroll — the canvas owns the viewport.
 *
 * Canvas content is persisted through the op pipeline: local state is applied
 * optimistically and the op is queued in the outbox, so the user never waits for
 * the network and unsent work survives a refresh or an offline spell.
 */
export function RoomShell({ roomId }: { roomId: string }) {
  const t = useTranslations("playground");

  const [room, setRoom] = React.useState<RoomDetailData | null>(null);
  const [viewer, setViewer] = React.useState<RoomViewer | null>(null);
  const [state, setState] = React.useState<"loading" | "ready" | "denied" | "error">(
    "loading"
  );
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [tool, setTool] = React.useState<ToolId>("select");
  const [selection, setSelection] = React.useState<ReadonlySet<string>>(new Set());
  const [saveStatus, setSaveStatus] = React.useState<OutboxStatus>("idle");
  // Bumped whenever the stream reports collaboration activity, so the panels
  // refetch instead of polling.
  const [liveRevision, setLiveRevision] = React.useState(0);
  /**
   * Staff stepping into the client's view.
   *
   * Re-fetches the room and the board through `?mode=client` — the IDENTICAL
   * server path a real client hits, resolved by resolveRoomActor and filtered by
   * clientNodeWhere. That is what makes this a preview rather than a
   * reimplementation that drifts from the thing it claims to preview.
   */
  const [previewAsClient, setPreviewAsClient] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  /** Set by CanvasBoard so toolbar-created nodes land on its undo stack. */
  const captureCreateRef = React.useRef<((ids: readonly string[]) => void) | null>(
    null
  );
  const [canvasReady, setCanvasReady] = React.useState(false);

  const { toast } = useToast();

  const canEdit = !!viewer?.can.edit;

  const onStatus = React.useCallback((status: OutboxStatus) => {
    setSaveStatus(status);
  }, []);

  // A refused write is told to the user in their own terms. Swallowing it would
  // mean someone keeps typing into a field whose changes are being discarded.
  const onRejected = React.useCallback(
    (result: { code?: string; lockedByName?: string | null }) => {
      if (result.code === "EDIT_LOCKED") {
        toast({
          variant: "warning",
          title: t("canvas.lockedTitle"),
          description: t("canvas.lockedBody", {
            name: result.lockedByName ?? t("common.someone"),
          }),
        });
      } else {
        toast({
          variant: "warning",
          title: t("canvas.staleTitle"),
          description: t("canvas.staleBody"),
        });
      }
    },
    [t, toast]
  );

  const api = useCanvasNodes({
    roomId,
    readOnly: !canEdit,
    onStatus,
    onRejected,
  });

  const seqRef = React.useRef(0);
  const { replaceAll } = api;

  // Refetch the board. The stream asks for this whenever it cannot guarantee we
  // are up to date — see the note on replay in the stream route.
  const reloadCanvas = React.useCallback(async () => {
    if (!viewer) return;
    try {
      const query = viewer.mode === "CLIENT" ? "?mode=client" : "";
      const res = await fetch(`/api/playground/rooms/${roomId}/snapshot${query}`);
      if (!res.ok) return;
      const data = await res.json();
      replaceAll(
        (data.nodes ?? []) as CanvasNodeData[],
        (data.edges ?? []) as CanvasEdgeData[]
      );
      seqRef.current = data.seq ?? 0;
    } catch {
      // The stream will ask again on its next reconnect.
    }
  }, [replaceAll, roomId, viewer]);

  const { status: streamStatus, participants, connectionId } = useRoomStream({
    roomId,
    mode: viewer?.mode,
    enabled: state === "ready",
    getSeq: () => seqRef.current,
    // A remote op means the board changed underneath us. Rather than applying a
    // partial op payload, refetch: it is a bounded read and it cannot leave the
    // board in a half-applied state.
    onOps: (ops) => {
      // Chat, comments, reactions and decisions arrive on the same channel as
      // canvas ops. Only the canvas ones justify a snapshot refetch; the rest
      // just tell the panels something changed.
      const kinds = new Set(
        (ops as Array<{ type?: string }>).map((op) => op?.type ?? "")
      );
      const collaboration = ["MESSAGE", "COMMENT", "REACTION", "DECISION"];
      if (collaboration.some((kind) => kinds.has(kind))) {
        setLiveRevision((n) => n + 1);
      }
      if ([...kinds].some((kind) => kind.startsWith("NODE_") || kind.startsWith("EDGE_"))) {
        void reloadCanvas();
      }
    },
    onResync: () => {
      void reloadCanvas();
    },
  });

  const presence = usePresenceSender({
    roomId,
    connectionId,
    enabled: state === "ready",
  });

  // Selection is presence too: it is what lets everyone see who is looking at
  // which idea during a discussion.
  React.useEffect(() => {
    presence.setSelection([...selection]);
  }, [presence, selection]);

  const { createNode } = api;
  const { upload } = useUploads({
    roomId,
    enabled: canEdit,
    onUploaded: (file, placement) => {
      createNode({
        kind: kindForMime(file.mime),
        x: placement.x,
        y: placement.y,
        w: placement.w,
        h: placement.h,
        text: file.name,
        data: {
          url: file.url,
          thumbUrl: file.thumbUrl,
          mime: file.mime,
          name: file.name,
          alt: file.name,
          roomFileId: file.id,
        },
      });
    },
    onError: (message) =>
      toast({ variant: "error", title: t("upload.failed"), description: message }),
  });

  /**
   * Submit the current selection for the client's approval.
   *
   * The server refuses anything not already published, so this cannot become a
   * back door around the publish step — it reports what was left out instead.
   */
  const requestApproval = React.useCallback(async () => {
    if (selection.size === 0) return;
    const title = window.prompt(t("publish.approvalTitlePrompt"));
    if (!title?.trim()) return;

    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), nodeIds: [...selection] }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "error", title: data.error ?? t("approve.failed") });
        return;
      }
      toast({
        variant: "success",
        title: t("publish.approvalSent"),
        description:
          data.excluded?.length > 0
            ? t("publish.refusedBody", { count: data.excluded.length })
            : undefined,
      });
      setLiveRevision((n) => n + 1);
    } catch {
      toast({ variant: "error", title: t("approve.failed") });
    }
  }, [roomId, selection, t, toast]);

  // The Upload tool opens a picker; drag-and-drop takes the same path.
  const pickFiles = React.useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,video/*,application/pdf,.doc,.docx,.pptx,.txt";
    input.onchange = () => {
      const files = [...(input.files ?? [])];
      if (files.length > 0) void upload(files, { x: 0, y: 0 });
    };
    input.click();
  }, [upload]);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/playground/rooms/${roomId}${previewAsClient ? "?mode=client" : ""}`
        );
        if (cancelled) return;

        if (res.status === 401 || res.status === 403 || res.status === 404) {
          // 404 is what an unrelated caller gets for a room that DOES exist, so
          // the UI must not distinguish "gone" from "not yours" either.
          setState("denied");
          return;
        }
        if (!res.ok) {
          setState("error");
          return;
        }

        const data = await res.json();
        setRoom(data.room);
        setViewer(data.viewer);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, previewAsClient]);

  // Cold-load the board once we know which projection we are entitled to.
  React.useEffect(() => {
    if (state !== "ready" || !viewer) return;
    void reloadCanvas().finally(() => setCanvasReady(true));
  }, [reloadCanvas, state, viewer, previewAsClient]);

  /**
   * Picking a creation tool drops a node in the middle of the current view and
   * hands selection straight to it, then returns to the select tool. A tool that
   * stays armed means the next click on the board creates a second note by
   * accident, which is the most common complaint about canvas apps.
   */
  const onSelectTool = React.useCallback(
    (next: ToolId) => {
      if (!canEdit || next === "select") {
        setTool(next);
        return;
      }

      // Draw stays armed until the stroke completes; it needs the next pointer
      // gesture. Everything else places immediately.
      // Modal tools stay armed until the gesture completes: a stroke needs a
      // drag, a connector needs two clicks.
      if (next === "draw" || next === "connect") {
        setTool(next);
        return;
      }

      if (next === "upload") {
        pickFiles();
        setTool("select");
        return;
      }

      const kind =
        next === "sticky"
          ? "STICKY"
          : next === "text"
            ? "TEXT"
            : next === "frame"
              ? "FRAME"
              : next === "palette"
                ? "PALETTE"
                : next === "shape"
                  ? "SHAPE"
                  : null;

      if (!kind) {
        // AI Spark opens the PAX dock, which is not wired yet; leaving the tool
        // selected would arm a gesture that does nothing.
        setTool("select");
        return;
      }

      const node = api.createNode({
        kind,
        // Placed at the world origin for now; the viewport centres on it.
        x: 0,
        y: 0,
        text: kind === "STICKY" || kind === "TEXT" ? "" : null,
        data:
          kind === "PALETTE"
            ? { colors: ["#1C2541", "#3A6EA5", "#F4D6A0", "#D97B29", "#B3352C"] }
            : {},
        style: kind === "SHAPE" ? { shape: "rect" } : {},
      });
      captureCreateRef.current?.([node.id]);
      setSelection(new Set([node.id]));
      // A new sticky or text block opens straight into editing. Creating one and
      // then having to discover a double-click is the most common complaint
      // about canvas tools, and an empty card is useless until it has words.
      if (kind === "STICKY" || kind === "TEXT") setEditingId(node.id);
      setTool("select");
    },
    [api, canEdit, pickFiles]
  );

  /**
   * Commit an inline edit.
   *
   * Goes through updateNode, so it becomes a version-guarded NODE_TEXT op and
   * picks up the server-enforced edit lock — the same path any other text change
   * takes. An empty sticky that was never typed into is removed rather than left
   * as an invisible blank card someone has to hunt for.
   */
  const commitEdit = React.useCallback(
    (nodeId: string, text: string) => {
      setEditingId(null);
      const node = api.byId.get(nodeId);
      if (!node) return;

      const trimmed = text.trim();
      // Discard a card that was created and never typed into — but ONLY a plain
      // sticky or text block. Anything else (a shape someone recoloured, a
      // decision card) is meaningful without words, and deleting it because the
      // text is empty would destroy work.
      const isBlankNote =
        !trimmed && !node.text && (node.kind === "STICKY" || node.kind === "TEXT");
      if (isBlankNote) {
        api.deleteNodes([nodeId]);
        setSelection(new Set());
        return;
      }
      if (trimmed !== (node.text ?? "")) {
        api.updateNode(nodeId, { text: trimmed || null });
      }
    },
    [api]
  );

  if (state === "loading") {
    return (
      <div className="grid h-full place-items-center bg-black">
        <span className="flex items-center gap-2 text-sm text-white/50">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          {t("room.loading")}
        </span>
      </div>
    );
  }

  if (state === "denied" || state === "error") {
    const denied = state === "denied";
    return (
      <div className="grid h-full place-items-center bg-black p-6">
        <EmptyState
          icon={TriangleAlert}
          title={denied ? t("errors.noAccessTitle") : t("errors.roomFailedTitle")}
          description={denied ? t("errors.noAccessBody") : t("errors.roomFailedBody")}
          action={
            <Link
              href="/playground"
              className="inline-flex rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              {t("room.backToRooms")}
            </Link>
          }
        />
      </div>
    );
  }

  if (!room || !viewer) return null;

  const isClientMode = viewer.mode === "CLIENT";

  return (
    <div className="flex h-full flex-col bg-black">
      <RoomHeader
        room={room}
        viewer={viewer}
        panelOpen={panelOpen}
        saveStatus={saveStatus}
        streamStatus={streamStatus}
        onlineCount={new Set(participants.map((p) => p.userId)).size}
        onTogglePreview={
          viewer.isStaff ? () => setPreviewAsClient((v) => !v) : undefined
        }
        onInvite={viewer.can.manage ? () => setInviteOpen(true) : undefined}
        onShare={async () => {
          const url = `${window.location.origin}/playground/${roomId}`;
          try {
            await navigator.clipboard.writeText(url);
            toast({ variant: "success", title: t("room.linkCopied") });
          } catch {
            // Clipboard is blocked outside a secure context, and on http:// in
            // particular. Say what to do instead of failing silently.
            toast({
              variant: "warning",
              title: t("room.copyFailed"),
              description: url,
            });
          }
        }}
        onTogglePanel={() => setPanelOpen((v) => !v)}
      />

      <div className="flex min-h-0 flex-1">
        {/* Client Mode presents; it does not author. */}
        {!isClientMode && (
          <CreativeToolbar
            active={tool}
            onSelect={onSelectTool}
            disabled={!canEdit}
            disabledReason={t("toolbar.readOnly")}
          />
        )}

        <main className="relative min-w-0 flex-1 overflow-hidden">
          {canvasReady ? (
            <CanvasBoard
              api={api}
              selection={selection}
              onSelectionChange={setSelection}
              readOnly={!canEdit}
              showVisibility={!isClientMode}
              participants={participants}
              selfConnectionId={connectionId}
              onCursor={presence.setCursor}
              onViewport={presence.setViewport}
              tool={
                tool === "draw" ? "draw" : tool === "connect" ? "connect" : "select"
              }
              onToolDone={() => setTool("select")}
              editingId={editingId}
              onRegisterCreateCapture={(capture) => {
                captureCreateRef.current = capture;
              }}
              onEditStart={setEditingId}
              onEditCommit={commitEdit}
              onEditCancel={() => setEditingId(null)}
              onDropFiles={(files, world) => void upload(files, world)}
            />
          ) : (
            <div className="grid h-full place-items-center">
              <Loader2
                size={20}
                className="animate-spin text-white/30"
                aria-label={t("room.loadingCanvas")}
              />
            </div>
          )}

          {/* The publish control sits directly over the board: "is the client
              looking at this?" is the question with the worst consequences if
              guessed wrong, so it answers itself wherever the work is. */}
          {/* Properties for the selection. Sits below the publish bar so the
              two never overlap, and only appears when there is something to
              change — an always-present, usually-empty panel trains people to
              stop looking at it. */}
          {!isClientMode && canEdit && selection.size === 1 && (
            <div className="pointer-events-none absolute inset-x-0 top-[4.25rem] flex justify-center px-4">
              {(() => {
                const node = api.byId.get([...selection][0]);
                if (!node) return null;
                return (
                  <NodeInspector
                    node={node}
                    onStyle={(patch) =>
                      api.updateNode(node.id, {
                        style: { ...node.style, ...patch },
                      })
                    }
                    onData={(patch) =>
                      api.updateNode(node.id, {
                        data: { ...node.data, ...patch },
                      })
                    }
                  />
                );
              })()}
            </div>
          )}

          {!isClientMode && viewer.can.publish && (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
              <VisibilityBar
                roomId={roomId}
                selection={selection}
                nodes={api.nodes}
                onChanged={() => void reloadCanvas()}
                onRequestApproval={() => void requestApproval()}
              />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4">
            <MeetingPill />
          </div>

          {viewer.can.useAi && (
            <div className="pointer-events-none absolute bottom-4 end-4">
              <PaxAiDock
                roomId={roomId}
                selection={selection}
                onInsert={(text) => {
                  // Placed as an AI_CARD, which is TEAM_ONLY by schema default
                  // AND barred from publication by kind. A generation becomes
                  // client-facing only when a person copies it into a real card.
                  const node = api.createNode({
                    kind: "AI_CARD",
                    x: 0,
                    y: 0,
                    w: 320,
                    h: 220,
                    text,
                  });
                  setSelection(new Set([node.id]));
                }}
              />
            </div>
          )}

          {/* An unmissable frame while previewing. The chip alone is easy to
              stop seeing after ten minutes; a border around the whole board is
              not, and mistaking a client preview for the real workspace is the
              expensive mistake this feature exists to prevent. */}
          {previewAsClient && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-30 border-2 border-amber-500/70"
            />
          )}

          {/* The header drops the mode chip on narrow screens, so restate it
              where it cannot be missed — this is the "am I safe to talk" signal. */}
          <div className="pointer-events-none absolute start-4 top-4 md:hidden">
            <ModeIndicator mode={viewer.mode} />
          </div>
        </main>

        {inviteOpen && (
          <InviteDialog
            roomId={roomId}
            open={inviteOpen}
            currentUserId={viewer.userId}
            onClose={() => setInviteOpen(false)}
            onChanged={() => setLiveRevision((n) => n + 1)}
          />
        )}

        {panelOpen && (
          <RoomPanel
            room={room}
            viewer={viewer}
            nodes={api.nodes}
            selection={selection}
            liveRevision={liveRevision}
            onlineUserIds={new Set(participants.map((p) => p.userId))}
            onSelectNode={(id, additive) =>
              setSelection((prev) => {
                if (!additive) return new Set([id]);
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onClose={() => setPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
