import { cn, formatNumber } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  accent?: "madrid" | "ink";
};

export function StatPill({ label, value, accent = "ink" }: Props) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-ink-50 px-3 py-2 min-w-[80px]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p
        className={cn(
          "font-display text-xl font-bold tabular-nums",
          accent === "madrid" ? "text-madrid-600" : "text-ink-900"
        )}
      >
        {formatNumber(value)}
      </p>
    </div>
  );
}
