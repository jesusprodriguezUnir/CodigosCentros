import { cn, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: number;
  hint?: string;
  accent?: "madrid" | "ink";
};

export function StatCard({ icon: Icon, label, value, hint, accent = "ink" }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-ink-200 bg-white p-5 shadow-soft transition-shadow hover:shadow-ring">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl font-bold text-ink-900">
            {formatNumber(value)}
          </p>
          {hint ? <p className="mt-1 text-xs text-ink-500">{hint}</p> : null}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            accent === "madrid"
              ? "bg-madrid-50 text-madrid-600"
              : "bg-ink-100 text-ink-700"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform group-hover:scale-x-100",
          accent === "madrid" ? "bg-madrid-600" : "bg-ink-300"
        )}
      />
    </div>
  );
}
