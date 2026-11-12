import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryParams as useSearchParams } from '@/hooks/useNavigation';
import { BarChart3, Boxes, Clock, GitBranch, Link2, Network, ShieldAlert, Sigma } from 'lucide-react';
import { correlationEngine } from '@/analysis';
import { useEvents } from '@/context/EventsContext';
import { CORRELATION_WINDOWS, DEFAULT_CORRELATION_WINDOW } from '@/utils/constants';
import { formatDate, formatMinutes, formatTime, kstHour } from '@/utils/date';
import { cx, eventCode } from '@/utils/format';
import { SECTOR_IDS, getSector } from '@/utils/sectors';
import { useEventEditor } from '@/hooks/useEventEditor';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { KpiCard } from '@/components/ui/KpiCard';
import { Segmented } from '@/components/ui/Segmented';
import { SelectInput } from '@/components/ui/Field';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { SectorBadge } from '@/components/ui/Badges';
import { MarkerShape } from '@/components/map/MarkerShape';
import { EventDetailPanel } from '@/components/events/EventDetailPanel';
import { CorrelationGraph, GraphLegend } from '@/components/analysis/CorrelationGraph';
import { SectorChart } from '@/components/analysis/SectorChart';
import { HourlyChart } from '@/components/analysis/HourlyChart';
import { filterDataset, sampleForDisplay } from '@/utils/datasets';
import { DatasetPanel } from '@/components/data/DatasetPanel';
export default function Analysis() {
    const { analysisEvents: allEvents, status, error, reload, datasetStatus, datasetError, reloadDataset } = useEvents();
    const [datasetFilter, setDatasetFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const events = useMemo(() => filterDataset(allEvents, datasetFilter).filter((e) => (!typeFilter || e.event_type === typeFilter) && (!sourceFilter || (e.source_name || e.source_type) === sourceFilter)), [allEvents, datasetFilter, typeFilter, sourceFilter]);
    const [params, setParams] = useSearchParams();
    const winParam = Number(params.get('window'));
    const win = CORRELATION_WINDOWS.includes(winParam) ? winParam : DEFAULT_CORRELATION_WINDOW;
    const sector = params.get('sector') ?? '';
    const day = params.get('day') ?? '';
    const [onlyLinked, setOnlyLinked] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const editor = useEventEditor();
    const setParam = (k, v) => {
        const p = new URLSearchParams(params);
        if (v)
            p.set(k, v);
        else
            p.delete(k);
        setParams(p, { replace: true });
    };
    const days = useMemo(() => [...new Set(events.map((e) => formatDate(e.occurred_at)))].sort().reverse(), [events]);
    // 분석 대상: 구역/날짜 필터 적용
    const scoped = useMemo(() => events.filter((e) => (!sector || e.sector === sector) && (!day || formatDate(e.occurred_at) === day)), [events, sector, day]);
    const result = useMemo(() => correlationEngine.analyze(scoped, { windowMinutes: win }), [scoped, win]);
    const linkedIds = useMemo(() => new Set(result.links.flatMap((l) => [l.source, l.target])), [result]);
    const graphCandidates = useMemo(() => onlyLinked ? scoped.filter((e) => linkedIds.has(e.event_id)) : scoped, [onlyLinked, scoped, linkedIds]);
    const graphEvents = useMemo(() => sampleForDisplay(graphCandidates, 120, selectedId), [graphCandidates, selectedId]);
    const graphLinks = useMemo(() => { const ids = new Set(graphEvents.map((e) => e.event_id)); return result.links.filter((l) => ids.has(l.source) && ids.has(l.target)); }, [graphEvents, result]);
    const byId = useMemo(() => new Map(events.map((e) => [e.event_id, e])), [events]);
    useEffect(() => {
        if (selectedId != null && !scoped.some((e) => e.event_id === selectedId))
            setSelectedId(null);
    }, [scoped, selectedId]);
    // 최초 1회: 가장 큰 묶음의 첫 사건을 기본 선택
    const autoSelected = useRef(false);
    useEffect(() => {
        if (!autoSelected.current && selectedId == null && result.clusters.length) {
            autoSelected.current = true;
            setSelectedId(result.clusters[0].event_ids[0]);
        }
    }, [result, selectedId]);
    const sectorStats = useMemo(() => SECTOR_IDS.map((s) => {
        const list = events.filter((e) => e.sector === s && (!day || formatDate(e.occurred_at) === day));
        return { sector: s, total: list.length, linked: list.filter((e) => linkedIds.has(e.event_id)).length };
    }).filter((s) => !sector || s.sector === sector), [events, linkedIds, sector, day]);
    const hourly = useMemo(() => {
        const arr = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
        for (const e of scoped)
            arr[kstHour(e.occurred_at)].count++;
        return arr;
    }, [scoped]);
    const selected = selectedId != null ? byId.get(selectedId) ?? null : null;
    const ratio = scoped.length ? Math.round((linkedIds.size / scoped.length) * 100) : 0;
    const loading = status === 'loading' && datasetStatus === 'loading' && !events.length;
    return (<div className="workspace-page analysis-page">
      <PageHeader code="ANL-COR" title="구역·시간 연관" description="회원 사건과 공개 관측·가상 데이터를 예시 구역과 시간 근접성으로 연결해 연관 후보를 탐색합니다." actions={<span className="app-badge app-sector">
            <Sigma className="h-3.5 w-3.5 text-accent" aria-hidden/>
            {correlationEngine.label} · AI 미사용
          </span>}/>

      <DatasetPanel events={allEvents} value={datasetFilter} onChange={(value) => { setDatasetFilter(value); setTypeFilter(''); setSourceFilter(''); }} status={datasetStatus} error={datasetError} onReload={reloadDataset} type={typeFilter} source={sourceFilter} onType={setTypeFilter} onSource={setSourceFilter}/>
      {status === 'error' && <div className="app-error-banner" role="alert">회원 사건 조회 실패: {error} <button type="button" className="underline" onClick={() => void reload()}>다시 조회</button></div>}

      <div className="analysis-rule" role="note">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden/>
        <p>
          <strong className="text-ink">분석 규칙:</strong> 같은 구역에서 선택한 시간 범위 안에 발생한 자료를 <em className="not-italic text-ink">연관 후보</em>로 연결합니다.
          이는 규칙 기반 계산 결과이며 <strong className="text-ink">원인 관계나 위험성 판단이 아닌 데이터상의 연관성</strong>입니다. 최종 판단은 담당자가 수행합니다.
        </p>
      </div>

      <Panel>
        <div className="analysis-controls"><div className="analysis-filter"><span>연관 시간 범위</span><Segmented label="연관 시간 범위" value={win} onChange={(value) => setParam('window', String(value))} options={CORRELATION_WINDOWS.map((value) => ({ value, label: `${value}분` }))}/></div><label className="analysis-filter"><span>발생 구역</span><SelectInput aria-label="분석 구역" value={sector} onChange={(event) => setParam('sector', event.target.value)}><option value="">전체 구역</option>{SECTOR_IDS.map((value) => <option key={value} value={value}>{value} · {getSector(value)?.name}</option>)}</SelectInput></label><label className="analysis-filter"><span>발생 일자</span><SelectInput aria-label="분석 일자" value={day} onChange={(event) => setParam('day', event.target.value)}><option value="">전체 기간</option>{days.map((value) => <option key={value}>{value}</option>)}</SelectInput></label><label className="app-checkbox"><input type="checkbox" checked={onlyLinked} onChange={(event) => setOnlyLinked(event.target.checked)}/>연관 사건만 표시</label></div>
      </Panel>

      <div className="summary-strip">
        <KpiCard label="분석 대상" value={scoped.length} icon={<Boxes className="h-4 w-4"/>} caption={sector ? `${sector} 구역` : '전체 구역'} loading={loading}/>
        <KpiCard label="연관 후보 연결" value={result.links.length} icon={<Link2 className="h-4 w-4"/>} tone="info" caption={`±${win}분 기준 사건 쌍`} loading={loading}/>
        <KpiCard label="사건 묶음" value={result.clusters.length} icon={<GitBranch className="h-4 w-4"/>} tone="warn" caption="연결 요소(2건 이상)" loading={loading}/>
        <KpiCard label="연관 포함 비율" value={`${ratio}%`} icon={<Network className="h-4 w-4"/>} tone="ok" caption={`${linkedIds.size} / ${scoped.length}건`} loading={loading}/>
      </div>

      <div className="analysis-workspace-grid">
        <Panel title="사건 간 관계 그래프" icon={<Network className="h-4 w-4"/>} subtitle={`필터 대상 ${scoped.length.toLocaleString()}건 · 그래프 후보 ${graphCandidates.length.toLocaleString()}건 중 ${graphEvents.length}건 표시 · 선택 사건 포함 · 통계는 전체 대상 기준`} bodyClassName="p-5">
          {loading ? (<LoadingState />) : graphEvents.length === 0 ? (<EmptyState title="표시할 사건이 없습니다" message="필터를 변경하거나 시간 범위를 넓혀 보세요."/>) : (<div className="relation-graph">
              <CorrelationGraph events={graphEvents} links={graphLinks} selectedId={selectedId} onSelect={setSelectedId}/>
            </div>)}
          <div className="mt-3">
            <GraphLegend sources={graphEvents.map((event) => event.source_type)}/>
          </div>
        </Panel>

        <EventDetailPanel className="max-h-panel-lg xl:sticky xl:top-20" event={selected} windowMinutes={win} onSelect={setSelectedId} onClose={() => setSelectedId(null)} onEdit={editor.openEdit} onDelete={editor.requestDelete}/>
      </div>

      <div className="analysis-bottom-grid">
        <Panel title="관련 사건 묶음" icon={<GitBranch className="h-4 w-4"/>} subtitle={`전체 ${result.clusters.length}개 중 규모순 최대 50개 표시 · 같은 예시 구역에서 ±${win}분 간격의 연결 사슬`} bodyClassName="p-0">
          {loading ? (<LoadingState compact/>) : result.clusters.length === 0 ? (<EmptyState title="연관 후보 묶음이 없습니다" message={`현재 조건(±${win}분)에서는 같은 구역의 근접 사건이 없습니다. 시간 범위를 넓혀 보세요.`}/>) : (<ul className="max-h-panel divide-y divide-line overflow-y-auto">
              {result.clusters.slice(0, 50).map((c, i) => {
                const clusterIds = new Set(c.event_ids);
                const clusterLinks = result.links.filter((l) => clusterIds.has(l.source));
                return (<li key={c.id} className="px-4 py-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-2xs text-ink-muted">#{String(i + 1).padStart(2, '0')}</span>
                      <SectorBadge sector={c.sector}/>
                      <span className="text-sm font-medium text-ink">{c.event_ids.length}건 묶음</span>
                      <span className="text-2xs text-ink-muted">
                        {formatDate(c.start).slice(5)} {formatTime(c.start)} – {formatTime(c.end)} · 범위 {formatMinutes(c.span_minutes)} · 연결 {c.link_count}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.event_ids.slice(0, 50).map((id) => {
                        const e = byId.get(id);
                        if (!e)
                            return null;
                        return (<button key={id} type="button" onClick={() => setSelectedId(id)} aria-pressed={id === selectedId} className={cx('cluster-event inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors', id === selectedId ? 'border-accent/60 bg-accent/10 text-ink' : 'border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink')}>
                            <MarkerShape status={e.status} size={7}/>
                            <span className="text-ink-muted">{formatTime(e.occurred_at)}</span>
                            {e.event_type}
                          </button>);
                    })}
                    </div>
                    {c.event_ids.length > 50 && <p className="mt-2 text-2xs text-ink-muted">묶음의 시간순 50건 표시 / 총 {c.event_ids.length}건 · 구역·일자 필터로 범위를 좁혀 확인하세요.</p>}
                    <details className="mt-2 group">
                      <summary className="cluster-summary flex items-center text-xs text-ink-secondary hover:text-ink">연관 근거 {clusterLinks.length}건 보기 (최대 100건 표시)</summary>
                      <ul className="mt-1.5 space-y-1">
                        {clusterLinks.slice(0, 100).map((l) => (<li key={l.key} className="rounded border border-line bg-surface px-2 py-1.5 text-2xs text-ink-muted">
                            <span className="text-ink-secondary">
                              {eventCode(l.source)} ↔ {eventCode(l.target)}
                            </span>{' '}
                            · {l.reasons.join(' · ')}
                          </li>))}
                      </ul>
                    </details>
                  </li>);
            })}
            </ul>)}
        </Panel>

        <div className="grid content-start gap-4">
          <Panel title="구역별 이벤트 분석" icon={<BarChart3 className="h-4 w-4"/>} subtitle="막대를 클릭하면 해당 구역만 분석합니다">
            {loading ? <LoadingState compact/> : <SectorChart data={sectorStats} onSelectSector={(s) => setParam('sector', s === sector ? '' : s)}/>}
          </Panel>
          <Panel title="시간대별 이벤트 분석" icon={<Clock className="h-4 w-4"/>} subtitle="발생 시각(KST) 기준 시간대별 건수">
            {loading ? <LoadingState compact/> : <HourlyChart data={hourly}/>}
          </Panel>

        </div>
      </div>

      {editor.modals}
    </div>);
}
