"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
import { matchToolShortcut } from "./toolbar-shortcuts";
import { DEFAULT_SIZE } from "./canvas/use-canvas-nodes";
import { ROOM_UPLOAD_ACCEPT } from "@/lib/playground/room-files";
import { formatBytes } from "@/lib/assets";
import { MeetingPill } from "./meeting-pill";
import { CallTiles } from "./call/call-tiles";
import { useRoomCall } from "./call/use-room-call";
import type { CallSnapshot } from "@/lib/playground/call/types";
import { ModeIndicator } from "./mode-indicator";
import { PaxAiDock } from "./pax-ai-dock";
import { RoomHeader } from "./room-header";
import { InviteDialog } from "./invite-dialog";
import { NodeInspector } from "./node-inspector";
import { clampFontSize, resolveTextStyle } from "./canvas/text-style";
import { planEditCommit } from "./canvas/edit-commit";
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
  // Used only for the no-access screen, which renders before `viewer` exists:
  // a client who cannot open this room belongs back in the portal.
  const { data: session } = useSession();
  const roomsHref =
    session?.user?.role === "CLIENT" ? "/portal/playground" : "/playground";

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
  /** Set by CanvasBoard: the world point at the middle of the current view. */
  const viewCenterRef = React.useRef<(() => { x: number; y: number }) | null>(
    null
  );
  const [canvasReady, setCanvasReady] = React.useState(false);

  const { toast } = useToast();

  const canEdit = !!viewer?.can.edit;

  /**
   * Reload discipline. A snapshot refetch REPLACES the whole board, so one that
   * lands while our own writes are still unacknowledged rolls the user's work
   * back in front of them. Three guards below:
   *  - saveStatusRef + pendingReloadRef defer a reload while the outbox is
   *    pending/saving, with a 2s force-timer so a wedged outbox cannot keep a
   *    live meeting stale;
   *  - reloadingRef/reloadAgainRef collapse concurrent requests into
   *    single-flight with one trailing rerun;
   *  - reloadTokenRef drops a response that was superseded by a newer request.
   */
  const saveStatusRef = React.useRef<OutboxStatus>("idle");
  const pendingReloadRef = React.useRef(false);
  const forceReloadTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const reloadingRef = React.useRef(false);
  const reloadAgainRef = React.useRef(false);
  const reloadTokenRef = React.useRef(0);
  const requestReloadRef = React.useRef<((force?: boolean) => void) | null>(null);

  const onStatus = React.useCallback((status: OutboxStatus) => {
    setSaveStatus(status);
    saveStatusRef.current = status;
    // The moment our writes settle (acked, failed, or offline), run the reload
    // that was deferred while they were in flight.
    if (pendingReloadRef.current && status !== "pending" && status !== "saving") {
      pendingReloadRef.current = false;
      if (forceReloadTimerRef.current) {
        clearTimeout(forceReloadTimerRef.current);
        forceReloadTimerRef.current = null;
      }
      requestReloadRef.current?.();
    }
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

  /** Current SSE connection id, readable by the outbox at flush time. */
  const connectionIdRef = React.useRef<string | null>(null);
  /** Room seq we know we are current to; the stream replays from here. */
  const seqRef = React.useRef(0);
  /** Filled once useRoomStream (declared below) exists; called post-flush only. */
  const noteSeqRef = React.useRef<((seq: number) => void) | null>(null);
  /** Same bridge for the call hook, which needs the stream's connectionId. */
  const callHandlersRef = React.useRef<{
    onCall: (call: CallSnapshot) => void;
    onRtc: (from: string, signal: unknown) => void;
  } | null>(null);

  // The optimistic edge is already rolled back by the hook; this only explains
  // to the user why the arrow they drew has gone.
  const onEdgeRejected = React.useCallback(() => {
    toast({
      variant: "warning",
      title: t("canvas.connectorFailedTitle"),
      description: t("canvas.connectorFailedBody"),
    });
  }, [t, toast]);

  const api = useCanvasNodes({
    roomId,
    readOnly: !canEdit,
    onStatus,
    onRejected,
    onEdgeRejected,
    getConnectionId: () => connectionIdRef.current,
    onRoomSeq: (seq) => {
      // Our own committed writes advance the room seq; both the reconnect
      // cursor and the gap detector must learn it here, because the author is
      // excluded from their own broadcast — otherwise the next remote frame
      // reads as dropped frames and forces a needless resync.
      if (seq > seqRef.current) seqRef.current = seq;
      noteSeqRef.current?.(seq);
    },
  });

  const { replaceAll } = api;

  // Refetch the board. The stream asks for this whenever it cannot guarantee we
  // are up to date — see the note on replay in the stream route.
  /**
   * Park a reload until the outbox settles: onStatus runs it on the next
   * quiet transition, and the 2s timer forces it if the queue never drains.
   * Never re-enters the single-flight loop directly, so a dirty outbox can
   * never turn into a tight fetch spin.
   */
  const deferReload = React.useCallback(() => {
    pendingReloadRef.current = true;
    if (!forceReloadTimerRef.current) {
      forceReloadTimerRef.current = setTimeout(() => {
        forceReloadTimerRef.current = null;
        if (pendingReloadRef.current) {
          pendingReloadRef.current = false;
          requestReloadRef.current?.(true);
        }
      }, 2000);
    }
  }, []);

  const reloadCanvas = React.useCallback(
    async (force = false) => {
      if (!viewer) return;
      const token = ++reloadTokenRef.current;
      try {
        const query = viewer.mode === "CLIENT" ? "?mode=client" : "";
        const res = await fetch(
          `/api/playground/rooms/${roomId}/snapshot${query}`
        );
        if (!res.ok) return;
        const data = await res.json();
        // A newer reload started while this response was in the air; its snapshot
        // is at least as fresh as this one, so applying this one would go BACK.
        if (token !== reloadTokenRef.current) return;
        // The request-time defer is not enough: the outbox can go dirty while
        // this snapshot is in the air, and applying it then rolls the user's
        // drag or fresh sticky back in front of them. Re-request instead —
        // unless this IS the forced liveness pass, which applies regardless.
        if (
          !force &&
          (saveStatusRef.current === "pending" ||
            saveStatusRef.current === "saving")
        ) {
          deferReload();
          return;
        }
        replaceAll(
          (data.nodes ?? []) as CanvasNodeData[],
          (data.edges ?? []) as CanvasEdgeData[]
        );
        seqRef.current = Math.max(seqRef.current, data.seq ?? 0);
      } catch {
        // The stream will ask again on its next reconnect.
      }
    },
    [deferReload, replaceAll, roomId, viewer]
  );

  /** Stream-triggered reload: deferred while dirty, single-flight, rerun-once. */
  const requestReload = React.useCallback(
    (force = false) => {
      const status = saveStatusRef.current;
      // `force` (the 2s liveness timer) skips the defer entirely — otherwise a
      // queue that never drains would re-defer here forever and the board
      // would stay stale for the whole session.
      if (!force && (status === "pending" || status === "saving")) {
        deferReload();
        return;
      }

      if (reloadingRef.current) {
        reloadAgainRef.current = true;
        return;
      }
      reloadingRef.current = true;
      void (async () => {
        try {
          // Only the first pass keeps `force`; a rerun queued during it was an
          // ordinary request and gets ordinary (defer-respecting) semantics.
          let forceThisPass = force;
          do {
            reloadAgainRef.current = false;
            await reloadCanvas(forceThisPass);
            forceThisPass = false;
          } while (reloadAgainRef.current);
        } finally {
          reloadingRef.current = false;
        }
      })();
    },
    [deferReload, reloadCanvas]
  );

  React.useEffect(() => {
    requestReloadRef.current = requestReload;
  }, [requestReload]);

  React.useEffect(
    () => () => {
      if (forceReloadTimerRef.current) clearTimeout(forceReloadTimerRef.current);
    },
    []
  );

  const {
    status: streamStatus,
    participants,
    connectionId,
    noteSeq,
  } = useRoomStream({
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
        requestReload();
      }
    },
    onResync: () => {
      requestReload();
    },
    // The call hook needs `connectionId`, which this hook produces, so the
    // handlers are bridged through a ref rather than ordered around a cycle.
    onCall: (snapshot) => callHandlersRef.current?.onCall(snapshot),
    onRtc: (from, _fromUserId, payload) =>
      callHandlersRef.current?.onRtc(from, payload),
  });

  // The outbox reads this at flush time so the server can exclude this tab
  // from its own broadcast — otherwise every local op echoes back and forces
  // a board reload that wipes optimistic state.
  React.useEffect(() => {
    connectionIdRef.current = connectionId;
  }, [connectionId]);

  React.useEffect(() => {
    noteSeqRef.current = noteSeq;
  }, [noteSeq]);

  // A refused microphone or a full call has to say so — the alternative is a
  // join button that appears to do nothing.
  const onCallError = React.useCallback(
    (kind: "permission" | "device" | "full" | "staffOnly" | "failed") => {
      const messages = {
        permission: "meeting.permissionDenied",
        device: "meeting.deviceError",
        full: "meeting.full",
        staffOnly: "meeting.staffOnlyStart",
        failed: "meeting.joinFailed",
      } as const;
      toast({ variant: "warning", title: t(messages[kind]) });
    },
    [t, toast]
  );

  const call = useRoomCall({
    roomId,
    connectionId,
    onError: onCallError,
  });

  const { applyCallEvent, applyRtcSignal } = call;
  React.useEffect(() => {
    callHandlersRef.current = { onCall: applyCallEvent, onRtc: applyRtcSignal };
  }, [applyCallEvent, applyRtcSignal]);

  // Someone opening a room where a call is already running learns about it
  // here; every later change arrives on the stream.
  React.useEffect(() => {
    if (state !== "ready" || !viewer) return;
    let cancelled = false;
    void (async () => {
      try {
        const query = viewer.mode === "CLIENT" ? "?mode=client" : "";
        const res = await fetch(`/api/playground/rooms/${roomId}/call${query}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.call) applyCallEvent(data.call as CallSnapshot);
      } catch {
        // Not fatal: the next roster broadcast fills this in.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyCallEvent, roomId, state, viewer]);

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
          // FileBody renders this directly; without it the chip's size line
          // was permanently blank.
          sizeLabel: typeof file.size === "number" ? formatBytes(file.size) : null,
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
    // The server's exact allow-list. The old `image/*` accepted HEIC/SVG/BMP
    // that came back as a 415 after fully uploading — iPhone photos, usually.
    input.accept = ROOM_UPLOAD_ACCEPT;
    input.onchange = () => {
      const files = [...(input.files ?? [])];
      // Dropped where the user is looking, not at world origin — a picker has
      // no drop point, and origin is off screen the moment the board has been
      // panned, which read as "upload is broken".
      if (files.length > 0) {
        void upload(files, viewCenterRef.current?.() ?? { x: 0, y: 0 });
      }
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

      // Modal tools arm and wait for pointer gestures. Draw stays armed ACROSS
      // strokes (a pen that needs re-picking per stroke cannot sketch) and is
      // disarmed by Escape, V or another tool. Connect still disarms after one
      // link — a mis-armed connect mutates selection on every subsequent
      // click, which costs more than re-picking it.
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

      // Centred in the current VIEW: an origin-placed node is invisible the
      // moment the board has been panned, which reads as the tool doing
      // nothing at all.
      const center = viewCenterRef.current?.() ?? { x: 0, y: 0 };
      const size = DEFAULT_SIZE[kind] ?? { w: 240, h: 160 };
      const node = api.createNode({
        kind,
        x: center.x - size.w / 2,
        y: center.y - size.h / 2,
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
   * Keyboard tool shortcuts — Ctrl+Alt+letter (Ctrl+Alt+T text, Ctrl+Alt+S
   * sticky, …), matching the toolbar tooltips. Window-level rather than on
   * the board container: the board only receives keys while focused, and
   * after any toolbar or panel click every shortcut would dead-key.
   *
   * Escape (unmodified) disarms an armed tool (the pen stays armed across
   * strokes); the board's own Escape clears selection — both firing on one
   * press is fine.
   */
  React.useEffect(() => {
    // viewer.mode, not the later isClientMode const — that is declared after
    // the loading/denied early returns and does not exist up here.
    if (state !== "ready" || viewer?.mode === "CLIENT") return;

    const onKeyDown = (event: KeyboardEvent) => {
      // The inline editor stops propagation itself; the editingId guard covers
      // inspector fields and anything else that renders while editing.
      if (editingId) return;
      if (event.repeat) return;
      // A shortcut fired while a dialog is up would create nodes behind the
      // modal (dialogs park focus on plain buttons, which the tag guard below
      // does not catch).
      if (inviteOpen) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[role="dialog"]')) return;
      if (
        target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      if (event.key === "Escape") {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (tool !== "select") setTool("select");
        return;
      }

      // Tools fire ONLY on Ctrl+Alt+letter (matcher owns the modifier rule).
      // Matched on event.code, not event.key: on the Arabic/Hebrew layouts
      // this product ships, `key` is a non-Latin character and letter
      // shortcuts would die.
      const next = matchToolShortcut(event);
      if (!next) return;
      // Whatever the browser binds to this combo, the board owns it now.
      event.preventDefault();
      // Viewers may switch back to select but must never reach a creation
      // tool — onSelectTool's !canEdit branch would happily arm one.
      if (!canEdit && next !== "select") return;
      onSelectTool(next);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state, viewer, editingId, inviteOpen, canEdit, tool, onSelectTool]);

  /**
   * Commit an inline edit.
   *
   * Goes through updateNode, so it becomes a version-guarded NODE_TEXT (or
   * NODE_DATA) op and picks up the server-enforced edit lock — the same path
   * any other change takes. Only a TEXT block that never had words is deleted
   * on an empty commit; an empty sticky is a visible card and survives.
   */
  const commitEdit = React.useCallback(
    (nodeId: string, text: string) => {
      setEditingId(null);
      const node = api.byId.get(nodeId);
      if (!node) return;

      // Which kinds delete when blank, which write data.title instead of text
      // — all of that lives in planEditCommit, where it is unit-tested.
      const plan = planEditCommit(node, text);
      switch (plan.action) {
        case "delete":
          api.deleteNodes([nodeId]);
          setSelection(new Set());
          return;
        case "text":
          api.updateNode(nodeId, { text: plan.text });
          return;
        case "data":
          api.updateNode(nodeId, { data: plan.data });
          return;
        case "none":
          return;
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
              href={roomsHref}
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
        // The header's session timer, dormant until now, counts the call.
        liveSince={
          call.call.startedAt ? new Date(call.call.startedAt) : null
        }
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
              onRegisterViewCenter={(getCenter) => {
                viewCenterRef.current = getCenter;
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
                    onStyle={(patch) => {
                      // Changing a TEXT node's font size scales its box by the
                      // same ratio: characters-per-line stays constant, so the
                      // wrap is preserved and 96px text does not vanish inside
                      // the 260x80 box the node was created with.
                      if (
                        node.kind === "TEXT" &&
                        typeof patch.fontSize === "number"
                      ) {
                        const prev = resolveTextStyle(node).fontSize;
                        const next = clampFontSize(patch.fontSize);
                        if (next !== prev) {
                          const ratio = next / prev;
                          api.resizeNodes(
                            new Map([
                              [
                                node.id,
                                {
                                  x: node.x,
                                  y: node.y,
                                  w: Math.round(node.w * ratio),
                                  h: Math.round(node.h * ratio),
                                },
                              ],
                            ])
                          );
                        }
                      }
                      api.updateNode(node.id, {
                        style: { ...node.style, ...patch },
                      });
                    }}
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
                onChanged={() => requestReload()}
                onRequestApproval={() => void requestApproval()}
              />
            </div>
          )}

          {/* Tiles stack above the controls in the column that was already
              here for them. Bottom-centre keeps the PaxAiDock corner free. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 p-4">
            {call.call.active && (
              <CallTiles
                members={call.call.members}
                selfConnectionId={connectionId}
                localStream={call.localStream}
                remoteStreams={call.remoteStreams}
                cameraOn={call.cameraOn}
              />
            )}
            <MeetingPill
              enabled={!!viewer}
              joined={call.joined}
              joining={call.joining}
              idle={!call.call.active}
              // Only the agency side may ring a room; a client joins a call
              // that is already happening.
              canStart={viewer.isStaff}
              muted={call.muted}
              cameraOn={call.cameraOn}
              sharing={call.sharing}
              handRaised={call.handRaised}
              canScreenShare={call.canScreenShare}
              onJoin={() => void call.join()}
              onLeave={call.leave}
              onToggleMute={call.toggleMute}
              onToggleCamera={() => void call.toggleCamera()}
              onToggleShare={() => void call.toggleShare()}
              onToggleHand={call.toggleHand}
            />
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
                  const center = viewCenterRef.current?.() ?? { x: 0, y: 0 };
                  const node = api.createNode({
                    kind: "AI_CARD",
                    x: center.x - 160,
                    y: center.y - 110,
                    w: 320,
                    h: 220,
                    text,
                  });
                  captureCreateRef.current?.([node.id]);
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
