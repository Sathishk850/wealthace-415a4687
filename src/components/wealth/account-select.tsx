// Reusable, account-aware "Held in account" selector.
// Reads the user's configured accounts and offers only the ones compatible
// with the asset type being added (market/broker vs. bank).

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountDialog } from "@/components/wealth/account-dialog";
import {
  BANK_ACCOUNT_TYPES,
  MARKET_ACCOUNT_TYPES,
  normalizeAccountType,
  useAccounts,
  type Account,
} from "@/lib/wealth-api";

export type AccountKind = "market" | "bank" | "any";

/** Accounts compatible with the given asset kind. */
export function compatibleAccounts(accounts: Account[], kind: AccountKind): Account[] {
  const active = accounts.filter((a) => (a.status ?? "active") === "active");
  if (kind === "any") return active;
  const allowed = kind === "market" ? MARKET_ACCOUNT_TYPES : BANK_ACCOUNT_TYPES;
  return active.filter((a) =>
    (allowed as string[]).includes(normalizeAccountType(a.account_type)),
  );
}

/** Stable display + storage label: "Institution • Name". */
export function accountLabel(a: Pick<Account, "provider" | "name">) {
  return a.provider ? `${a.provider} • ${a.name}` : a.name;
}

function accountMeta(a: Account) {
  return [
    normalizeAccountType(a.account_type),
    a.account_number_masked ? `••••${a.account_number_masked.slice(-4)}` : null,
  ]
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

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger aria-label="Held in account" className="w-full [&>span]:truncate" disabled={isLoading || (options.length === 0 && !extra)}>
              <SelectValue placeholder={isLoading ? "Loading accounts…" : options.length === 0 && !extra ? "No accounts yet" : placeholder ?? "Select an account"} />
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
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" aria-label="Add account" title="Add account" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <AccountDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        existing={null}
        defaultType={kind === "market" ? "Broker" : "Bank Account"}
        onSaved={(account) => onChange(accountLabel(account))}
      />
    </>
  );
}
