import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-format";

type Props = {
  value: string | null | undefined; // ISO "YYYY-MM-DD"
  onChange: (v: string) => void;    // returns "YYYY-MM-DD" or ""
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  fromYear?: number;
  toYear?: number;
};

function parseISO(v?: string | null): Date | undefined {
  if (!v) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? undefined : dt;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select a date",
  disabled,
  id,
  className,
  fromYear = 1970,
  toYear = new Date().getFullYear() + 10,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selected = parseISO(value ?? undefined);

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? formatDate(selected) : placeholder}
          </span>
          <span className="ml-2 flex items-center gap-1">
            {selected && !disabled && (
              <X
                role="button"
                aria-label="Clear date"
                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
              />
            )}
            <CalendarIcon className="h-4 w-4 opacity-60" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={new Date(fromYear, 0)}
          endMonth={new Date(toYear, 11)}
          defaultMonth={selected ?? new Date()}
          selected={selected}
          onSelect={(d) => {
            if (d) {
              onChange(toISO(d));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
