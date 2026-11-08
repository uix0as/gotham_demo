import { formatMinutes, minutesBetween, toTime } from '@/utils/date';
/**
 * 규칙 기반 연관 분석 엔진 (AI 미사용).
 *
 * 규칙
 *  1. 두 사건의 발생 구역(sector)이 같다.
 *  2. 두 사건의 발생 시각 차이가 windowMinutes 이하이다.
 *  → 두 조건을 모두 만족하면 "연관 후보" 로 연결한다.
 *
 * 결과는 데이터상의 시공간적 근접성일 뿐이며, 원인 관계나 위험도를 판단하지 않는다.
 */
export const ruleBasedEngine = {
    id: 'rule-sector-time-v1',
    label: '규칙 기반 (구역·시간 근접)',
    kind: 'rule-based',
    description: '같은 구역에서 지정한 시간 범위 이내에 발생한 사건을 연관 후보로 연결합니다.',
    analyze(events, options) {
        const windowMinutes = Math.max(0, options.windowMinutes);
        const links = [];
        // 구역별로 묶은 뒤 시간순 정렬 → 슬라이딩 비교 (O(n log n + k))
        const bySector = new Map();
        for (const e of events) {
            const list = bySector.get(e.sector) ?? [];
            list.push(e);
            bySector.set(e.sector, list);
        }
        for (const [sector, list] of bySector) {
            list.sort((a, b) => toTime(a.occurred_at) - toTime(b.occurred_at) || a.event_id - b.event_id);
            for (let i = 0; i < list.length; i++) {
                for (let j = i + 1; j < list.length; j++) {
                    const diff = minutesBetween(list[i].occurred_at, list[j].occurred_at);
                    if (diff > windowMinutes)
                        break;
                    const a = list[i];
                    const b = list[j];
                    const reasons = [`같은 구역 ${sector}`, `발생 시각 차이 ${formatMinutes(diff)} (기준 ${windowMinutes}분 이내)`];
                    if (a.source_type !== b.source_type)
                        reasons.push(`서로 다른 출처 (${a.source_type} · ${b.source_type})`);
                    links.push({
                        key: [a.event_id, b.event_id].sort((x, y) => x - y).join('-'),
                        source: a.event_id,
                        target: b.event_id,
                        sector,
                        diff_minutes: Math.round(diff),
                        reasons,
                    });
                }
            }
        }
        // 인접 리스트
        const adjacency = new Map();
        for (const l of links) {
            adjacency.set(l.source, [...(adjacency.get(l.source) ?? []), l.target]);
            adjacency.set(l.target, [...(adjacency.get(l.target) ?? []), l.source]);
        }
        // Union-Find 로 연결 요소(묶음) 계산
        const parent = new Map();
        const find = (x) => {
            let r = x;
            while (parent.get(r) !== r)
                r = parent.get(r);
            let c = x;
            while (parent.get(c) !== r) {
                const n = parent.get(c);
                parent.set(c, r);
                c = n;
            }
            return r;
        };
        for (const l of links) {
            if (!parent.has(l.source))
                parent.set(l.source, l.source);
            if (!parent.has(l.target))
                parent.set(l.target, l.target);
            const ra = find(l.source);
            const rb = find(l.target);
            if (ra !== rb)
                parent.set(rb, ra);
        }
        const groups = new Map();
        for (const id of parent.keys()) {
            const r = find(id);
            groups.set(r, [...(groups.get(r) ?? []), id]);
        }
        const byId = new Map(events.map((e) => [e.event_id, e]));
        const clusters = [...groups.values()]
            .map((ids) => {
            const evs = ids.map((id) => byId.get(id)).sort((a, b) => toTime(a.occurred_at) - toTime(b.occurred_at));
            const idSet = new Set(ids);
            const start = evs[0].occurred_at;
            const end = evs[evs.length - 1].occurred_at;
            return {
                id: `${evs[0].sector}:${evs.map((e) => e.event_id).join(',')}`,
                sector: evs[0].sector,
                event_ids: evs.map((e) => e.event_id),
                start,
                end,
                span_minutes: Math.round(minutesBetween(start, end)),
                link_count: links.filter((l) => idSet.has(l.source)).length,
            };
        })
            .sort((a, b) => b.event_ids.length - a.event_ids.length || toTime(b.start) - toTime(a.start));
        return {
            engine: { id: this.id, label: this.label, kind: this.kind },
            options: { windowMinutes },
            links,
            clusters,
            adjacency,
        };
    },
};
