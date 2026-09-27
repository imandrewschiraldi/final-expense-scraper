/** A labeled column-header picker used by the CSV import mapping step — shared by the admin and agent import forms. */
export function ColumnSelect({
  label,
  value,
  headers,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold tracking-[0.1em] text-muted uppercase">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm text-foreground focus:border-copper-dim focus:outline-none"
      >
        <option value="">Select column...</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}
