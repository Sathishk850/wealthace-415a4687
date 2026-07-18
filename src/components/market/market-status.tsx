import { useEffect, useState } from "react";
import { Circle } from "lucide-react";
import { getMarketStatus } from "@/lib/market/calendar";

type Props = { exchange?: string; lastUpdated?: string | null; source?: string | null };

export function MarketStatus({ exchange = "NSE", lastUpdated, source }: Props) {
  const [status, setStatus] = useState(() => getMarketStatus(exchange));
  useEffect(() => {
    const t = setInterval(() => setStatus(getMarketStatus(exchange)), 30_000);
    return () => clearInterval(t);
  }, [exchange]);

  const tone = status.is_open ? "text-emerald-500" : "text-rose-500";
  const label = status.is_open ? "Market Open" : "Market Closed";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-[11px] font-medium">
      <Circle className={`h-2 w-2 fill-current ${tone}`} strokeWidth={0} />
      <span>{label}</span>
      {lastUpdated ? (
        <span className="text-muted-foreground">
          · {new Date(lastUpdated).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        </span>
      ) : null}
      {source ? <span className="text-muted-foreground">· {source}</span> : null}
    </div>
  );
}
