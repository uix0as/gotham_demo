import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '@/components/ui/ChartTooltip';
export function HourlyChart({ data }) {
    return (<div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)"/>
          <XAxis dataKey="hour" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'inherit' }} tickFormatter={(h) => String(h).padStart(2, '0')} interval={1} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false}/>
          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}/>
          <Tooltip cursor={{ fill: 'var(--surface-alt)' }} content={<ChartTooltip labelFormatter={(h) => `${String(h).padStart(2, '0')}:00 – ${String(h).padStart(2, '0')}:59 (KST)`}/>}/>
          <Bar dataKey="count" name="발생 사건" fill="var(--chart-ink)" radius={[3, 3, 0, 0]} isAnimationActive={false}/>
        </BarChart>
      </ResponsiveContainer>
    </div>);
}
