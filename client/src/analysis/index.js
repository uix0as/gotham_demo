import { minutesBetween } from '@/utils/date';
import { ruleBasedEngine } from './ruleBasedEngine';
export { ruleBasedEngine };
/** 현재 활성 엔진. 추후 다른 엔진(예: 서버 AI 분석)을 추가하면 여기서 교체합니다. */
export const correlationEngine = ruleBasedEngine;
/** 특정 사건의 연관 후보 목록 (상세 패널용) */
export function findRelatedEvents(target, events, windowMinutes) {
    return events
        .filter((e) => e.event_id !== target.event_id && e.sector === target.sector)
        .map((e) => ({ event: e, diff_minutes: Math.round(minutesBetween(e.occurred_at, target.occurred_at)) }))
        .filter((r) => r.diff_minutes <= windowMinutes)
        .sort((a, b) => a.diff_minutes - b.diff_minutes);
}
