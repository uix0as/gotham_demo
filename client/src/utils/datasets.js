import { isSimulatedEvent } from './simulator';
export const DATASET_FILTERS = [
    { value: 'all', label: '전체' }, { value: 'manual', label: '회원 사건' },
    { value: 'external', label: '공개 데이터' }, { value: 'synthetic', label: '가상 데이터' },
];
export function recordGroup(event) {
    if (event.is_synthetic || event.data_source === 'synthetic' || isSimulatedEvent(event))
        return 'synthetic';
    return event.event_id < 0 || event.data_source === 'external' ? 'external' : 'manual';
}
export function isImportedRecord(event) { return event.event_id < 0; }
export function isFictionalRecord(event) {
    return recordGroup(event) === 'synthetic' || /^\[(가상|시뮬레이션)/.test(event.description);
}
export function filterDataset(events, filter) {
    return filter === 'all' ? events : events.filter((event) => recordGroup(event) === filter);
}
/** 렌더링 한도를 적용해도 선택한 사건은 항상 표시합니다. 통계는 원본 전체로 계산합니다. */
export function sampleForDisplay(events, limit, selectedId) {
    if (events.length <= limit)
        return events;
    const selected = events.find((e) => e.event_id === selectedId);
    const sample = events.slice(0, limit);
    if (selected && !sample.some((e) => e.event_id === selected.event_id))
        sample[limit - 1] = selected;
    return sample;
}
export function safeSourceUrl(value) {
    if (!value)
        return undefined;
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
    }
    catch {
        return undefined;
    }
}
