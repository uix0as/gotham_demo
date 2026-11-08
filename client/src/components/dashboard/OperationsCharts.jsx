import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
export default function OperationsChart({ data }) {
    const ceiling = Math.max(3, Math.ceil(Math.max(...data.map((point) => point.count), 1) / 3) * 3);
    return <div className="operations-chart" role="img" aria-label={`발생 건수와 처리 완료율: ${data.map((point) => `${point.label} ${point.count}건`).join(', ')}`}>
    <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 20, right: 0, bottom: 4, left: -22 }} accessibilityLayer>
      <defs><linearGradient id="operations-volume" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b8b8b" stopOpacity={0.42}/><stop offset="100%" stopColor="#8b8b8b" stopOpacity={0.03}/></linearGradient></defs>
      <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4"/>
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} minTickGap={26} dy={9}/>
      <YAxis yAxisId="count" domain={[0, ceiling]} tickCount={4} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }}/>
      <YAxis yAxisId="rate" orientation="right" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={42}/>
      <Tooltip cursor={{ stroke: 'var(--border-strong)', strokeDasharray: '4 4' }} contentStyle={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} formatter={(value, name) => name === 'rate' ? [`${Number(value).toFixed(0)}%`, '처리 완료율'] : [`${value}건`, '발생 건수']}/>
      <Area yAxisId="count" name="count" dataKey="count" type="monotone" fill="url(#operations-volume)" stroke="var(--chart-ink)" strokeWidth={1.8} dot={data.length === 1 ? { r: 4 } : false} isAnimationActive={false} activeDot={{ r: 4, stroke: 'var(--panel)', strokeWidth: 3 }}/>
      <Line yAxisId="rate" name="rate" dataKey="rate" type="monotone" stroke="var(--teal)" strokeWidth={1.8} dot={data.length === 1 ? { r: 4 } : false} connectNulls={false} isAnimationActive={false} activeDot={{ r: 4, stroke: 'var(--panel)', strokeWidth: 3 }}/>
    </ComposedChart></ResponsiveContainer>
  </div>;
}
