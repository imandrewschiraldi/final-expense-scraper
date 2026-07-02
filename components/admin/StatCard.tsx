import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "copper" | "teal" | "green" | "gold";
}) {
  const accentClass = {
    copper: "text-copper-light",
    teal: "text-teal-light",
    green: "text-green-light",
    gold: "text-gold",
  }[accent];

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-2 text-4xl font-semibold", accentClass)}>{value.toLocaleString()}</p>
    </div>
  );
}
