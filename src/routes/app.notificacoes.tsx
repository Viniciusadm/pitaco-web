import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CalendarClock, CheckCheck, Flag, Trophy, UserPlus, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDateBR } from "@/lib/datetime";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/api/notifications";
import { useOnline } from "@/hooks/use-online";
import type { Notification } from "@/api/types";

export const Route = createFileRoute("/app/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações - Pitaco" }] }),
  component: NotificationsPage,
});

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  new_match: CalendarClock,
  match_result: Flag,
  ranking_update: Trophy,
  member_joined: UserPlus,
  prediction_reminder: Clock,
};

function NotificationsPage() {
  const navigate = useNavigate();
  const online = useOnline();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = notifications.data ?? [];
  const hasUnread = items.some((n) => n.read_at === null);

  const onMarkAll = () => {
    if (!online) {
      toast.error("Sem conexão. Conecte-se para realizar esta ação.");
      return;
    }
    markAll.mutate(undefined, {
      onError: (error) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar"),
    });
  };

  const onOpen = (item: Notification) => {
    if (item.read_at === null && online) {
      markRead.mutate(item.id);
    }
    if (item.related_match_id) {
      navigate({ to: "/app/jogos" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold">Notificações</h1>
        <button
          onClick={onMarkAll}
          disabled={!hasUnread || markAll.isPending || !online}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors",
            hasUnread && online
              ? "text-foreground hover:bg-surface"
              : "cursor-not-allowed text-muted-foreground opacity-60",
          )}
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Marcar todas
        </button>
      </div>

      {notifications.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : notifications.isError ? (
        <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Não foi possível carregar suas notificações.
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Você não tem notificações por aqui ainda.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.type] ?? Bell;
            const unread = item.read_at === null;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onOpen(item)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors",
                    unread
                      ? "border-primary/30 bg-primary/5 hover:bg-primary/10"
                      : "border-border bg-card hover:bg-surface",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full",
                      unread ? "bg-primary/15 text-primary" : "bg-surface text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "truncate text-sm",
                          unread ? "font-semibold text-foreground" : "font-medium text-foreground",
                        )}
                      >
                        {item.title}
                      </p>
                      {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {relativeTime(item.created_at)}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function toDate(iso: string): Date {
  const normalized = iso.includes("T") || iso.endsWith("Z") ? iso : `${iso.replace(" ", "T")}Z`;
  return new Date(normalized);
}

function relativeTime(iso: string): string {
  const then = toDate(iso).getTime();
  if (Number.isNaN(then)) return "";
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `há ${days} d`;
  return formatDateBR(toDate(iso).toISOString(), { day: "2-digit", month: "short" });
}
