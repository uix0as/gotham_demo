import { RotateCcw, Search } from 'lucide-react';
import { EVENT_STATUSES } from '@/domain';
import { EVENT_TYPES } from '@/utils/constants';
import { SECTOR_IDS } from '@/utils/sectors';
import { SelectInput } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
export const SORT_LABELS = { occurred_desc: '발생 시각 최신순', occurred_asc: '발생 시각 오래된순', created_desc: '등록 최신순' };
export function EventFilters({ value, onChange, onReset, types, canFilterMine }) {
    const typeOptions = [...new Set([...EVENT_TYPES, ...types])];
    const dirty = value.q || value.status || value.type || value.sector || value.mine || value.sort !== 'occurred_desc';
    return <div className="filter-row">
    <div className="data-search"><Search aria-hidden/><input type="search" value={value.q} onChange={(event) => onChange({ q: event.target.value })} placeholder="사건명, 유형, 구역, 출처 검색..." aria-label="키워드 검색" className="input"/></div>
    <div className="filter-selects"><SelectInput aria-label="처리 상태 필터" value={value.status} onChange={(event) => onChange({ status: event.target.value })}><option value="">모든 상태</option>{EVENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</SelectInput><SelectInput aria-label="사건 유형 필터" value={value.type} onChange={(event) => onChange({ type: event.target.value })}><option value="">모든 유형</option>{typeOptions.map((type) => <option key={type}>{type}</option>)}</SelectInput><SelectInput aria-label="발생 구역 필터" value={value.sector} onChange={(event) => onChange({ sector: event.target.value })}><option value="">모든 구역</option>{SECTOR_IDS.map((sector) => <option key={sector}>{sector}</option>)}</SelectInput><SelectInput aria-label="정렬" value={value.sort} onChange={(event) => onChange({ sort: event.target.value })}>{Object.keys(SORT_LABELS).map((key) => <option key={key} value={key}>{SORT_LABELS[key]}</option>)}</SelectInput></div>
    <div className="filter-actions">{canFilterMine && <label className="app-checkbox"><input type="checkbox" checked={value.mine} onChange={(event) => onChange({ mine: event.target.checked })}/>내가 작성한 사건</label>}<Button variant="ghost" size="sm" icon={<RotateCcw size={14}/>} onClick={onReset} disabled={!dirty}>초기화</Button></div>
  </div>;
}
