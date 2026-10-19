import { useState } from "react";
import { Plus, Pencil, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUpsertCategoryRule, useDeleteCategoryRule, applyRules, type CategoryRule,
} from "@/lib/category-rules-api";
import { keys as txKeys, type Category } from "@/lib/money-api";

type Props = { className?: string; rules: CategoryRule[]; categories: Category[] };

export function CategoryRulesManager({ className, rules, categories }: Props) {
  const upsert = useUpsertCategoryRule();
  const del = useDeleteCategoryRule();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRule | null>(null);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [applyingAll, setApplyingAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  function openNew() {
    setEditing(null); setKeywordsInput(""); setCategoryId(""); setKind("expense"); setOpen(true);
  }
  function openEdit(r: CategoryRule) {
    setEditing(r); setKeywordsInput(r.keywords.join(", ")); setCategoryId(r.category_id); setKind(r.kind); setOpen(true);
  }

  async function save() {
    const keywords = keywordsInput.split(",").map((k) => k.trim()).filter(Boolean);
    if (!keywords.length || !categoryId) { toast.error("Add at least one keyword and pick a category"); return; }
    await upsert.mutateAsync({ id: editing?.id, keywords, category_id: categoryId, kind });
    setOpen(false);
  }

  async function applyAllToExisting() {
    setApplyingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: txns, error } = await supabase
        .from("money_transactions")
        .select("id, merchant, kind, category_id")
        .eq("user_id", user.id)
        .eq("is_transfer", false)
        .is("category_id", null);
      if (error) throw error;
      if (!txns?.length) { toast.success("No uncategorised transactions found"); return; }
      const byCat = new Map<string, string[]>();
      for (const tx of txns) {
        const m = applyRules(tx.merchant, rules, tx.kind as "income" | "expense");
        if (m) byCat.set(m, [...(byCat.get(m) ?? []), tx.id]);
      }
      let updated = 0;
      for (const [cat, ids] of byCat) {
        const { error: uErr } = await supabase
          .from("money_transactions")
          .update({ category_id: cat })
          .in("id", ids)
          .is("category_id", null);
        if (uErr) throw uErr;
        updated += ids.length;
      }
      toast.success(`Applied rules to ${updated} transaction${updated !== 1 ? "s" : ""}`);
      qc.invalidateQueries({ queryKey: txKeys.transactions });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to apply rules");
    } finally {
      setApplyingAll(false);
    }
  }

  const catById = (id: string) => categories.find((c) => c.id === id)?.name ?? "Deleted category";

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Category Rules</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Merchant keywords → auto-category. Applied to imports and new transactions.
          </p>
        </div>
        <div className="flex gap-2">
          {rules.length > 0 && (
            <Button size="sm" variant="outline" onClick={applyAllToExisting} disabled={applyingAll} className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              {applyingAll ? "Applying…" : "Apply to existing"}
            </Button>
          )}
          <Button size="sm" onClick={openNew} className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/20">
            <Plus className="h-3.5 w-3.5" /> Add Rule
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <Zap className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No rules yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a rule like "airtel" → Utilities so every Airtel payment is categorised automatically.
            Type multiple keywords separated by commas: "hotstar, sonyliv, zee5".
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex flex-wrap gap-1">
                  {r.keywords.map((kw) => (
                    <span key={kw} className="max-w-full truncate rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground">
                      {kw}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  → <span className="font-medium text-foreground">{catById(r.category_id)}</span>
                  <span className="ml-1.5 rounded-full bg-muted/30 px-1.5 py-0.5 text-[10px] capitalize">{r.kind}</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(r)} aria-label="Edit rule">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r.id)} aria-label="Delete rule">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Rule" : "Add Category Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Keywords (comma-separated)</Label>
              <Input value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} placeholder="e.g. airtel, airtel payments" autoFocus />
              <p className="text-[11px] text-muted-foreground">
                Any transaction whose merchant contains one of these words (case-insensitive) will get this category.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Transaction type</Label>
              <Select value={kind} onValueChange={(v) => { setKind(v as "income" | "expense"); setCategoryId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Assign to category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                <SelectContent>
                  {categories.filter((c) => c.kind === kind).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void save()} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rule?</AlertDialogTitle>
            <AlertDialogDescription>Future transactions won't be auto-categorised by this rule. Existing transactions are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteTarget) del.mutate(deleteTarget); setDeleteTarget(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
