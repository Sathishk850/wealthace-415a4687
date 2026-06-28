import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useDeleteNotification,
  type Notification,
} from "@/lib/notifications-api";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function categoryColor(c: Notification["category"]) {
  switch (c) {
    case "reminder": return "border-amber-400/40 text-amber-400";
    case "report": return "border-mint/40 text-mint";
    case "insight": return "border-violet-400/40 text-violet-400";
    case "system": return "border-sky-400/40 text-sky-400";
    default: return "border-border text-muted-foreground";
  }
}

export function NotificationBell() {
  const { data: count = 0 } = useUnreadCount();
  const { data: items = [] } = useNotifications(20);
  const markRead = useMarkRead();
  const del = useDeleteNotification();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-mint px-1 text-[10px] font-bold text-mint-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {count > 0 && <Badge variant="secondary" className="text-[10px]">{count} new</Badge>}
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              disabled={count === 0}
              onClick={() => markRead.mutate("all")}
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    "group px-3 py-2.5 transition",
                    !n.read_at && "bg-mint/[0.04]",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className={cn("shrink-0 text-[10px] capitalize", categoryColor(n.category))}>
                      {n.category}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      {n.body && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                      )}
                      {n.link && (
                        <Link
                          to={n.link}
                          className="mt-1 inline-block text-[11px] font-medium text-mint hover:underline"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-1 opacity-0 transition group-hover:opacity-100">
                      {!n.read_at && (
                        <button
                          aria-label="Mark read"
                          onClick={() => markRead.mutate([n.id])}
                          className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-surface hover:text-foreground"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        aria-label="Delete"
                        onClick={() => del.mutate(n.id)}
                        className="grid h-5 w-5 place-items-center rounded text-muted-foreground hover:bg-surface hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-2">
          <Link
            to="/notifications"
            className="block rounded-md py-1.5 text-center text-xs font-medium text-mint hover:bg-mint/10"
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}