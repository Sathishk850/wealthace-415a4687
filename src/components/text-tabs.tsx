import { cn } from "@/lib/utils";
import React from "react";

export type TextTabItem<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  items: ReadonlyArray<TextTabItem<T> | T>;
  value: T;
  onChange: (v: T) => void;
  className?: string;
};

/**
 * Application-wide text-only tab navigation.
 * - Active: accent #21DBD2 with 2px underline
 * - Inactive: muted, hover -> foreground (200ms)
 * - Items separated by subtle vertical dividers (border color, low opacity)
 * - Equal 24-28px spacing
 */
export function TextTabs<T extends string>({ items, value, onChange, className }: Props<T>) {
  const normalized: TextTabItem<T>[] = items.map((it) =>
    typeof it === "string" ? ({ value: it as T, label: it as string }) : it,
  );
  return (
    <div
      role="tablist"
      className={cn(
        "flex flex-wrap items-center border-b border-border/60",
        className,
      )}
    >
      {normalized.map((t, i) => {
        const active = t.value === value;
        return (
          <React.Fragment key={t.value}>
            {i > 0 && (
              <span
                aria-hidden
                className="mx-3 h-4 w-px bg-border/50 sm:mx-3.5"
              />
            )}
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cn(
                "relative -mb-px bg-transparent px-0 py-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none",
                active
                  ? "text-[#21DBD2]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "pointer-events-none absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[#21DBD2] transition-opacity duration-200",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}