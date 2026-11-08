import { ChevronDown, Database, RefreshCw } from 'lucide-react';
import { DATASET_FILTERS, recordGroup, safeSourceUrl } from '@/utils/datasets';
import { formatDate, formatDateTime } from '@/utils/date';
import { SelectInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
export function DatasetPanel({ events, value, onChange, status, error, onReload, type, source, onType, onSource }) {
    const counts = { all: events.length, manual: 0, external: 0, synthetic: 0 };
    for (const event of events)
        counts[recordGroup(event)]++;
    const types = [...new Set(events.map((event) => event.event_type))].sort();
    const sources = [...new Set(events.map((event) => event.source_name || event.source_type))].sort();
    const imported = events.filter((event) => event.event_id < 0);
    const names = [...new Set(imported.map((event) => event.source_name || event.source_type))];
    const dates = imported.map((event) => event.occurred_at).sort();
    const snapshots = imported.map((event) => event.collected_at || event.imported_at || '').filter(Boolean).sort();
    const sourceUrl = safeSourceUrl(imported.find((event) => event.dataset_url)?.dataset_url);
    return <section className="panel dataset-panel" aria-label="분석 데이터 출처">
    <div className="panel-header"><h2 className="panel-title"><Database size={17} strokeWidth={1.65}/>분석 데이터<span className="data-caption">{events.length.toLocaleString()}건</span></h2><Button size="sm" variant="ghost" icon={<RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''}/>} disabled={status === 'loading'} onClick={() => void onReload()}>데이터 다시 조회</Button></div>
    <div className="dataset-toolbar"><div className="dataset-tabs" role="group" aria-label="데이터 출처 필터">{DATASET_FILTERS.map(({ value: key, label }) => <button key={key} type="button" aria-pressed={value === key} onClick={() => onChange(key)}>{label}<span>{counts[key].toLocaleString()}</span></button>)}</div><div className="dataset-selects"><label>유형<SelectInput aria-label="분석 사건·관측 유형" value={type} onChange={(event) => onType(event.target.value)}><option value="">전체 유형</option>{types.map((item) => <option key={item}>{item}</option>)}</SelectInput></label><label>출처<SelectInput aria-label="분석 원천 출처" value={source} onChange={(event) => onSource(event.target.value)}><option value="">전체 출처</option>{sources.map((item) => <option key={item}>{item}</option>)}</SelectInput></label></div></div>
    <details className="dataset-provenance"><summary>데이터 출처와 표시 기준<ChevronDown size={13} aria-hidden/></summary><p>{names.length ? `${names.join(' · ')} · ` : ''}저장된 스냅샷을 조회합니다. 회원 사건은 작성자가 관리하며, 공개·가상 수집 자료는 읽기 전용입니다. 가상 생성 사건은 가상 데이터 필터에 포함됩니다.</p>{dates.length > 0 && <p>관측 기간 {formatDate(dates[0])} – {formatDate(dates[dates.length - 1])}{snapshots.length ? ` · 수집 ${formatDateTime(snapshots[snapshots.length - 1])} KST` : ''}{sourceUrl && <> · <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline">원본 출처 확인</a></>}</p>}<p>지도는 0–100으로 정규화한 가상 구역이며 실제 지형과 구분합니다. 원본 위도·경도는 상세 패널에서 확인할 수 있습니다. 공개 관측의 상태는 조회용 표시값이며 실제 대응 진행·완료를 뜻하지 않습니다.</p></details>
    {status === 'error' && <p className="app-error-banner mx-4 mb-4" role="alert">외부 분석 데이터 조회 실패: {error} 회원 사건은 계속 사용할 수 있습니다.</p>}
    {status === 'ready' && !imported.length && <p className="data-caption px-5 pb-4">아직 가져온 공개·가상 데이터가 없습니다.</p>}
  </section>;
}
