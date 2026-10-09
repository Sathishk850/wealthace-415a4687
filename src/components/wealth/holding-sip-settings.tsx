import { useEffect, useState } from "react";
import { Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AmountInput } from "@/components/ui/amount-input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Asset, type Investment, useSaveHoldingSip } from "@/lib/wealth-api";
import { readAssetSip, type SipSettings } from "@/lib/holding-sip";
import { toast } from "sonner";

type Holding = { asset: Asset; investment?: never } | { investment: Investment; asset?: never };

export function HoldingSipButton(props: Holding) {
  const [open, setOpen] = useState(false);
  const enabled = props.asset ? readAssetSip(props.asset.notes).enabled : props.investment.is_sip;
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
      <Repeat2 className="mr-2 h-4 w-4" />{enabled ? "Manage SIP" : "Set up SIP"}
    </Button>
    <HoldingSipDialog {...props} open={open} onOpenChange={setOpen} />
  </>;
}

export function HoldingSipDialog({ open, onOpenChange, ...holding }: Holding & {
  open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const save = useSaveHoldingSip();
  const [settings, setSettings] = useState<SipSettings>({ enabled: false, amount: 0, frequency: "monthly", startDate: "", active: true });
  const row = holding.asset ?? holding.investment;
  useEffect(() => {
    if (!open) return;
    const inv = holding.investment;
    const initial = inv ? {
      enabled: inv.is_sip, amount: inv.sip_amount ?? 0, frequency: inv.sip_frequency ?? "monthly",
      startDate: inv.sip_start_date ?? "", active: inv.sip_active ?? true,
    } : readAssetSip(holding.asset?.notes);
    setSettings({ ...initial, startDate: initial.startDate || new Date().toLocaleDateString("en-CA"), active: initial.enabled ? initial.active : true });
  }, [open, row]);
  const submit = async () => {
    if (settings.enabled && (!Number.isFinite(settings.amount) || settings.amount <= 0)) return toast.error("Enter a positive SIP amount");
    if (settings.enabled && !settings.startDate) return toast.error("Choose a SIP start date");
    try {
      await save.mutateAsync({ id: row.id, source: holding.asset ? "asset" : "investment", settings });
      onOpenChange(false);
    } catch { /* mutation shows error */ }
  };
  return <Dialog open={open} onOpenChange={(v) => { if (!save.isPending) onOpenChange(v); }}>
    <DialogContent className="max-w-md">
      <DialogHeader><DialogTitle>SIP · {row.name}</DialogTitle></DialogHeader>
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Label htmlFor={`sip-enabled-${row.id}`}>SIP tracking</Label>
        <Switch id={`sip-enabled-${row.id}`} checked={settings.enabled} disabled={save.isPending}
          onCheckedChange={(enabled) => setSettings((s) => ({ ...s, enabled }))} />
      </div>
      {settings.enabled && <div className="space-y-4">
        <div><Label className="mb-2 block">Amount ({holding.investment?.currency ?? "INR"})</Label>
          <AmountInput value={settings.amount ? String(settings.amount) : ""} onChange={(v) => setSettings((s) => ({ ...s, amount: Number(v) }))} /></div>
        <div><Label className="mb-2 block">Frequency</Label>
          <Select value={settings.frequency} onValueChange={(frequency) => setSettings((s) => ({ ...s, frequency }))}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
              {["weekly", "monthly", "quarterly", "half-yearly", "yearly"].map((f) => <SelectItem key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</SelectItem>)}
            </SelectContent></Select></div>
        <div><Label className="mb-2 block">Start date</Label><DatePicker value={settings.startDate} onChange={(v) => setSettings((s) => ({ ...s, startDate: v || "" }))} /></div>
        <div className="flex items-center justify-between gap-4"><Label htmlFor={`sip-active-${row.id}`}>Active</Label>
          <Switch id={`sip-active-${row.id}`} checked={settings.active} onCheckedChange={(active) => setSettings((s) => ({ ...s, active }))} /></div>
      </div>}
      <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>Cancel</Button>
        <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save SIP"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}