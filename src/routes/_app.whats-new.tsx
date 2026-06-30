import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/whats-new")({
  head: () => ({
    meta: [
      { title: "What's New · FinVista" },
      { name: "description", content: "Release notes and upcoming features." },
    ],
  }),
  component: WhatsNew,
});

const VERSION = "1.4.0";

const RELEASES = [
  {
    version: "1.4.0",
    date: "Jun 30, 2026",
    items: [
      "Standardized chart time-range selector across all modules",
      "Profile menu refresh with dedicated My Profile page",
      "Settings reorganized into General, Notifications, Appearance, Security, Data & Backup",
    ],
  },
  {
    version: "1.3.0",
    date: "Jun 20, 2026",
    items: [
      "Wealth module: Accounts and Family management",
      "Investments with XIRR, CAGR, SIP tracker",
      "Insurance with renewal reminders",
    ],
  },
  {
    version: "1.2.0",
    date: "Jun 10, 2026",
    items: ["Report Center with PDF/Excel/CSV exports", "Scheduled reports and notification preferences"],
  },
];

const UPCOMING = [
  "PIN-based quick sign in",
  "Multi-currency support with live FX",
  "Mobile app for iOS and Android",
  "Collaborative family workspaces",
];

function WhatsNew() {
  return (
    <>
      <PageHeader
        title="What's New"
        description={`You're on FinVista v${VERSION}.`}
      />
      <div className="space-y-4">
        <Card className="glass-card border-[var(--border)] p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Release Notes</h3>
          <div className="space-y-5">
            {RELEASES.map((r) => (
              <div key={r.version}>
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/40 text-primary">v{r.version}</Badge>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
                <ul className="ml-5 list-disc space-y-1 text-sm text-foreground/90">
                  {r.items.map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card border-[var(--border)] p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Upcoming Features</h3>
          <ul className="ml-5 list-disc space-y-1 text-sm text-foreground/90">
            {UPCOMING.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </Card>
      </div>
    </>
  );
}