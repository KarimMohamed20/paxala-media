"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Archive, Loader2, Plus, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateRoomDialog } from "./create-room-dialog";
import { RoomCard } from "./room-card";
import type { ClientOption, ProjectOption, RoomCardData, RoomPerson } from "./types";

/**
 * The Playground dashboard.
 *
 * Sections follow the brief, minus "Upcoming Sessions": scheduling is not in the
 * MVP list and there is no scheduledAt column, so an empty "Upcoming" heading
 * would be a promise the product does not keep.
 *
 * Data is fetched client-side on mount, matching every other portal surface in
 * this codebase (useEffect + fetch, manual refetch after mutations).
 */
export function PlaygroundDashboard({
  projectFilterId,
  projectTitle,
  openCreateOnMount = false,
}: {
  /** Renders the project-scoped view at /portal/projects/[slug]/playground. */
  projectFilterId?: string;
  projectTitle?: string;
  /** Deep link from /playground/new. */
  openCreateOnMount?: boolean;
} = {}) {
  const t = useTranslations("playground");

  const [rooms, setRooms] = React.useState<RoomCardData[]>([]);
  const [clients, setClients] = React.useState<ClientOption[]>([]);
  const [projects, setProjects] = React.useState<ProjectOption[]>([]);
  const [people, setPeople] = React.useState<RoomPerson[]>([]);
  const [canCreate, setCanCreate] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [showArchived, setShowArchived] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/playground/rooms");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setRooms(data.rooms ?? []);
      setClients(data.clients ?? []);
      setProjects(data.projects ?? []);
      setPeople(data.people ?? []);
      setCanCreate(!!data.canCreate);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openDialog = React.useCallback(() => setDialogOpen(true), []);

  // Deep-linked creation waits for the pickers to arrive, so the dialog does not
  // open with empty client and project lists.
  React.useEffect(() => {
    if (openCreateOnMount && canCreate) setDialogOpen(true);
  }, [openCreateOnMount, canCreate]);

  const closeDialog = React.useCallback(() => {
    setDialogOpen(false);
    load();
  }, [load]);

  const scoped = React.useMemo(
    () =>
      projectFilterId
        ? rooms.filter((r) => r.project?.id === projectFilterId)
        : rooms,
    [rooms, projectFilterId]
  );

  const awaiting = scoped.filter((r) => r.awaitingClient && r.status !== "ARCHIVED");
  const active = scoped.filter(
    (r) => r.status === "ACTIVE" && !r.awaitingClient
  );
  const drafts = scoped.filter((r) => r.status === "DRAFT");
  const archived = scoped.filter((r) => r.status === "ARCHIVED");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red-500">
            {t("tagline")}
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-white md:text-3xl">
            {projectTitle ?? t("title")}
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/45">
            {t("subtitle")}
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={openDialog}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <Plus size={16} aria-hidden="true" />
            {t("create.cta")}
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-white/50">
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          {t("common.loading")}
        </div>
      ) : failed ? (
        <EmptyState
          icon={Sparkles}
          title={t("errors.loadFailedTitle")}
          description={t("errors.loadFailedBody")}
          action={
            <button
              type="button"
              onClick={load}
              className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10"
            >
              {t("common.retry")}
            </button>
          }
        />
      ) : scoped.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={t("empty.title")}
          description={canCreate ? t("empty.bodyStaff") : t("empty.bodyClient")}
          action={
            canCreate ? (
              <button
                type="button"
                onClick={openDialog}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
              >
                <Plus size={14} aria-hidden="true" />
                {t("create.cta")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-10">
          <Section title={t("sections.awaitingClient")} rooms={awaiting} />
          <Section title={t("sections.active")} rooms={active} />
          <Section title={t("sections.drafts")} rooms={drafts} />

          {archived.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                aria-expanded={showArchived}
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/40 transition-colors hover:text-white/70"
              >
                <Archive size={13} aria-hidden="true" />
                {t("sections.archived")} ({archived.length})
              </button>
              {showArchived && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {archived.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {dialogOpen && (
        <CreateRoomDialog
          open={dialogOpen}
          onClose={closeDialog}
          clients={clients}
          projects={projects}
          people={people}
        />
      )}
    </div>
  );
}

function Section({ title, rooms }: { title: string; rooms: RoomCardData[] }) {
  if (rooms.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
        {title}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
    </section>
  );
}
