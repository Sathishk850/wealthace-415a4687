import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePaymentAccounts,
  useDeletePaymentAccount,
  useSetDefaultPaymentAccount,
  useTogglePaymentAccountActive,
  accountTypeLabel,
  type PaymentAccount,
} from "@/lib/payment-accounts-api";
import { PaymentAccountDialog } from "@/components/payment/payment-account-dialog";
import { Pencil, Plus, Star, Trash2, Wallet } from "lucide-react";

export function PaymentAccountsPanel() {
  const { data: accounts = [], isLoading } = usePaymentAccounts();
  const del = useDeletePaymentAccount();
  const setDefault = useSetDefaultPaymentAccount();
  const toggleActive = useTogglePaymentAccountActive();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentAccount | null>(null);
  const [confirmDel, setConfirmDel] = useState<PaymentAccount | null>(null);

  return (
    <Card className="glass-card border-[var(--border)] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Payment Accounts
          </h3>
          <p className="text-xs text-muted-foreground">
            Bank accounts, cards, wallets and UPI apps used to pay bills, EMIs
            and expenses.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          className="gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          Loading…
        </div>
      ) : accounts.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border p-8 text-center">
          <Wallet className="mb-2 h-6 w-6 text-mint" />
          <div className="text-sm font-medium text-foreground">
            No payment accounts yet
          </div>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Add your bank accounts, cards, wallets and UPI apps to record where
            each payment came from.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {accounts.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-3 px-3 py-3"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
                style={{ background: a.color || "#2b3441" }}
              >
                <Wallet className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                   <span className="truncate text-sm font-medium text-foreground">
                     {formatAccountLabel({
                       name: a.name,
                       institution: a.institution,
                       last4: null,
                     })}
                   </span>
                   {a.last4 && (
                     <span className="text-[11px] text-muted-foreground">
                       •••• {a.last4}
                     </span>
                   )}
                  {a.is_default && (
                    <Badge
                      variant="outline"
                      className="border-mint/40 text-[10px] text-mint"
                    >
                      Default
                    </Badge>
                  )}
                  {!a.is_active && (
                    <Badge variant="outline" className="text-[10px]">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {accountTypeLabel(a.account_type)}
                  {a.institution ? ` · ${a.institution}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    Active
                  </span>
                  <Switch
                    checked={a.is_active}
                    onCheckedChange={(v) =>
                      toggleActive.mutate({ id: a.id, is_active: v })
                    }
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 px-2 text-xs"
                  disabled={a.is_default || !a.is_active}
                  onClick={() => setDefault.mutate(a.id)}
                >
                  <Star className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Default</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  onClick={() => setEditing(a)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-destructive"
                  onClick={() => setConfirmDel(a)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PaymentAccountDialog open={addOpen} onOpenChange={setAddOpen} />
      <PaymentAccountDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        existing={editing}
      />

      <AlertDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment account?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.name}. Transactions that referenced this account
              will keep their record but the account link will be cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDel) del.mutate(confirmDel.id);
                setConfirmDel(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}