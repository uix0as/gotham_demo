/**
 * 날짜/시간 유틸리티.
 * 모든 API 날짜는 ISO 8601 + 오프셋(예: 2026-11-05T14:20:00+09:00) 형식이며,
 * 화면 표시는 한국 표준시(Asia/Seoul, UTC+09:00) 기준입니다.
 */
const TZ = 'Asia/Seoul';
const KST_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
function kstParts(date) {
    const parts = KST_FORMATTER.formatToParts(date);
    const get = (t) => parts.find((p) => p.type === t)?.value ?? '00';
    return { y: get('year'), m: get('month'), d: get('day'), hh: get('hour'), mm: get('minute'), ss: get('second') };
}
/** Date → "YYYY-MM-DDTHH:mm:ss+09:00" */
export function toKstIso(date) {
    const p = kstParts(date);
    return `${p.y}-${p.m}-${p.d}T${p.hh}:${p.mm}:${p.ss}+09:00`;
}
export function nowKstIso() {
    return toKstIso(new Date());
}
/** ISO → <input type="datetime-local"> 값 ("YYYY-MM-DDTHH:mm", KST) */
export function isoToLocalInput(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '';
    const p = kstParts(d);
    return `${p.y}-${p.m}-${p.d}T${p.hh}:${p.mm}`;
}
/** <input type="datetime-local"> 값(KST로 간주) → ISO */
export function localInputToIso(value) {
    if (!value)
        return '';
    const withSeconds = value.length === 16 ? `${value}:00` : value;
    return `${withSeconds}+09:00`;
}
export function toTime(iso) {
    return new Date(iso).getTime();
}
/** "2026.11.05 14:20" */
export function formatDateTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '-';
    const p = kstParts(d);
    return `${p.y}.${p.m}.${p.d} ${p.hh}:${p.mm}`;
}
/** "2026.11.05" */
export function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '-';
    const p = kstParts(d);
    return `${p.y}.${p.m}.${p.d}`;
}
/** "14:20" */
export function formatTime(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return '--:--';
    const p = kstParts(d);
    return `${p.hh}:${p.mm}`;
}
/** KST 기준 시(0~23) */
export function kstHour(iso) {
    return Number(kstParts(new Date(iso)).hh);
}
/** 두 시각의 차이(분, 절댓값) */
export function minutesBetween(a, b) {
    return Math.abs(toTime(a) - toTime(b)) / 60000;
}
/** "3분 전", "2시간 전" 형식 */
export function formatRelative(iso, now = Date.now()) {
    const diff = now - toTime(iso);
    if (Number.isNaN(diff))
        return '-';
    const abs = Math.abs(diff);
    const suffix = diff >= 0 ? '전' : '후';
    const min = Math.round(abs / 60000);
    if (min < 1)
        return '방금';
    if (min < 60)
        return `${min}분 ${suffix}`;
    const hr = Math.round(min / 60);
    if (hr < 24)
        return `${hr}시간 ${suffix}`;
    const day = Math.round(hr / 24);
    return `${day}일 ${suffix}`;
}
/** 분 차이를 "8분", "1시간 5분" 으로 */
export function formatMinutes(min) {
    const m = Math.round(min);
    if (m < 60)
        return `${m}분`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h}시간 ${r}분` : `${h}시간`;
}
