import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '@/components/ui/ChartTooltip';
import { EmptyState } from '@/components/ui/States';
const SERIES = '#3987e5';
export function EventTypeChart({ events }) {
    const data = useMemo(() => {
        const counts = new Map();
        for (const e of events)
            counts.set(e.event_type, (counts.get(e.event_type) ?? 0) + 1);
        return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
    }, [events]);
    if (!data.length)
        return <EmptyState title="통계를 표시할 데이터가 없습니다"/>;
    return (<div style={{ height: Math.max(180, data.length * 34 + 20) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }} barCategoryGap={8}>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)"/>
          <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false}/>
          <YAxis type="category" dataKey="type" width={104} tick={{ fill: '#a3b0c5', fontSize: 12 }} axisLine={false} tickLine={false}/>
          <Tooltip cursor={{ fill: 'rgba(63,182,217,0.06)' }} content={<ChartTooltip />}/>
          <Bar dataKey="count" name="사건 수" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={18}>
            <LabelList dataKey="count" position="right" fill="#a3b0c5" fontSize={11}/>
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>);
}
