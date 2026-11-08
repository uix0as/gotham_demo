export const SECTORS = [
    {
        id: 'A-1',
        name: '북서 관측구역',
        polygon: [[0, 0], [27, 0], [26, 22], [29, 50], [0, 47]],
        label: [13, 6],
        anchor: [14, 24],
    },
    {
        id: 'B-1',
        name: '중앙 통신구역',
        polygon: [[27, 0], [66, 0], [68, 45], [57, 48], [29, 50], [26, 22]],
        label: [46, 6],
        anchor: [47, 24],
    },
    {
        id: 'B-2',
        name: '북동 레이더구역',
        polygon: [[66, 0], [100, 0], [100, 49], [68, 45]],
        label: [83, 6],
        anchor: [84, 24],
    },
    {
        id: 'C-1',
        name: '서부 보급구역',
        polygon: [[0, 47], [29, 50], [31, 76], [30, 100], [0, 100]],
        label: [14, 54],
        anchor: [15, 75],
    },
    {
        id: 'A-2',
        name: '중앙 기동구역',
        polygon: [[29, 50], [57, 48], [60, 72], [60, 100], [30, 100], [31, 76]],
        label: [44, 54],
        anchor: [45, 76],
    },
    {
        id: 'C-3',
        name: '동부 지원구역',
        polygon: [[57, 48], [68, 45], [100, 49], [100, 100], [60, 100], [60, 72]],
        label: [80, 54],
        anchor: [80, 76],
    },
];
export const SECTOR_IDS = SECTORS.map((s) => s.id);
export function getSector(id) {
    return SECTORS.find((s) => s.id === id);
}
/** Ray casting point-in-polygon */
export function pointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
        if (intersect)
            inside = !inside;
    }
    return inside;
}
/** 좌표가 속한 구역 ID (경계선 위 등 판별 불가 시 null) */
export function sectorAt(x, y) {
    const hit = SECTORS.find((s) => pointInPolygon(x, y, s.polygon));
    return hit ? hit.id : null;
}
export function polygonPoints(polygon) {
    return polygon.map(([x, y]) => `${x},${y}`).join(' ');
}
/** 구역 내부의 무작위 좌표 (가상 이벤트 생성용) */
export function randomPointInSector(id, rand = Math.random) {
    const sector = getSector(id);
    if (!sector)
        return [50, 50];
    const xs = sector.polygon.map((p) => p[0]);
    const ys = sector.polygon.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    for (let i = 0; i < 200; i++) {
        const x = Math.round(minX + 4 + rand() * (maxX - minX - 8));
        const y = Math.round(minY + 5 + rand() * (maxY - minY - 10));
        // 경계에서 너무 가까운 좌표를 피하기 위해 주변 4점도 같은 구역인지 확인
        if ([[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]].every(([dx, dy]) => sectorAt(x + dx, y + dy) === id)) {
            return [x, y];
        }
    }
    return sector.anchor;
}
