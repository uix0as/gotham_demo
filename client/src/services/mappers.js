import { EVENT_STATUSES, EVENT_SEVERITIES } from '@/domain';
/**
 * 응답 정규화 — 데이터 변환은 서비스 계층에서만 수행합니다.
 * 백엔드(MySQL2)가 DATETIME 을 "2026-11-05 14:20:00" 처럼 오프셋 없이 보내거나,
 * BIGINT 를 문자열로 보내더라도 UI 타입과 일치하도록 맞춥니다.
 */
const NAIVE_DT = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?(\.\d+)?$/;
/** 오프셋 없는 DATETIME 은 KST(+09:00)로 간주 */
export function normalizeDateTime(value) {
    if (value instanceof Date)
        return value.toISOString();
    const s = String(value ?? '');
    const m = s.match(NAIVE_DT);
    if (m)
        return `${m[1]}T${m[2]}${m[3] ?? ':00'}+09:00`;
    return s;
}
function num(v) {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}
function status(v) {
    return EVENT_STATUSES.includes(String(v)) ? v : '접수';
}
export function toMember(raw) {
    return {
        member_id: num(raw.member_id),
        nickname: String(raw.nickname ?? ''),
        email: String(raw.email ?? ''),
        created_at: normalizeDateTime(raw.created_at),
        updated_at: normalizeDateTime(raw.updated_at ?? raw.created_at),
    };
}
export function toEvent(raw) {
    return {
        event_id: num(raw.event_id),
        data_source: raw.data_source === 'external' || raw.data_source === 'synthetic' ? raw.data_source : (num(raw.event_id) < 0 ? 'external' : 'manual'),
        source_name: typeof raw.source_name === 'string' ? raw.source_name : undefined,
        source_url: typeof raw.source_url === 'string' ? raw.source_url : undefined,
        dataset_url: typeof raw.dataset_url === 'string' ? raw.dataset_url : undefined,
        source_license: typeof raw.source_license === 'string' ? raw.source_license : undefined,
        contributor: typeof raw.contributor === 'string' ? raw.contributor : undefined,
        is_synthetic: raw.is_synthetic === true || raw.is_synthetic === 1 || raw.is_synthetic === '1',
        latitude: raw.latitude == null ? null : num(raw.latitude),
        longitude: raw.longitude == null ? null : num(raw.longitude),
        magnitude: raw.magnitude == null ? null : num(raw.magnitude),
        imported_at: raw.imported_at ? normalizeDateTime(raw.imported_at) : undefined,
        collected_at: raw.collected_at ? normalizeDateTime(raw.collected_at) : undefined,
        member_id: num(raw.member_id),
        title: String(raw.title ?? ''),
        severity: EVENT_SEVERITIES.includes(raw.severity) ? raw.severity : '보통',
        source_type: String(raw.source_type ?? ''),
        event_type: String(raw.event_type ?? ''),
        sector: String(raw.sector ?? ''),
        map_x: num(raw.map_x),
        map_y: num(raw.map_y),
        description: String(raw.description ?? ''),
        status: status(raw.status),
        occurred_at: normalizeDateTime(raw.occurred_at),
        created_at: normalizeDateTime(raw.created_at),
        updated_at: normalizeDateTime(raw.updated_at ?? raw.created_at),
    };
}
export function toEventWithAuthor(raw) {
    return { ...toEvent(raw), nickname: String(raw.nickname ?? raw.username ?? ''), username: String(raw.username ?? raw.nickname ?? ''), email: String(raw.email ?? '') };
}
