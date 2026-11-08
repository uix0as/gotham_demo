import { EVENT_STATUSES, EVENT_SEVERITIES } from '@/domain';
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20; // members.username VARCHAR(40) 보다 보수적으로 제한
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const DESCRIPTION_MAX = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function validateNickname(nickname) {
    const v = nickname.trim();
    if (!v)
        return '아이디를 입력해 주세요.';
    if (v.length < NICKNAME_MIN || v.length > NICKNAME_MAX)
        return `아이디은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`;
    if (!/^[가-힣a-zA-Z0-9_\-\s]+$/.test(v))
        return '아이디은 한글, 영문, 숫자, 공백, -, _ 만 사용할 수 있습니다.';
    return undefined;
}
export function validateEmail(email) {
    const v = email.trim();
    if (!v)
        return '이메일을 입력해 주세요.';
    if (v.length > 255)
        return '이메일이 너무 깁니다.';
    if (!EMAIL_RE.test(v))
        return '올바른 이메일 형식이 아닙니다.';
    return undefined;
}
export function validatePassword(password) {
    if (!password)
        return '비밀번호를 입력해 주세요.';
    if (password.length < PASSWORD_MIN)
        return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 합니다.`;
    if (new TextEncoder().encode(password).length > 72)
        return '비밀번호는 UTF-8 기준 72바이트 이하여야 합니다.';
    if (password.length > PASSWORD_MAX)
        return `비밀번호는 ${PASSWORD_MAX}자 이하여야 합니다.`;
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
        return '영문과 숫자를 모두 포함해 주세요.';
    return undefined;
}
export function validateSignup(form) {
    const errors = {};
    const n = validateNickname(form.nickname);
    if (n)
        errors.nickname = n;
    const e = validateEmail(form.email);
    if (e)
        errors.email = e;
    const p = validatePassword(form.password);
    if (p)
        errors.password = p;
    if (!form.passwordConfirm)
        errors.passwordConfirm = '비밀번호 확인을 입력해 주세요.';
    else if (form.password !== form.passwordConfirm)
        errors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    return errors;
}
function isInt(n) {
    return typeof n === 'number' && Number.isInteger(n);
}
/** 상황정보 입력 검증 — 폼과 mockApi(서버 측 검증 시뮬레이션)에서 공유 */
export function validateEventInput(input, partial = false) {
    const errors = {};
    const need = (k) => !partial || input[k] !== undefined;
    if (need('title')) {
        const v = (input.title ?? '').trim();
        if (!v || v.length > 150)
            errors.title = '사건명은 1~150자로 입력해 주세요.';
    }
    if (need('severity') && !EVENT_SEVERITIES.includes(input.severity))
        errors.severity = '중요도를 선택해 주세요.';
    if (need('source_type')) {
        const v = (input.source_type ?? '').trim();
        if (!v)
            errors.source_type = '정보 출처를 선택해 주세요.';
        else if (v.length > 30)
            errors.source_type = '정보 출처는 30자 이하여야 합니다.';
    }
    if (need('event_type')) {
        const v = (input.event_type ?? '').trim();
        if (!v)
            errors.event_type = '사건 유형을 선택해 주세요.';
        else if (v.length > 50)
            errors.event_type = '사건 유형은 50자 이하여야 합니다.';
    }
    if (need('sector')) {
        const v = (input.sector ?? '').trim();
        if (!v)
            errors.sector = '발생 구역을 선택해 주세요.';
        else if (v.length > 20)
            errors.sector = '구역 코드는 20자 이하여야 합니다.';
    }
    if (need('map_x') && (!isInt(input.map_x) || input.map_x < 0 || input.map_x > 100))
        errors.map_x = 'X좌표는 0~100 사이의 정수여야 합니다.';
    if (need('map_y') && (!isInt(input.map_y) || input.map_y < 0 || input.map_y > 100))
        errors.map_y = 'Y좌표는 0~100 사이의 정수여야 합니다.';
    if (need('description')) {
        const v = (input.description ?? '').trim();
        if (!v)
            errors.description = '상세 설명을 입력해 주세요.';
        else if (v.length < 5)
            errors.description = '상세 설명은 5자 이상 입력해 주세요.';
        else if (v.length > DESCRIPTION_MAX)
            errors.description = `상세 설명은 ${DESCRIPTION_MAX}자 이하여야 합니다.`;
    }
    if (need('status') && !EVENT_STATUSES.includes(input.status))
        errors.status = '처리 상태가 올바르지 않습니다.';
    if (need('occurred_at')) {
        const v = input.occurred_at ?? '';
        if (!v || Number.isNaN(new Date(v).getTime()))
            errors.occurred_at = '발생 시각을 입력해 주세요.';
    }
    return errors;
}
export function hasErrors(errors) {
    return Object.values(errors).some(Boolean);
}
