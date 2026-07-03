import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "copper" | "teal" | "green" | "gold" | "red";
}) {
  const accentClass = {
    copper: "text-copper",
    teal: "text-teal-light",
    green: "text-green-light",
    gold: "text-copper",
    red: "text-red-light",
  }[accent];

  return (
    <div className="rounded-[10px] border border-border bg-surface p-5">
      <p className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className={cn("font-condensed mt-1 text-[40px] leading-none font-black", accentClass)}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
