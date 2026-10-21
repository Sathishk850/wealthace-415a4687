import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccountDialog } from './account-dialog';
import { useAccounts, inrCompact } from '@/lib/wealth-api';
import { isRecurringAsset } from '@/lib/loan-given';

export function AssetFundingSelect({ value, onChange, category, amount, credit = false }: {
  value: string | null; onChange: (value: string | null) => void; category: string; amount: number; credit?: boolean;
}) {
  const { data: accounts = [], isError } = useAccounts();
  const [adding, setAdding] = useState(false);
  if (!credit && isRecurringAsset(category)) return null;
  const eligible = accounts.filter(a => a.status === 'active' && a.currency === 'INR' && (credit || a.account_type !== 'Credit Card' || category === 'Loan Given'));
  const label = credit ? 'Credited to account' : category === 'Loan Given' ? 'Lent from account' : 'Paid from account';
  return <div className="grid gap-1.5">
    <Label className="text-xs text-muted-foreground">{label} (optional)</Label>
    <div className="flex gap-2">
      <Select value={value ?? 'none'} onValueChange={v => onChange(v === 'none' ? null : v)}>
        <SelectTrigger aria-label={label} className="min-w-0 flex-1"><SelectValue placeholder="No account" /></SelectTrigger>
        <SelectContent><SelectItem value="none">No account</SelectItem>{eligible.map(a => <SelectItem key={a.id} value={a.id}>{a.name} · {inrCompact(a.balance)}</SelectItem>)}</SelectContent>
      </Select>
      <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}><Plus className="mr-1 h-4 w-4" />Add</Button>
    </div>
    {isError && <p className="text-xs text-destructive">Accounts could not be loaded.</p>}
    {value && amount > 0 && <p className="text-[11px] text-muted-foreground">{accounts.find(a => a.id === value)?.name} balance will {credit ? 'increase' : 'decrease'} by {inrCompact(amount)}.</p>}
    <AccountDialog open={adding} onOpenChange={setAdding} onSaved={account => onChange(account.id)} />
  </div>;
}