import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { InvestmentInput } from '@/lib/wealth-api';
import { amountIn } from '@/lib/wealth-api';
import { depositKind, holdingDepositValue, maturityDays } from '@/lib/deposit-value';

export function DepositFields({ value, onChange, dates = true, selectKind = true }: {
  value: InvestmentInput; onChange: (patch: Partial<InvestmentInput>) => void; dates?: boolean; selectKind?: boolean;
}) {
  const kind = depositKind(value.category, value.sub_category, value.deposit_kind);
  if (!kind) return null;
  const preview = holdingDepositValue(value);
  const frequency = value.compounding_frequency || 'quarterly';
  return <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
    {selectKind && <div className="grid gap-1.5"><Label>Deposit type</Label>
      <Select value={kind} onValueChange={v => onChange({ deposit_kind: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="fd">Fixed Deposit</SelectItem><SelectItem value="rd">Recurring Deposit</SelectItem><SelectItem value="bond">Bond</SelectItem>
        </SelectContent>
      </Select>
    </div>}
    <div className="grid gap-1.5"><Label htmlFor="deposit-rate">Interest rate %</Label>
      <Input id="deposit-rate" type="number" min={0} step="0.01" value={value.interest_rate ?? ''}
        onChange={e => onChange({ interest_rate: e.target.value === '' ? null : Number(e.target.value), deposit_kind: kind })} />
    </div>
    <div className="grid gap-1.5"><Label>Compounding frequency</Label>
      <Select value={frequency} onValueChange={v => onChange({ compounding_frequency: v })}>
        <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem>
          <SelectItem value="half_yearly">Half-yearly</SelectItem><SelectItem value="yearly">Yearly</SelectItem>
          <SelectItem value="simple">At maturity / Simple interest</SelectItem>
        </SelectContent>
      </Select>
    </div>
    {dates && <>
      <div className="grid gap-1.5"><Label htmlFor="deposit-start">Start date</Label><Input id="deposit-start" type="date" value={value.purchase_date ?? ''} onChange={e => onChange({ purchase_date: e.target.value || null })} /></div>
      <div className="grid gap-1.5"><Label htmlFor="deposit-maturity">Maturity date</Label><Input id="deposit-maturity" type="date" min={value.purchase_date || undefined} value={value.maturity_date ?? ''} onChange={e => onChange({ maturity_date: e.target.value || null })} /></div>
    </>}
    {kind === 'rd' && <>
      <div className="grid gap-1.5"><Label htmlFor="deposit-installment">Monthly instalment</Label><Input id="deposit-installment" type="number" min={0} step="0.01" value={value.rd_installment_amount ?? ''} onChange={e => onChange({ rd_installment_amount: e.target.value === '' ? null : Number(e.target.value) })} /></div>
      <div className="grid gap-1.5"><Label htmlFor="deposit-day">Instalment day</Label><Input id="deposit-day" type="number" min={1} max={31} value={value.rd_installment_day ?? (value.purchase_date ? Number(value.purchase_date.slice(8,10)) : 1)} onChange={e => onChange({ rd_installment_day: e.target.value === '' ? null : Number(e.target.value) })} /></div>
    </>}
    {preview && <div className="text-sm tabular-nums text-primary sm:col-span-2">
      Value today {amountIn(preview.value, value.currency)} · Value at maturity {amountIn(preview.maturityValue, value.currency)}
      {kind === 'rd' && <div className="mt-1 text-xs text-muted-foreground">Instalments paid {preview.installmentsPaid} of {preview.totalInstallments}</div>}
    </div>}
  </div>;
}
export function MaturityChip({ date }: { date?: string | null }) {
  const days = maturityDays(date);
  if (days == null || days > 30) return null;
  return <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
    {days <= 0 ? 'Matured' : `Matures in ${days}d`}
  </span>;
}