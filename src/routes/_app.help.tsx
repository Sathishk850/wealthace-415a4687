import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LifeBuoy, Bug, FileText, ShieldCheck, MessageSquare, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_app/help")({
  head: () => ({
    meta: [
      { title: "Help & Support · FinVista" },
      { name: "description", content: "FAQs, user guide, and contact support." },
    ],
  }),
  component: HelpPage,
});

const FAQ = [
  { q: "How is my data secured?", a: "All data is encrypted in transit and at rest. Row-level security ensures only you can read or modify your records." },
  { q: "Can I import data from a spreadsheet?", a: "Yes. Every Wealth module supports CSV, XLSX, and JSON import via the Import/Export menu." },
  { q: "How do scheduled reports work?", a: "Set a frequency in Tools → Reports. Generated reports appear in your Report Center and trigger an in-app notification." },
  { q: "How do I change my password?", a: "Go to Settings → Security → Change Password (coming soon in this release)." },
];

function HelpPage() {
  return (
    <>
      <PageHeader title="Help & Support" description="We're here to help you get the most out of FinVista." />
      <div className="grid gap-4 md:grid-cols-2">
        <LinkCard icon={MessageSquare} title="Contact Support" desc="Get a response within 24 hours" to="/feedback" />
        <LinkCard icon={Bug} title="Report an Issue" desc="Found a bug? Let us know" to="/feedback" />
        <LinkCard icon={BookOpen} title="User Guide" desc="Walkthroughs for every module" href="https://docs.lovable.dev" />
        <LinkCard icon={ShieldCheck} title="Privacy Policy" desc="How we handle your data" href="#" />
        <LinkCard icon={FileText} title="Terms & Conditions" desc="Service agreement" href="#" />
        <LinkCard icon={LifeBuoy} title="Community" desc="Tips and tricks from other users" href="https://discord.gg/lovable" />
      </div>

      <Card className="glass-card mt-4 border-[var(--border)] p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Frequently Asked Questions</h3>
        <Accordion type="single" collapsible className="w-full">
          {FAQ.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`}>
              <AccordionTrigger className="text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </>
  );
}

function LinkCard({
  icon: Icon, title, desc, to, href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; desc: string; to?: string; href?: string;
}) {
  const inner = (
    <Card className="glass-card border-[var(--border)] p-4 transition hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-border bg-surface/40 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
    </Card>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return <a href={href} target="_blank" rel="noreferrer">{inner}</a>;
}