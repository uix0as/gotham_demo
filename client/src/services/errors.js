/** 서비스 계층에서 던지는 표준 오류. UI 는 이 클래스만 처리하면 됩니다. */
export class ApiError extends Error {
    status;
    code;
    details;
    constructor(status, code, message, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
export function isApiError(e) {
    return e instanceof ApiError;
}
/** 사용자에게 보여줄 오류 메시지 */
export function errorMessage(e, fallback = '요청을 처리하지 못했습니다.') {
    if (isApiError(e))
        return e.message;
    if (e instanceof Error && e.message)
        return e.message;
    return fallback;
}
/** 401 발생 시 전역으로 알리는 이벤트 이름 (AuthContext 가 구독) */
export const AUTH_EXPIRED_EVENT = 'dnx:auth-expired';
export function notifyAuthExpired() {
    if (typeof window !== 'undefined')
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}
