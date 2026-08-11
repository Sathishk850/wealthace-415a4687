import { createFileRoute } from "@tanstack/react-router";
import { BRAND, CONCEPTS, Lockup } from "@/components/brand/concepts";

export const Route = createFileRoute("/brand")({
  head: () => ({
    meta: [
      { title: "Wealth Ace Logo Concepts — Brand Exploration" },
      {
        name: "description",
        content:
          "Four premium logo concepts for Wealth Ace — Track, Nurture, Prosper. Marks, lockups, favicon tests and colour specs.",
      },
      { property: "og:title", content: "Wealth Ace Logo Concepts — Brand Exploration" },
      {
        property: "og:description",
        content: "Four premium logo directions for Wealth Ace with lockups, favicon tests and colour specs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrandPage,
});

const SWATCHES = [
  { name: "Primary Teal", hex: BRAND.teal },
  { name: "Gold / Amber", hex: BRAND.gold },
  { name: "Deep Navy", hex: BRAND.navy },
  { name: "White", hex: BRAND.white },
];

function BrandPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-14 text-foreground sm:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-mint">
          Phase 1 · Concept exploration
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Wealth Ace logo directions
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Four original marks, each drawn as vector on a 64-unit grid so they hold from a 16px
          browser tab to a printed report cover. Pick one and I&apos;ll refine it, then roll it
          through the app, favicon, PWA icons and report headers.
        </p>

        <div className="mt-14 space-y-14">
          {CONCEPTS.map((c, i) => (
            <section key={c.id} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
              <header className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  <span className="mr-3 text-muted-foreground">0{i + 1}</span>
                  {c.name}
                </h2>
                <p className="max-w-md text-xs text-muted-foreground">{c.idea}</p>
              </header>

              {/* Dark, light and gradient mock backgrounds */}
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div
                  className="flex items-center justify-center rounded-2xl p-7"
                  style={{ background: BRAND.navy, color: BRAND.white }}
                >
                  <Lockup Mark={c.Mark} />
                </div>
                <div className="flex items-center justify-center rounded-2xl border border-border bg-white p-7 text-[#0F1419]">
                  <Lockup Mark={c.Mark} />
                </div>
                <div
                  className="flex items-center justify-center rounded-2xl p-7 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.navy} 0%, #10403A 60%, ${BRAND.teal} 140%)`,
                  }}
                >
                  <Lockup Mark={c.Mark} tone="reverse" />
                </div>
              </div>

              {/* Vertical lockup, monochrome, favicon sizes */}
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div
                  className="flex items-center justify-center rounded-2xl p-7"
                  style={{ background: BRAND.navy, color: BRAND.white }}
                >
                  <Lockup Mark={c.Mark} vertical />
                </div>
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-white p-7 text-[#0F1419]">
                  <Lockup Mark={c.Mark} tone="ink" size="sm" />
                  <span className="text-[9px] uppercase tracking-[0.3em] opacity-50">
                    Monochrome ink
                  </span>
                </div>
                <div
                  className="flex flex-col items-center justify-center gap-4 rounded-2xl p-7"
                  style={{ background: BRAND.navy }}
                >
                  <div className="flex items-end gap-4">
                    <c.Mark className="h-4 w-4" />
                    <c.Mark className="h-8 w-8" />
                    <c.Mark className="h-12 w-12" />
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.3em] text-white/50">
                    16 · 32 · 48 px
                  </span>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-16">
          <h2 className="font-display text-xl font-semibold tracking-tight">Palette</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SWATCHES.map((s) => (
              <div key={s.hex} className="overflow-hidden rounded-2xl border border-border">
                <div className="h-20" style={{ background: s.hex }} />
                <div className="bg-card p-3">
                  <div className="text-xs font-semibold">{s.name}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{s.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="mt-12 text-sm text-muted-foreground">
          Tell me which number to take forward (or which parts to blend) and I&apos;ll produce the
          final lockups, SVG/PNG exports, favicon set and the brand guidelines sheet.
        </p>
      </div>
    </main>
  );
}
