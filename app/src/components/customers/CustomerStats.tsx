'use client';

interface Props {
  stats: {
    label: string;
    value: string | number;
  }[];
}

export function CustomerStats({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl p-4 text-center border bg-card">
          <p className="text-2xl font-bold mt-1">{s.value}</p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
