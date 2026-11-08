/**
 * UI 표시 제어용 권한 검사.
 * ⚠️ 보안 경계가 아닙니다. 실제 권한은 백엔드가 검증한 JWT의 회원 ID로 반드시 재검증합니다.
 */
export function canModifyEvent(event, user) {
    return event.member_id > 0 && !!user && user.member_id === event.member_id;
}
