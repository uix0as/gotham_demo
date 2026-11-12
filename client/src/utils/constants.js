/** 정보 출처(source_type) 선택지 — 모두 가상 데이터 소스 */
export const SOURCE_TYPES = ['훈련 상황보고', '가상 기상센서', '가상 장비센서', '가상 레이더'];
/** 사건 유형(event_type) 선택지 */
export const EVENT_TYPES = [
    '통신 장애',
    '통신 복구',
    '강풍 관측',
    '시정 악화',
    '전원 이상',
    '장비 점검',
    '센서 연결 오류',
    '레이더 신호 감쇠',
];
/** 상태별 표현 — 색 + 모양(마커) + 라벨로 이중 인코딩 */
export const STATUS_META = {
    접수: {
        label: '접수',
        color: 'rgb(var(--warn-rgb))',
        text: 'text-warn',
        bg: 'bg-warn-muted',
        border: 'border-warn/40',
        shape: 'circle',
        hint: '검토 필요',
    },
    '검토 중': {
        label: '검토 중',
        color: 'rgb(var(--info-rgb))',
        text: 'text-info',
        bg: 'bg-info-muted',
        border: 'border-info/40',
        shape: 'diamond',
        hint: '담당자 검토 진행',
    },
    '처리 완료': {
        label: '처리 완료',
        color: 'var(--teal)',
        text: 'text-ok',
        bg: 'bg-ok-muted',
        border: 'border-ok/40',
        shape: 'square',
        hint: '조치 종료',
    },
};
/**
 * 출처별 색 — 대시보드의 검정·청록 및 범주별 보조색.
 * 화면은 Lucide 출처 아이콘과 라벨을 함께 표시합니다. glyph는 이전 데이터 호환용입니다.
 */
export const SOURCE_META = {
    '훈련 상황보고': { color: '#5aa9d6', glyph: '보', short: '상황보고' },
    '가상 기상센서': { color: '#47b39a', glyph: '기', short: '기상센서' },
    '가상 장비센서': { color: '#8b9bd8', glyph: '장', short: '장비센서' },
    'USGS 지진 관측': { color: '#c99a4a', glyph: '지', short: 'USGS' },
    '가상 레이더': { color: '#9aa7b8', glyph: '레', short: '레이더' },
};
export const FALLBACK_SOURCE_META = { color: '#9aa7b8', glyph: '?', short: '기타' };
export function sourceMeta(source) {
    return SOURCE_META[source] ?? FALLBACK_SOURCE_META;
}
/** 연관 분석 시간 범위 선택지(분) */
export const CORRELATION_WINDOWS = [15, 30, 60];
export const DEFAULT_CORRELATION_WINDOW = 30;
export const APP_NAME = 'GOTHAM';
export const APP_SUBTITLE = '국방 훈련 정보 분석 시스템';
