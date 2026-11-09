import { Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowDownToLine, ArrowRight, ArrowUp, ArrowUpRight, ChartNoAxesCombined, ChartPie, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock3, Database, Globe2, Layers, Map as MapIcon, MapPin, Plus, Radio, Search, SlidersHorizontal, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/context/EventsContext';
import { useToast } from '@/context/ToastContext';
import { useEventEditor } from '@/hooks/useEventEditor';
import { useQueryParams } from '@/hooks/useNavigation';
import { EVENT_STATUSES } from '@/domain';
import { formatDate, formatDateTime, formatTime, kstHour } from '@/utils/date';
import { eventCode } from '@/utils/format';
import { canModifyEvent } from '@/utils/permissions';
import { SECTORS } from '@/utils/sectors';
import { Barcode, ObservationMap, SectorColumns, StatusGauge } from '@/components/dashboard/OperationsVisuals';
import { RecordActions } from '@/components/dashboard/RecordActions';
import { EventDetailPanel } from '@/components/events/EventDetailPanel';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, SkeletonRows } from '@/components/ui/States';
const LazyOperationsChart = lazy(() => import('@/components/dashboard/OperationsCharts'));
function OperationsChart(props) { return <Suspense fallback={<div className="op-chart-loading"/>}><LazyOperationsChart {...props}/></Suspense>; }
const STATUS_COLORS = { '접수': 'var(--chart-ink)', '검토 중': '#a0a0a0', '처리 완료': 'var(--teal)' };
const cleanTitle = (event) => event.title.replace(/^\[가상 훈련 \d+\]\s*/, '');
function DashboardCard({ title, icon: Icon, action, children, className = '' }) {
    return <section className={`op-card ${className}`}><div className="op-card-heading"><h2><Icon size={17} strokeWidth={1.6}/>{title}</h2>{action}</div>{children}</section>;
}
function exportRecords(events) {
    function quote(value) {
        let cell = String(value ?? '');
        if (/^[=+@-]/.test(cell))
            cell = `'${cell}`;
        return `"${cell.replaceAll('"', '""')}"`;
    }
    const rows = [['사건 ID', '제목', '유형', '구역', '상태', '발생 시각', '출처'], ...events.map((event) => [eventCode(event.event_id), event.title, event.event_type, event.sector, event.status, formatDateTime(event.occurred_at), event.source_name || event.source_type])];
    const url = URL.createObjectURL(new Blob(['\uFEFF', rows.map((row) => row.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'defense-nexus-records.csv';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Dashboard() {
    const { events: memberEvents, analysisEvents, status, datasetStatus, error, datasetError, reload, reloadDataset, authorOf } = useEvents();
    const { user } = useAuth();
    const toast = useToast();
    const [params] = useQueryParams();
    const eventParam = Number(params.get('event')) || null;
    const [sector, setSector] = useState('');
    const [bucket, setBucket] = useState('hour');
    const [tableScope, setTableScope] = useState('manual');
    const [tableStatus, setTableStatus] = useState('');
    const [tableType, setTableType] = useState('');
    const [query, setQuery] = useState('');
    const [oldestFirst, setOldestFirst] = useState(false);
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState(eventParam);
    const [detailOpen, setDetailOpen] = useState(false);
    const [mapOpen, setMapOpen] = useState(false);
    const [mapSelection, setMapSelection] = useState(null);
    const [retrying, setRetrying] = useState(false);
    const editor = useEventEditor({ onCreated: (event) => { setSelectedId(event.event_id); setDetailOpen(true); setTableScope('manual'); setTableStatus(''); setTableType(''); setQuery(''); setPage(1); } });
    useEffect(() => {
        if (eventParam) {
            setSelectedId(eventParam);
            setDetailOpen(true);
        }
    }, [eventParam]);
    const scopedMembers = useMemo(() => memberEvents.filter((event) => !sector || event.sector === sector), [memberEvents, sector]);
    const scopedRecords = useMemo(() => analysisEvents.filter((event) => !sector || event.sector === sector), [analysisEvents, sector]);
    const observations = useMemo(() => scopedRecords.filter((event) => event.event_id < 0 && !event.is_synthetic && event.data_source !== 'synthetic'), [scopedRecords]);
    const counts = useMemo(() => EVENT_STATUSES.map((label) => ({ label, value: scopedMembers.filter((event) => event.status === label).length, color: STATUS_COLORS[label] })), [scopedMembers]);
    const memberTotal = scopedMembers.length;
    const completed = counts[2].value;
    const completionRate = memberTotal ? completed / memberTotal * 100 : 0;
    const pending = scopedMembers.filter((event) => event.status === '접수');
    const unresolved = scopedMembers.filter((event) => event.status !== '처리 완료');
    const activeSectors = new Set(scopedMembers.map((event) => event.sector)).size;
    const dates = [...new Set(scopedMembers.map((event) => formatDate(event.occurred_at)))].sort();
    const series = useMemo(() => {
        if (!scopedMembers.length)
            return [];
        if (bucket === 'day') {
            const days = [...new Set(scopedMembers.map((event) => formatDate(event.occurred_at)))].sort();
            return days.slice(-14).map((day) => {
                const records = scopedMembers.filter((event) => formatDate(event.occurred_at) === day);
                return { label: day.slice(5), count: records.length, rate: records.length ? records.filter((event) => event.status === '처리 완료').length / records.length * 100 : null };
            });
        }
        const hours = scopedMembers.map((event) => kstHour(event.occurred_at));
        const start = Math.max(0, Math.min(...hours) - 1), end = Math.min(23, Math.max(...hours) + 1);
        return Array.from({ length: end - start + 1 }, (_, index) => {
            const hour = start + index, records = scopedMembers.filter((event) => kstHour(event.occurred_at) === hour);
            return { label: `${String(hour).padStart(2, '0')}:00`, count: records.length, rate: records.length ? records.filter((event) => event.status === '처리 완료').length / records.length * 100 : null };
        });
    }, [scopedMembers, bucket]);
    const magnitudeBands = useMemo(() => {
        const groups = [
            { label: '규모 1 미만', value: 0, color: 'var(--chart-ink)' },
            { label: '규모 1 이상 · 2 미만', value: 0, color: '#747474' },
            { label: '규모 2 이상 · 3 미만', value: 0, color: '#aaaaaa' },
            { label: '규모 3 이상', value: 0, color: '#d5d5d5' },
            { label: '규모 미제공', value: 0, color: '#ececec' },
        ];
        for (const event of observations) {
            const value = event.magnitude;
            groups[value == null ? 4 : value < 1 ? 0 : value < 2 ? 1 : value < 3 ? 2 : 3].value++;
        }
        return groups.filter((group, index) => index < 4 || group.value > 0);
    }, [observations]);
    const typeGroups = useMemo(() => {
        const totals = new Map();
        for (const event of scopedMembers)
            totals.set(event.event_type, (totals.get(event.event_type) || 0) + 1);
        const sorted = [...totals].sort((a, b) => b[1] - a[1]);
        const colors = ['var(--chart-ink)', 'var(--teal)', '#587b88', '#dbb64a', '#b6b6b6'];
        const groups = sorted.slice(0, 4).map(([label, value], index) => ({ label, value, color: colors[index] }));
        if (sorted.length > 4)
            groups.push({ label: '기타 유형', value: sorted.slice(4).reduce((sum, entry) => sum + entry[1], 0), color: colors[4] });
        return groups;
    }, [scopedMembers]);
    const tableRecords = useMemo(() => {
        const source = tableScope === 'manual' ? scopedMembers : tableScope === 'external' ? observations : scopedRecords;
        const term = query.trim().toLowerCase();
        return source.filter((event) => (!tableStatus || event.status === tableStatus) && (!tableType || (tableType === '기타 유형' ? !typeGroups.slice(0, 4).some((group) => group.label === event.event_type) : event.event_type === tableType)) && (!term || [event.title, event.event_type, event.sector, eventCode(event.event_id), authorOf(event.member_id)].join(' ').toLowerCase().includes(term))).sort((a, b) => (oldestFirst ? 1 : -1) * (a.occurred_at.localeCompare(b.occurred_at) || a.event_id - b.event_id));
    }, [tableScope, scopedMembers, observations, scopedRecords, tableStatus, tableType, query, oldestFirst, typeGroups, authorOf]);
    const pageCount = Math.max(1, Math.ceil(tableRecords.length / 6));
    const currentPage = Math.min(page, pageCount);
    const visibleRecords = tableRecords.slice((currentPage - 1) * 6, currentPage * 6);
    const selected = analysisEvents.find((event) => event.event_id === selectedId) || null;
    const mapSelected = scopedRecords.find((event) => event.event_id === mapSelection) || scopedRecords[0] || null;
    const ready = status === 'ready' && datasetStatus === 'ready';
    const memberLoading = status === 'loading';
    const tableLoading = tableScope === 'manual' ? memberLoading : tableScope === 'external' ? datasetStatus === 'loading' : memberLoading && datasetStatus === 'loading';
    const latestImport = observations.map((event) => event.imported_at).filter((value) => !!value).sort().at(-1);
    function selectSector(value) { setSector(value); setPage(1); }
    function viewRecord(event) { setSelectedId(event.event_id); setDetailOpen(true); }
    function scrollToRecords() { document.getElementById('records')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
    function showStatus(value) { setTableScope('manual'); setTableStatus(tableStatus === value ? '' : value); setPage(1); scrollToRecords(); }
    return <div className="operations-dashboard">
    <PageHeader
      className="dashboard-header"
      title="사건·관측 통합 대시보드"
      description="회원 사건과 공개 관측의 구역별 흐름을 확인합니다."
      icon={<Layers size={23} strokeWidth={1.65}/>}
      status={<span className={`op-connection${ready ? '' : ' is-pending'}`}><i />{ready ? '데이터 연결 정상' : error || datasetError ? '일부 연결 확인 필요' : '데이터 연결 중'}</span>}
      actions={<>
        <label className="op-select"><span className="sr-only">전체 대시보드 구역</span><select aria-label="전체 대시보드 구역" value={sector} onChange={(event) => selectSector(event.target.value)}><option value="">전체 구역</option>{SECTORS.map((entry) => <option key={entry.id} value={entry.id}>{entry.id} · {entry.name}</option>)}</select><ChevronDown size={14}/></label>
        <button className="app-button op-map-action" onClick={() => setMapOpen(true)}><MapIcon size={16}/>구역 지도</button>
        <button className="app-button is-primary" onClick={editor.openCreate}><Plus size={16}/>상황정보 등록</button>
      </>}
    />

    {(error || datasetError) && <div className="op-load-error" role="alert"><Radio size={17}/><span>일부 데이터를 불러오지 못했습니다. 새로고침으로 다시 확인해 주세요.</span><button disabled={retrying} onClick={async () => {
                setRetrying(true);
                try {
                    await Promise.all([reload(), reloadDataset()]);
                }
                finally {
                    setRetrying(false);
                }
            }}>{retrying ? '다시 연결 중…' : '다시 연결'}</button></div>}

    <div className="op-metric-strip">
      <div className="op-metric"><h2><ClipboardList size={16}/>전체 회원 사건</h2><div className="op-metric-body"><div><strong>{memberLoading ? '—' : memberTotal.toLocaleString()}<span>건</span></strong><p><span className="op-positive">{activeSectors}개 구역</span>의 등록 사건</p></div></div></div>
      <div className="op-metric"><h2><Clock3 size={16}/>사건 처리 완료율</h2><div className="op-metric-body"><div><strong>{memberLoading ? '—' : completionRate.toFixed(1)}<span>%</span></strong><p><span className="op-positive">{completed}건</span> 처리 완료</p></div></div></div>
      <div className="op-metric"><h2><Database size={16}/>전체 분석 데이터</h2><div className="op-metric-body"><div><strong>{memberLoading && datasetStatus === 'loading' ? '—' : scopedRecords.length.toLocaleString()}<span>건</span></strong><p>회원 사건 · 공개·합성 자료</p></div></div></div>
      <div className="op-metric"><h2><Radio size={16}/>미처리 사건</h2><div className="op-metric-body"><div><strong>{memberLoading ? '—' : unresolved.length.toLocaleString()}<span>건</span></strong><p><span className="op-positive">접수 {pending.length}건</span> · 검토 {counts[1].value}건</p></div></div></div>
    </div>

    <div className="op-primary-grid" role="group" aria-label="사건 흐름과 확인 대상">
      <DashboardCard title="사건 발생 추이 및 처리 현황" icon={ChartNoAxesCombined} className="op-trend-card" action={<span className="op-caption">회원 사건 기준</span>}><div className="op-trend-summary"><div><span>사건 발생</span><strong>{memberTotal.toLocaleString()}<small>건</small></strong></div><div><span>처리 완료율</span><strong>{completionRate.toFixed(1)}<small>%</small></strong></div><label className="op-select"><span className="sr-only">추이 집계 단위</span><select value={bucket} aria-label="추이 집계 단위" onChange={(event) => setBucket(event.target.value)}><option value="hour">시간대별</option><option value="day">일별</option></select><ChevronDown size={14}/></label></div>{memberLoading ? <div className="op-chart-loading"/> : series.length ? <OperationsChart data={series}/> : <EmptyState title="표시할 회원 사건이 없습니다" message="구역을 변경하거나 상황정보를 등록해 보세요."/>}<div className="op-trend-footer"><span>{dates.length ? `${dates[0]}${dates.length > 1 ? ` — ${dates.at(-1)}` : ''}` : '등록된 사건 없음'} · KST</span><div><span><i />발생 건수</span><span><i />처리 완료율</span></div></div></DashboardCard>
      <DashboardCard title="확인이 필요한 사건" icon={ClipboardList} className="op-pending-card" action={<span className="op-live-label"><i />{pending.length}건 접수</span>}><div className="op-pending-list">{pending.length ? pending.slice(0, 4).map((event) => <button key={event.event_id} onClick={() => viewRecord(event)}><span className="op-pending-symbol"><Radio size={19} strokeWidth={1.5}/></span><span><strong>{cleanTitle(event)}</strong><small>{eventCode(event.event_id)} · {formatTime(event.occurred_at)}</small></span><span className="op-state is-received">접수</span></button>) : <EmptyState title="접수된 사건이 없습니다" message="상황정보 목록에서 다른 상태의 사건을 확인할 수 있습니다."/>}</div><Link to="/events?status=접수" className="op-card-footer-link">접수 사건 전체 보기<ArrowRight size={15}/></Link></DashboardCard>
    </div>

    <div className="op-insight-grid" role="group" aria-label="상태와 구역 및 공개 관측 분포">
      <DashboardCard title="사건 처리 상태" icon={ChartPie} className="op-status-card" action={<span className="op-live-label"><i />{memberTotal}건</span>}><StatusGauge items={counts}/><div className="op-status-legend">{counts.map((item) => <button key={item.label} onClick={() => showStatus(item.label)} aria-label={`${item.label} 사건 ${item.value}건 목록 보기`}><i style={{ background: item.color }}/><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong><small>{memberTotal ? (item.value / memberTotal * 100).toFixed(0) : 0}%</small></button>)}</div></DashboardCard>
      <DashboardCard title="구역별 사건 분포" icon={MapPin} className="op-sector-card"><div className="op-sector-summary"><strong>{activeSectors}<small>개 구역</small></strong><p>가상 훈련구역의 등록 사건 현황</p></div><SectorColumns events={scopedMembers} sector={sector} onSector={selectSector}/></DashboardCard>
      <DashboardCard title="공개 관측 데이터" icon={Globe2} className="op-observation-card"><div className="op-public-total"><strong>{datasetStatus === 'loading' ? '—' : observations.length.toLocaleString()}<small>건</small></strong><p><span className="op-positive">공개 관측 스냅샷</span><span>읽기 전용</span></p></div><div className="op-magnitude"><h3>규모별 관측 분포</h3><Barcode items={magnitudeBands}/><div className="op-public-legend">{magnitudeBands.map((group) => <div key={group.label}><i style={{ background: group.color }}/><span>{group.label}</span><strong>{group.value.toLocaleString()}<small>({observations.length ? (group.value / observations.length * 100).toFixed(0) : 0}%)</small></strong></div>)}</div></div><div className="op-public-footer"><span>{latestImport ? `수집 ${formatDateTime(latestImport)}` : '저장된 공개 관측 자료'}</span><Link to="/sources" aria-label="공개 관측 데이터 출처 확인"><ArrowUpRight size={16}/></Link></div></DashboardCard>
    </div>

    <div className="op-record-grid" role="group" aria-label="최근 상황정보와 발생 유형">
      <DashboardCard title="최근 상황정보" icon={ClipboardList} className="op-records-card" action={<button className="op-text-action" disabled={!tableRecords.length || tableLoading} onClick={() => { exportRecords(tableRecords); toast.success(`${tableRecords.length.toLocaleString()}건의 상황정보를 내보냈습니다.`); }}><ArrowDownToLine size={15}/>CSV 내보내기</button>}><div id="records" className="op-record-tools"><div className="op-record-tabs" role="group" aria-label="목록 데이터 출처">{[{ value: 'manual', label: '회원 사건', count: scopedMembers.length }, { value: 'external', label: '공개 관측', count: observations.length }, { value: 'all', label: '전체', count: scopedRecords.length }].map((tab) => <button key={tab.value} aria-pressed={tableScope === tab.value} className={tableScope === tab.value ? 'is-selected' : ''} onClick={() => { setTableScope(tab.value); setPage(1); setTableType(''); }}>{tab.label}<span>{tab.count.toLocaleString()}</span></button>)}</div><div className="op-record-filters"><div className="op-record-search"><Search size={15}/><label htmlFor="record-search-v2" className="sr-only">목록 검색</label><input id="record-search-v2" value={query} placeholder="검색..." onChange={(event) => { setQuery(event.target.value); setPage(1); }}/></div><label className="op-select op-record-status"><SlidersHorizontal size={14}/><span className="sr-only">목록 처리 상태</span><select aria-label="목록 처리 상태" value={tableStatus} onChange={(event) => { setTableStatus(event.target.value); setPage(1); }}><option value="">모든 상태</option>{EVENT_STATUSES.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown size={12}/></label></div></div>
        {(tableType || tableScope !== 'manual') && <div className="op-record-context">{tableType ? <button onClick={() => setTableType('')}>유형: {tableType}<X size={13}/></button> : <span>공개 관측·합성 자료는 읽기 전용입니다. 상태는 분석용 표시값입니다.</span>}</div>}
        {tableLoading ? <SkeletonRows rows={6}/> : !tableRecords.length ? <EmptyState title="조건에 맞는 상황정보가 없습니다" message="검색어나 상태·구역 필터를 변경해 보세요." action={<button className="app-button" onClick={() => { setQuery(''); setTableStatus(''); setTableType(''); setSector(''); setPage(1); }}>필터 초기화</button>}/> : <div className="op-table-scroll"><table className="op-record-table"><caption className="sr-only">최근 발생한 상황정보 목록</caption><thead><tr><th scope="col">사건 ID</th><th scope="col">상황정보 / 유형</th><th scope="col">구역</th><th scope="col">상태</th><th scope="col" aria-sort={oldestFirst ? 'ascending' : 'descending'}><button onClick={() => { setOldestFirst(!oldestFirst); setPage(1); }}>발생 시각{oldestFirst ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}</button></th><th scope="col"><span className="sr-only">관리</span></th></tr></thead><tbody>{visibleRecords.map((event) => <tr key={event.event_id}><td><button className="op-record-code" onClick={() => viewRecord(event)}>{eventCode(event.event_id)}</button></td><td><button className="op-record-name" onClick={() => viewRecord(event)}><strong>{cleanTitle(event)}</strong><span>{event.event_type} · {event.event_id > 0 ? authorOf(event.member_id) : event.source_name || event.source_type}</span></button></td><td><span className="op-table-sector">{event.sector}</span></td><td><span className={`op-state ${event.status === '접수' ? 'is-received' : event.status === '검토 중' ? 'is-review' : 'is-complete'}`}>{event.status}</span></td><td><span className="op-record-date">{formatDate(event.occurred_at).slice(5)}<span>{formatTime(event.occurred_at)}</span></span></td><td><RecordActions event={event} editable={event.event_id > 0 && canModifyEvent(event, user)} onView={() => viewRecord(event)} onEdit={() => editor.openEdit(event)} onDelete={() => editor.requestDelete(event)}/></td></tr>)}</tbody></table></div>}
        <div className="op-pagination"><span>총 {tableRecords.length.toLocaleString()}건 중 {tableRecords.length ? `${(currentPage - 1) * 6 + 1}–${Math.min(currentPage * 6, tableRecords.length)}` : 0}건</span><div><button className="console-icon" disabled={currentPage === 1} aria-label="이전 페이지" onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17}/></button><span>{currentPage} / {pageCount}</span><button className="console-icon" disabled={currentPage === pageCount} aria-label="다음 페이지" onClick={() => setPage(currentPage + 1)}><ChevronRight size={17}/></button></div></div>
      </DashboardCard>
      <DashboardCard title="발생 유형별 분포" icon={Layers} className="op-types-card" action={<span className="op-live-label"><i />{memberTotal}건</span>}><div className="op-type-overview"><span>회원 사건 구성</span><strong>{typeGroups.length ? new Set(scopedMembers.map((event) => event.event_type)).size : 0}개 유형</strong></div><div className="op-type-stack" aria-label="사건 유형별 비중">{typeGroups.map((group) => <span key={group.label} title={`${group.label} ${group.value}건`} style={{ width: `${memberTotal ? group.value / memberTotal * 100 : 0}%`, background: group.color }}/>)}</div><div className="op-type-list">{typeGroups.map((group) => <button key={group.label} aria-pressed={tableType === group.label} onClick={() => { setTableType(tableType === group.label ? '' : group.label); setTableScope('manual'); setPage(1); scrollToRecords(); }}><span className="op-type-symbol" style={{ color: group.color }}><Layers size={18}/></span><span><strong>{group.label}</strong><small>{group.value}건의 등록 사건</small></span><span>{memberTotal ? (group.value / memberTotal * 100).toFixed(1) : 0}%</span></button>)}</div>{!typeGroups.length && <EmptyState title="등록된 유형이 없습니다" message="회원 사건을 등록하면 유형별 구성이 표시됩니다."/>}</DashboardCard>
    </div>

    <div className="op-provenance"><span>회원 사건은 가상 훈련 자료입니다. 공개 관측은 별도 출처의 읽기 전용 스냅샷입니다.</span><Link to="/sources">출처 및 데이터 구분<ArrowUpRight size={13}/></Link></div>
    <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={selected ? `${eventCode(selected.event_id)} · 상황정보 상세` : '상황정보 상세'} size="lg"><EventDetailPanel event={selected} windowMinutes={30} onSelect={setSelectedId} onEdit={(event) => { setDetailOpen(false); editor.openEdit(event); }} onDelete={(event) => { setDetailOpen(false); editor.requestDelete(event); }}/></Modal>
    <Modal open={mapOpen} onClose={() => setMapOpen(false)} title="가상 훈련구역 지도" description="자료의 위치를 0–100 좌표로 정규화한 가상 구역입니다. 실제 지형을 나타내지 않습니다." size="xl"><ObservationMap events={scopedRecords} selectedId={mapSelected?.event_id || null} onSelect={setMapSelection}/>{mapSelected && <div className="op-map-selection"><span><small>{eventCode(mapSelected.event_id)} · {mapSelected.sector}</small><strong>{cleanTitle(mapSelected)}</strong></span><button className="app-button" onClick={() => { setMapOpen(false); viewRecord(mapSelected); }}>상세 보기<ArrowUpRight size={15}/></button></div>}</Modal>
    {editor.modals}
  </div>;
}
