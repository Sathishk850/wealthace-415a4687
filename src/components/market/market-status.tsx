import { useEffect, useState } from "react";
import { Circle } from "lucide-react";
import { getExchangeSessionLabels, getMarketStatus } from "@/lib/market/calendar";

type Props = { exchange?: string; source?: string | null };

export function MarketStatus({ exchange = "NSE", source }: Props) {
  const [status, setStatus] = useState(() => getMarketStatus(exchange));
  const [session, setSession] = useState(() => getExchangeSessionLabels(exchange));

  useEffect(() => {
    const tick = () => {
      setStatus(getMarketStatus(exchange));
      setSession(getExchangeSessionLabels(exchange));
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [exchange]);

  const tone = status.is_open ? "text-emerald-500" : "text-rose-500";
  const label = status.is_open ? "Market Open" : "Market Closed";
  // When open, surface today's open time; when closed, surface today's close time.
  const time = status.is_open ? session.open : session.close;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium">
      <Circle className={`h-2 w-2 fill-current ${tone}`} strokeWidth={0} />
      <span>{label}</span>
      <span className="text-muted-foreground">· {time}</span>
      {source ? <span className="text-muted-foreground">· {source}</span> : null}
    </div>
  );
}
