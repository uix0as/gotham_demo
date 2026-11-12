import axios from 'axios';
import { ApiError, notifyAuthExpired } from './errors';
import { toEvent, toEventWithAuthor, toMember, toMemberSummary, toNote } from './mappers';
/**
 * httpApi — 실제 Node.js/Express 백엔드 연결용 구현.
 * - 모든 요청에 withCredentials: true (HttpOnly JWT 쿠키 전송)
 * - 응답 봉투 { data } / { error } 를 해석해 ApiError 로 변환
 * - 401 수신 시 전역 'auth-expired' 이벤트 발생 → AuthContext 가 로그아웃 처리
 *
 * 규격: docs/API_CONTRACT.md
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');
const client = axios.create({ baseURL: BASE_URL, withCredentials: true, timeout: 15000, validateStatus: () => true });
const STATUS_CODE = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
};
const DEFAULT_MESSAGE = {
    VALIDATION_ERROR: '입력값을 확인해 주세요.',
    UNAUTHORIZED: '로그인이 필요합니다.',
    FORBIDDEN: '이 작업을 수행할 권한이 없습니다.',
    NOT_FOUND: '요청한 데이터를 찾을 수 없습니다.',
    CONFLICT: '이미 존재하는 데이터입니다.',
    INTERNAL_ERROR: '서버 오류가 발생했습니다.',
};
async function request(method, path, opts = {}) {
    let res;
    try {
        res = await client.request({ method, url: path, data: opts.body, headers: { Accept: 'application/json' } });
    }
    catch {
        throw new ApiError(0, 'NETWORK_ERROR', `백엔드 서버(${BASE_URL})에 연결할 수 없습니다.`);
    }
    if (res.status === 204)
        return undefined;
    const payload = res.data;
    if (res.status < 200 || res.status >= 300) {
        const body = payload?.error;
        const code = body?.code ?? STATUS_CODE[res.status] ?? 'INTERNAL_ERROR';
        const message = body?.message ?? DEFAULT_MESSAGE[code] ?? `요청 실패 (HTTP ${res.status})`;
        if (res.status === 401 && !opts.silent401)
            notifyAuthExpired();
        throw new ApiError(res.status, code, message, body?.details);
    }
    if (payload && typeof payload === 'object' && 'data' in payload)
        return payload.data;
    throw new ApiError(res.status, 'INTERNAL_ERROR', '응답 형식이 올바르지 않습니다. ({ "data": ... } 필요)');
}
export const httpApi = {
    mode: 'api',
    analysis: { async list() { return (await request('GET', '/analysis-records')).map(toEvent); } },
    auth: {
        async signup(input) {
            return toMember(await request('POST', '/auth/signup', { body: input }));
        },
        async login(input) {
            return toMember(await request('POST', '/auth/login', { body: input, silent401: true }));
        },
        async logout() {
            await request('POST', '/auth/logout');
        },
        async me() {
            try {
                return toMember(await request('GET', '/auth/me', { silent401: true }));
            }
            catch (e) {
                if (e instanceof ApiError && e.status === 401)
                    return null;
                throw e;
            }
        },
    },
    members: {
        async updateMe(patch) {
            return toMember(await request('PATCH', '/members/me', { body: patch }));
        },
        async deleteMe() {
            await request('DELETE', '/members/me');
        },
        async myEventsWithAuthor() {
            return (await request('GET', '/members/me/events')).map(toEventWithAuthor);
        },
        async myNotes() {
            return (await request('GET', '/members/me/notes')).map(toNote);
        },
        async list() {
            return (await request('GET', '/members')).map(toMemberSummary);
        },
        async records(memberId) {
            const data = await request('GET', `/members/${memberId}/records`);
            return { member: toMember(data.member), incidents: data.incidents.map(toEventWithAuthor), notes: data.notes.map(toNote) };
        },
    },
    notes: {
        async list() {
            return (await request('GET', '/analysis-notes')).map(toNote);
        },
        async create(input) {
            return toNote(await request('POST', '/analysis-notes', { body: input }));
        },
        async update(noteId, patch) {
            return toNote(await request('PATCH', `/analysis-notes/${noteId}`, { body: patch }));
        },
        async remove(noteId) {
            await request('DELETE', `/analysis-notes/${noteId}`);
        },
    },
    events: {
        async list() {
            return (await request('GET', '/events')).map(toEvent);
        },
        async get(eventId) {
            return toEvent(await request('GET', `/events/${eventId}`));
        },
        async create(input) {
            return toEvent(await request('POST', '/events', { body: input }));
        },
        async update(eventId, patch) {
            return toEvent(await request('PATCH', `/events/${eventId}`, { body: patch }));
        },
        async remove(eventId) {
            await request('DELETE', `/events/${eventId}`);
        },
        async listWithAuthors() {
            return (await request('GET', '/events-with-authors')).map(toEventWithAuthor);
        },
    },
};
export const API_BASE_URL = BASE_URL;
