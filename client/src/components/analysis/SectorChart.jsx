import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from '@/components/ui/ChartTooltip';
// Shared dashboard series: count in neutral, linked records in teal.
const C_TOTAL = 'var(--chart-ink)';
const C_LINKED = 'var(--teal)';
export function SectorChart({ data, onSelectSector }) {
    return (<div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={2} barCategoryGap="24%" className={onSelectSector ? 'cursor-pointer' : undefined} onClick={(state) => {
            const label = state?.activeLabel;
            if (label && onSelectSector)
                onSelectSector(String(label));
        }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)"/>
          <XAxis dataKey="sector" tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'inherit' }} axisLine={{ stroke: 'var(--chart-grid)' }} tickLine={false}/>
          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}/>
          <Tooltip cursor={{ fill: 'var(--surface-alt)' }} content={<ChartTooltip labelFormatter={(l) => `${l} 구역`}/>}/>
          <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)', paddingTop: 6 }}/>
          <Bar dataKey="total" name="전체 사건" fill={C_TOTAL} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false}/>
          <Bar dataKey="linked" name="연관 후보 포함 사건" fill={C_LINKED} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false}/>
        </BarChart>
      </ResponsiveContainer>
    </div>);
}
