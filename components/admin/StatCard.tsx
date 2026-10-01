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
    copper: "metal-copper-text",
    teal: "text-teal-light",
    green: "metal-green-text",
    gold: "text-gold",
    red: "metal-red-text",
  }[accent];

  return (
    <div className="rounded-[10px] border border-border bg-surface p-5">
      <p className="font-condensed text-[11px] font-bold tracking-[0.12em] text-muted uppercase">{label}</p>
      <p className="font-condensed mt-1 text-[40px] leading-none font-black">
        <span className={accentClass}>{value.toLocaleString()}</span>
      </p>
    </div>
  );
}
