import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SHORTCUTS, SHORTCUT_GROUPS, type Shortcut } from "@/lib/shortcuts";

export function navigateToShortcut(
  navigate: ReturnType<typeof useNavigate>,
  s: Shortcut,
) {
  const [to, hash] = s.path.split("#");
  navigate({ to, ...(hash ? { hash } : {}) } as never);
}

/**
 * Global quick navigation. Opens with Cmd/Ctrl+K (or the header button) and
 * jumps to any of the app's deep-linkable destinations.
 */
export function QuickNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const grouped = useMemo(
    () =>
      SHORTCUT_GROUPS.map((g) => ({
        group: g,
        items: SHORTCUTS.filter((s) => s.group === g),
      })).filter((g) => g.items.length > 0),
    [],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick navigation"
        title="Quick navigation (Ctrl/Cmd + K)"
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-[rgba(33,219,210,0.12)] hover:text-[#21DBD2]"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to… (e.g. holdings, budgets, SIP, reports)" />
        <CommandList>
          <CommandEmpty>No matching page.</CommandEmpty>
          {grouped.map(({ group, items }) => (
            <CommandGroup key={group} heading={group}>
              {items.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.label} ${s.group} ${s.keywords ?? ""}`}
                  onSelect={() => {
                    setOpen(false);
                    navigateToShortcut(navigate, s);
                  }}
                >
                  {s.label}
                  <span className="ml-auto text-[10px] text-muted-foreground">{s.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
