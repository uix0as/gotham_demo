/** Recharts 공용 툴팁 — 텍스트는 텍스트 토큰, 색은 옆 마커로만 표시 */
export function ChartTooltip({ active, payload, label, unit = '건', labelFormatter }) {
    if (!active || !payload?.length)
        return null;
    return (<div className="rounded-md border border-line-strong bg-panel px-3 py-2 text-xs shadow-panel">
      <p className="mb-1 font-medium text-ink">{label !== undefined && labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (<p key={String(p.dataKey)} className="flex items-center gap-2 text-ink-secondary">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.color }} aria-hidden/>
          {p.name}
          <span className="ml-auto pl-3 text-ink">
            {p.value}
            {unit}
          </span>
        </p>))}
    </div>);
}
