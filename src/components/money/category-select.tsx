import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { keys, PALETTE, type Category, type Kind } from "@/lib/money-api";

/**
 * Category picker with inline "+ New category" creation.
 * Reuses an existing same-name category (case-insensitive) instead of
 * failing on the (user_id, kind, name) unique key.
 */
export function CategorySelect({
  value,
  onChange,
  kind,
  categories,
  placeholder = "Choose category",
  allowNone = true,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  kind: Kind;
  categories: Category[];
  placeholder?: string;
  allowNone?: boolean;
  className?: string;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const list = categories.filter((c) => c.kind === kind);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      // Reuse an existing matching category first.
      const { data: existing, error: lookupErr } = await supabase
        .from("money_categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", kind)
        .ilike("name", trimmed)
        .maybeSingle();
      if (lookupErr) throw lookupErr;
      let id = existing?.id as string | undefined;
      if (!id) {
        const { data, error } = await supabase
          .from("money_categories")
          .insert({
            user_id: user.id,
            name: trimmed,
            kind,
            color: PALETTE[list.length % PALETTE.length],
            icon: "Wallet",
          })
          .select("id")
          .single();
        if (error) {
          if ((error as { code?: string }).code === "23505") {
            const { data: race } = await supabase
              .from("money_categories")
              .select("id")
              .eq("user_id", user.id)
              .eq("kind", kind)
              .ilike("name", trimmed)
              .maybeSingle();
            if (race?.id) id = race.id;
            else throw error;
          } else {
            throw error;
          }
        } else {
          id = data!.id;
        }
      }
      await qc.invalidateQueries({ queryKey: keys.categories });
      onChange(id!);
      setAdding(false);
      setName("");
      toast.success("Category added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add category");
    } finally {
      setBusy(false);
    }
  };

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={kind === "income" ? "New source name" : "New category name"}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); void create(); }
            if (e.key === "Escape") { setAdding(false); setName(""); }
          }}
        />
        <Button type="button" size="icon" variant="outline" disabled={busy || !name.trim()} onClick={() => void create()} aria-label="Add category">
          <Check className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" onClick={() => { setAdding(false); setName(""); }}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select value={value || "none"} onValueChange={(v) => onChange(v === "none" ? "" : v)}>
        <SelectTrigger className={className ?? "flex-1"}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="none">Uncategorized</SelectItem>}
          {list.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" onClick={() => setAdding(true)}>
        <Plus className="h-4 w-4" /> New
      </Button>
    </div>
  );
}
