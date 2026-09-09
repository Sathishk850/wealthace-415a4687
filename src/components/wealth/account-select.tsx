// Reusable, account-aware "Held in account" selector.
// Reads the user's configured accounts and offers only the ones compatible
// with the asset type being added (market/broker vs. bank).

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountDialog } from "@/components/wealth/account-dialog";
import { useAccounts, type Account } from "@/lib/wealth-api";

export type AccountKind = "market" | "bank" | "any";

const MARKET_RE = /demat|broker|invest|trading|portfolio|other/i;
const BANK_RE = /bank|saving|current|wallet|cash/i;

/** Accounts compatible with the given asset kind. */
export function compatibleAccounts(accounts: Account[], kind: AccountKind): Account[] {
  const active = accounts.filter((a) => (a.status ?? "active") === "active");
  if (kind === "any") return active;
  const re = kind === "market" ? MARKET_RE : BANK_RE;
  return active.filter((a) => re.test(`${a.account_type} ${a.provider ?? ""} ${a.name}`));
}

/** Stable display + storage label: "Institution • Name". */
export function accountLabel(a: Account) {
  return a.provider ? `${a.provider} • ${a.name}` : a.name;
}

function accountMeta(a: Account) {
  return [a.account_type, a.account_number_masked ? `••••${a.account_number_masked.slice(-4)}` : null]
    .filter(Boolean)
    .join(" · ");
}

export function AccountSelect({
  value,
  onChange,
  kind = "any",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  kind?: AccountKind;
  placeholder?: string;
}) {
  const { data: accounts = [], isLoading } = useAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);
  const options = useMemo(() => compatibleAccounts(accounts, kind), [accounts, kind]);

  // Keep a previously-saved value selectable even when it is not in the list.
  const extra = value && !options.some((a) => accountLabel(a) === value) ? value : null;

  if (!isLoading && options.length === 0 && !extra) {
    return (
      <>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
          <span className="text-sm text-muted-foreground">No accounts yet</span>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1 text-sm font-medium text-mint hover:underline"
          >
            <Plus className="h-3.5 w-3.5" /> Add Account
          </button>
        </div>
        <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} existing={null} />
      </>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder ?? "Select an account"} />
      </SelectTrigger>
      <SelectContent>
        {extra ? <SelectItem value={extra}>{extra}</SelectItem> : null}
        {options.map((a) => {
          const label = accountLabel(a);
          const meta = accountMeta(a);
          return (
            <SelectItem key={a.id} value={label}>
              {label}
              {meta ? <span className="text-muted-foreground"> · {meta}</span> : null}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
