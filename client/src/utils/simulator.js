import { nowKstIso } from './date';
import { SECTOR_IDS, randomPointInSector } from './sectors';
const TEMPLATES = [
    { source_type: '가상 기상센서', event_type: '강풍 관측', texts: ['순간 풍속 {n}m/s 관측', '돌풍 경보 기준값 근접 ({n}m/s)'] },
    { source_type: '가상 기상센서', event_type: '시정 악화', texts: ['시정 {n}00m 이하 안개 관측', '저시정 상태 지속 감지'] },
    { source_type: '가상 장비센서', event_type: '전원 이상', texts: ['가상 발전기 출력 변동 ±{n}% 감지', '배터리 전압 저하 경고 ({n}% 잔량)'] },
    { source_type: '가상 장비센서', event_type: '센서 연결 오류', texts: ['가상 감지센서 하트비트 {n}회 누락', '센서 게이트웨이 응답 지연 {n}초'] },
    { source_type: '가상 레이더', event_type: '레이더 신호 감쇠', texts: ['반사 신호 세기 {n}dB 저하', '특정 방위각 구간 잡음 증가'] },
    { source_type: '훈련 상황보고', event_type: '통신 장애', texts: ['분대 간 음성 통신 간헐적 두절', '데이터 링크 지연 {n}초 보고'] },
    { source_type: '훈련 상황보고', event_type: '장비 점검', texts: ['현장 장비 점검 착수', '예비 장비로 전환 후 점검 진행'] },
    { source_type: '훈련 상황보고', event_type: '통신 복구', texts: ['예비 경로로 통신 복구 확인', '중계기 재부팅 후 정상화'] },
];
export const SIMULATED_TAG = '[가상 생성]';
export function isSimulatedEvent(e) {
    return e.description.startsWith(SIMULATED_TAG);
}
/**
 * 규칙
 *  - 템플릿(출처·유형 쌍) 중 하나를 고른다.
 *  - 60% 확률로 가장 최근 사건의 구역을 재사용 → 연관 분석 시연용 근접 사건 생성
 *  - 좌표는 해당 구역 다각형 내부에서 선택
 *  - 발생 시각은 현재 시각(KST), 상태는 '접수'
 */
export function generateSimulatedEvent(existing, rand = Math.random) {
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const t = pick(TEMPLATES);
    const latest = [...existing].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
    const sector = latest && rand() < 0.6 ? latest.sector : pick(SECTOR_IDS);
    const [map_x, map_y] = randomPointInSector(sector, rand);
    const n = 2 + Math.floor(rand() * 16);
    const text = pick(t.texts).replace('{n}', String(n));
    return {
        title: `${sector} ${t.event_type} 가상 보고`,
        severity: '보통',
        source_type: t.source_type,
        event_type: t.event_type,
        sector,
        map_x,
        map_y,
        description: `${SIMULATED_TAG} ${sector} 구역 ${text}. 규칙 기반 시뮬레이터가 생성한 가상 훈련 데이터입니다.`,
        status: '접수',
        occurred_at: nowKstIso(),
    };
}
