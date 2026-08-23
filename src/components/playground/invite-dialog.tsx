"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Invite people to a room, and change what they can do in it.
 *
 * The role set here is ROOM-scoped and is only ever a request: the server clamps
 * every grant to the invitee's global-role ceiling, so inviting a client as an
 * editor is a harmless mistake rather than a privilege escalation — they resolve
 * to approver on every request regardless of what this dialog stored.
 *
 * That is why the picker can afford to be simple. It does not need to reason
 * about who the person is; `resolveRoomActor` already does.
 */

type Member = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    username?: string;
    image?: string | null;
    role?: string;
    jobTitle?: string | null;
  };
};

type Invitable = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  role: string;
  jobTitle: string | null;
};

const ROLES = ["OWNER", "EDITOR", "APPROVER", "VIEWER"] as const;

export function InviteDialog({
  roomId,
  open,
  onClose,
  onChanged,
  currentUserId,
}: {
  roomId: string;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  currentUserId: string;
}) {
  const t = useTranslations("playground");
  const { toast } = useToast();

  const [members, setMembers] = React.useState<Member[]>([]);
  const [invitable, setInvitable] = React.useState<Invitable[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const panelRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/members`);
      if (!res.ok) return;
      const data = await res.json();
      setMembers(data.members ?? []);
      setInvitable(data.invitable ?? []);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  React.useEffect(() => {
    if (!open) return;
    void load();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, load, onClose]);

  if (!open) return null;

  const memberIds = new Set(members.map((m) => m.user.id));
  const candidates = invitable
    .filter((person) => !memberIds.has(person.id))
    .filter((person) => {
      if (!query.trim()) return true;
      const needle = query.toLowerCase();
      return (
        (person.name ?? "").toLowerCase().includes(needle) ||
        person.username.toLowerCase().includes(needle)
      );
    });

  const invite = async (userId: string, role: string) => {
    setBusy(userId);
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({ variant: "error", title: data.error ?? t("invite.failed") });
        return;
      }
      await load();
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (userId: string) => {
    setBusy(userId);
    try {
      const res = await fetch(
        `/api/playground/rooms/${roomId}/members?userId=${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // The server refuses to strand a room with no owner; that message is
        // more useful than anything this layer could invent.
        toast({ variant: "warning", title: data.error ?? t("invite.failed") });
        return;
      }
      await load();
      onChanged();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("invite.title")}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/15 bg-neutral-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <h2 className="text-base font-bold text-white">{t("invite.title")}</h2>
            <p className="mt-0.5 text-xs text-white/45">{t("invite.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {loading ? (
          <div className="grid flex-1 place-items-center p-8">
            <Loader2 size={18} className="animate-spin text-white/30" aria-hidden="true" />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="p-4">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                {t("invite.inRoom")}
              </h3>
              <ul className="space-y-1">
                {members.map((member) => (
                  <li
                    key={member.user.id}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                  >
                    <Avatar
                      name={member.user.name}
                      image={member.user.image}
                      size={28}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-white">
                        {member.user.name ?? t("common.unnamed")}
                      </span>
                      <span className="block text-[10px] text-white/35">
                        {t(`roomRoles.${member.role}`)}
                      </span>
                    </span>

                    <label className="sr-only" htmlFor={`role-${member.user.id}`}>
                      {t("invite.roleLabel")}
                    </label>
                    <select
                      id={`role-${member.user.id}`}
                      value={member.role}
                      disabled={busy === member.user.id}
                      onChange={(e) => void invite(member.user.id, e.target.value)}
                      className="shrink-0 rounded-md border border-white/15 bg-white/5 px-1.5 py-1 text-[10px] text-white focus:border-red-500/50 focus:outline-none"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(`roomRoles.${role}`)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => void remove(member.user.id)}
                      disabled={busy === member.user.id}
                      aria-label={t("invite.remove")}
                      title={t("invite.remove")}
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-md text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400",
                        member.user.id === currentUserId && "opacity-40"
                      )}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="border-t border-white/10 p-4">
              <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                {t("invite.addPeople")}
              </h3>
              <label htmlFor="pg-invite-search" className="sr-only">
                {t("invite.search")}
              </label>
              <input
                id="pg-invite-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("invite.search")}
                className="mb-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
              />

              {candidates.length === 0 ? (
                <p className="px-2 py-3 text-[11px] text-white/35">
                  {t("invite.noMatches")}
                </p>
              ) : (
                <ul className="space-y-1">
                  {candidates.slice(0, 30).map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        disabled={busy === person.id}
                        onClick={() =>
                          // A client defaults to APPROVER, staff to EDITOR:
                          // being invited to your own campaign room and being
                          // unable to respond is a support ticket.
                          void invite(
                            person.id,
                            person.role === "CLIENT" ? "APPROVER" : "EDITOR"
                          )
                        }
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-start transition-colors hover:bg-white/5 disabled:opacity-50"
                      >
                        <Avatar name={person.name} image={person.image} size={28} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-white/85">
                            {person.name ?? person.username}
                          </span>
                          <span className="block text-[10px] text-white/35">
                            {person.jobTitle ??
                              (person.role === "CLIENT"
                                ? t("roles.client")
                                : t("roles.team"))}
                          </span>
                        </span>
                        {busy === person.id && (
                          <Loader2
                            size={12}
                            className="animate-spin text-white/40"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
