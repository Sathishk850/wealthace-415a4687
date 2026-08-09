import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TextTabs } from "@/components/text-tabs";
import { CheckCheck, Trash2, Bell, FileText, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { formatDateTime } from "@/lib/date-format";
import {
  useNotifications,
  useMarkRead,
  useDeleteNotification,
  useDeliveryLog,
  type Notification,
} from "@/lib/notifications-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Wealth Ace" },
      { name: "description", content: "All in-app notifications and delivery history." },
    ],
  }),
  component: NotificationsPage,
});

const ICONS = {
  reminder: Bell,
  report: FileText,
  insight: Sparkles,
  system: SettingsIcon,
  general: Bell,
};

function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread" | "reminder" | "report" | "insight" | "delivery">("all");
  const [search, setSearch] = useState("");
  const items = useNotifications(200);
  const log = useDeliveryLog(200);
  const markRead = useMarkRead();
  const del = useDeleteNotification();

  const filtered = useMemo(() => {
    let list = items.data ?? [];
    if (tab === "unread") list = list.filter((n) => !n.read_at);
    else if (tab === "reminder" || tab === "report" || tab === "insight") {
      list = list.filter((n) => n.category === tab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || (n.body ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [items.data, tab, search]);

  return (
    <>
      <PageHeader title="Notifications" description="All in-app notifications and delivery history." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <TextTabs
          items={[
            { value: "all", label: "All" },
            { value: "unread", label: "Unread" },
            { value: "reminder", label: "Reminders" },
            { value: "report", label: "Reports" },
            { value: "insight", label: "Insights" },
            { value: "delivery", label: "Delivery History" },
          ]}
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
        />
        <div className="flex gap-2">
          <Input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-48"
          />
          {tab !== "delivery" && (
            <Button variant="ghost" size="sm" onClick={() => markRead.mutate("all")}>
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      {tab === "delivery" ? (
        <Card className="glass-card border-[var(--border)] p-0 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-surface/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Channel</th>
                <th className="px-3 py-2 text-left">Template</th>
                <th className="px-3 py-2 text-left">Recipient</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {(log.data ?? []).length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-xs text-muted-foreground">No deliveries yet.</td></tr>
              ) : (
                (log.data ?? []).map((d) => (
                  <tr key={d.id} className="border-b border-border/60">
                    <td className="px-3 py-2 capitalize">{d.channel.replace("_", "-")}</td>
                    <td className="px-3 py-2">{d.template}</td>
                    <td className="px-3 py-2 text-muted-foreground">{d.recipient ?? "—"}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={d.status} />
                      {d.last_error && (
                        <span className="ml-2 text-[11px] text-destructive">{d.last_error}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(d.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </Card>
      ) : (
        <Card className="glass-card border-[var(--border)] p-0 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-3 py-12 text-center text-sm text-muted-foreground">
              Nothing here yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((n) => <NotifRow key={n.id} n={n} onRead={() => markRead.mutate([n.id])} onDelete={() => del.mutate(n.id)} />)}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}

function NotifRow({ n, onRead, onDelete }: { n: Notification; onRead: () => void; onDelete: () => void }) {
  const Icon = ICONS[n.category] ?? Bell;
  return (
    <li className={cn("flex items-start gap-3 px-4 py-3", !n.read_at && "bg-mint/[0.04]")}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface/60 text-mint">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{n.title}</p>
          <Badge variant="outline" className="text-[10px] capitalize">{n.category}</Badge>
          {n.priority !== "normal" && (
            <Badge variant="outline" className="text-[10px] capitalize">{n.priority}</Badge>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground">
            {formatDateTime(n.created_at)}
          </span>
        </div>
        {n.body && <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>}
        {n.link && (
          <Link to={n.link} className="mt-1 inline-block text-[11px] font-medium text-mint hover:underline">
            View →
          </Link>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        {!n.read_at && (
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={onRead}>
            Mark read
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "sent" ? "border-mint/40 text-mint" :
    status === "failed" ? "border-destructive/40 text-destructive" :
    status === "suppressed" ? "border-muted text-muted-foreground" :
    "border-amber-400/40 text-amber-400";
  return <Badge variant="outline" className={cn("capitalize", color)}>{status}</Badge>;
}