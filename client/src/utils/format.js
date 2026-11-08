export function padId(id, len = 4) {
    return String(id).padStart(len, '0');
}
/** Display the record title without repeating the seeded training identifier. */
export function displayEventTitle(title) {
    return title.replace(/^\[가상 훈련 \d+\]\s*/, '');
}
/** 사건번호 표기: EV-0001 */
export function eventCode(id) {
    return id < 0 ? `EXT-${padId(Math.abs(id), 5)}` : `EV-${padId(id)}`;
}
/** 회원번호 표기: M-001 */
export function memberCode(id) {
    return `M-${padId(id, 3)}`;
}
export function cx(...classes) {
    return classes.filter(Boolean).join(' ');
}
