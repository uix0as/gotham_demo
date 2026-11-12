import { useState } from 'react';
import { ArrowUpRight, Database, FileCheck2, FlaskConical, Globe2, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEvents } from '@/context/EventsContext';
import { formatDateTime } from '@/utils/date';
import { safeSourceUrl } from '@/utils/datasets';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmptyState, SkeletonRows } from '@/components/ui/States';
export default function Sources() {
    const { analysisEvents, events, status, datasetStatus, datasetError, reloadDataset } = useEvents();
    const [refreshing, setRefreshing] = useState(false);
    const imported = analysisEvents.filter((event) => event.event_id < 0);
    const names = [...new Set(imported.map((event) => event.source_name || event.source_type))];
    const sources = names.map((name) => {
        const records = imported.filter((event) => (event.source_name || event.source_type) === name);
        return { name, count: records.length, example: records[0], synthetic: records[0]?.is_synthetic || records[0]?.data_source === 'synthetic' };
    });
    const publicCount = imported.filter((event) => !event.is_synthetic && event.data_source !== 'synthetic').length;
    return <div className="workspace-page sources-page">
    <PageHeader code="SYS-SRC" title="데이터 소스" description="회원 사건과 공개 관측을 구분하고, 자료의 출처와 수집 시점을 확인합니다." actions={<Button disabled={refreshing} icon={<RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/>} onClick={async () => {
                setRefreshing(true);
                try {
                    await reloadDataset();
                }
                finally {
                    setRefreshing(false);
                }
            }}>출처 다시 조회</Button>}/>
    <div className="summary-strip is-three"><KpiCard label="회원 사건" value={events.length} icon={<Database />} caption="회원이 작성한 가상 훈련 자료" loading={status === 'loading'}/><KpiCard label="공개 관측" value={publicCount} icon={<Globe2 />} caption="저장된 USGS 관측 스냅샷" loading={datasetStatus === 'loading'}/><KpiCard label="가상 분석 데이터" value={imported.length - publicCount} icon={<FlaskConical />} caption="교육용 합성 자료 · 읽기 전용" loading={datasetStatus === 'loading'}/></div>
    <Panel title="연결된 데이터 소스" icon={<Globe2 />} actions={<span className="data-caption">{sources.length}개 출처</span>} bodyClassName="p-0">
      {datasetError && <p role="alert" className="app-error-banner mx-4 my-4">데이터를 불러오지 못했습니다. 출처를 다시 조회해 주세요.</p>}
      {datasetStatus === 'loading' ? <SkeletonRows rows={3}/> : !sources.length ? <EmptyState title="가져온 분석 데이터가 없습니다" message="회원 사건은 상황정보 메뉴에서 확인할 수 있습니다."/> : <div className="source-list">{sources.map((source) => {
                const href = safeSourceUrl(source.example.dataset_url || source.example.source_url);
                return <article key={source.name}><span className={`source-list-icon ${source.synthetic ? 'synthetic' : ''}`} aria-hidden>{source.synthetic ? <FlaskConical size={21}/> : <Globe2 size={21}/>}</span><div><h3>{source.name}<span className="app-badge app-sector">{source.synthetic ? '가상 데이터' : '공개 관측'}</span></h3><p>{source.example.imported_at ? `가져온 시각 ${formatDateTime(source.example.imported_at)}` : '저장된 분석 데이터'} · 읽기 전용</p>{source.example.source_license && <small>{source.example.source_license}</small>}</div><strong>{source.count.toLocaleString()}<small>건</small></strong>{href && <a href={href} target="_blank" rel="noreferrer" className="app-button">원본 열기<ArrowUpRight size={15}/></a>}</article>;
            })}</div>}
    </Panel>
    <Panel title="자료 구분과 사용 범위" icon={<FileCheck2 />} bodyClassName="p-0"><div className="source-category-notes"><section><h3>회원 사건</h3><p>회원이 직접 작성한 가상 훈련 사건입니다. 로그인한 작성자만 수정·삭제할 수 있습니다.</p></section><section><h3>공개 관측</h3><p>USGS 공개 자료를 저장한 스냅샷입니다. 실제 위도·경도, 규모, 출처는 상세 정보에 별도로 표시됩니다.</p></section><section><h3>가상 분석 데이터</h3><p>교육용으로 만든 합성 자료입니다. 실제 관측을 의미하지 않으며 읽기 전용으로 제공합니다.</p></section></div></Panel>
    <div className="source-notes"><section><ShieldCheck size={21}/><h2>지도와 실제 위치를 구분하세요</h2><p>지도는 실제 지형을 나타내지 않는 6개 가상 훈련구역입니다. 공개 관측의 표시 좌표는 정규화한 값이며 원본 좌표와 구분합니다.</p></section><section><FileCheck2 size={21}/><h2>관측 상태는 분석용 표시값입니다</h2><p>공개 관측의 처리 상태는 실제 대응 상태를 의미하지 않습니다. 구역과 시간으로 연결한 연관 후보도 원인 관계나 위험성을 뜻하지 않습니다.</p></section></div>
    <p className="source-connection-status"><span className={`health-dot${status === 'ready' ? '' : ' muted'}`}/>{status === 'ready' ? '회원 사건 데이터 연결 정상' : '회원 사건 데이터를 확인하는 중입니다.'}</p>
  </div>;
}
