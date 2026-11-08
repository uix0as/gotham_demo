import { getSector } from '@/utils/sectors';
export const GRAPH_W = 960;
export const GRAPH_H = 600;
const PAD = 70;
/**
 * 결정적(deterministic) force-directed 레이아웃.
 * - 노드는 자기 구역의 앵커(가상 지도상의 구역 위치)로 끌려가므로 그래프가 지리적 배치를 닮습니다.
 * - 연결선은 스프링, 모든 노드 쌍은 반발력.
 * 외부 라이브러리 없이 고정 반복 횟수로 계산하므로 같은 입력이면 항상 같은 결과가 나옵니다.
 */
export function computeLayout(events, links) {
    const nodes = [];
    const bySector = new Map();
    for (const e of events)
        bySector.set(e.sector, [...(bySector.get(e.sector) ?? []), e]);
    for (const [sectorId, list] of bySector) {
        const s = getSector(sectorId);
        const ax = ((s?.anchor[0] ?? 50) / 100) * (GRAPH_W - PAD * 2) + PAD;
        const ay = ((s?.anchor[1] ?? 50) / 100) * (GRAPH_H - PAD * 2) + PAD;
        const sorted = [...list].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at) || a.event_id - b.event_id);
        sorted.forEach((e, i) => {
            const angle = (i / Math.max(1, sorted.length)) * Math.PI * 2 + (e.event_id % 7) * 0.3;
            const r = 20 + (i % 3) * 14;
            nodes.push({ id: e.event_id, x: ax + Math.cos(angle) * r, y: ay + Math.sin(angle) * r, ax, ay });
        });
    }
    const idx = new Map(nodes.map((n, i) => [n.id, i]));
    const edges = links.map((l) => [idx.get(l.source), idx.get(l.target)]).filter(([a, b]) => a !== undefined && b !== undefined);
    const ITER = 260;
    const REPULSE = 4600;
    const SPRING = 0.04;
    const LEN = 108;
    const GRAVITY = 0.028;
    for (let it = 0; it < ITER; it++) {
        const cool = 1 - it / ITER;
        const fx = new Array(nodes.length).fill(0);
        const fy = new Array(nodes.length).fill(0);
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                let dx = nodes[i].x - nodes[j].x;
                let dy = nodes[i].y - nodes[j].y;
                let d2 = dx * dx + dy * dy;
                if (d2 < 0.01) {
                    dx = (i - j) * 0.1;
                    dy = 0.1;
                    d2 = 0.02;
                }
                const d = Math.sqrt(d2);
                const f = Math.min(REPULSE / d2, 16);
                fx[i] += (dx / d) * f;
                fy[i] += (dy / d) * f;
                fx[j] -= (dx / d) * f;
                fy[j] -= (dy / d) * f;
            }
        }
        for (const [a, b] of edges) {
            const dx = nodes[b].x - nodes[a].x;
            const dy = nodes[b].y - nodes[a].y;
            const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
            const f = (d - LEN) * SPRING;
            fx[a] += (dx / d) * f;
            fy[a] += (dy / d) * f;
            fx[b] -= (dx / d) * f;
            fy[b] -= (dy / d) * f;
        }
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            fx[i] += (n.ax - n.x) * GRAVITY;
            fy[i] += (n.ay - n.y) * GRAVITY;
            const step = 4 * cool + 0.4;
            const m = Math.sqrt(fx[i] * fx[i] + fy[i] * fy[i]) || 1;
            n.x += (fx[i] / m) * Math.min(m, step * 3);
            n.y += (fy[i] / m) * Math.min(m, step * 3);
            n.x = Math.max(PAD * 0.6, Math.min(GRAPH_W - PAD * 0.6, n.x));
            n.y = Math.max(PAD * 0.75, Math.min(GRAPH_H - PAD * 0.6, n.y));
        }
    }
    return new Map(nodes.map((n) => [n.id, n]));
}
/** 구역별 노드를 감싸는 원(배경 표시용) */
export function sectorHalos(events, layout) {
    const groups = new Map();
    for (const e of events) {
        const n = layout.get(e.event_id);
        if (n)
            groups.set(e.sector, [...(groups.get(e.sector) ?? []), n]);
    }
    return [...groups.entries()].map(([id, ns]) => {
        const cx = ns.reduce((a, n) => a + n.x, 0) / ns.length;
        const cy = ns.reduce((a, n) => a + n.y, 0) / ns.length;
        const r = Math.max(56, ...ns.map((n) => Math.hypot(n.x - cx, n.y - cy) + 40));
        return { id, cx, cy, r };
    });
}
