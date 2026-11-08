import { httpApi } from './httpApi';
/** 모든 CRUD와 분석 데이터는 Express API → MySQL을 사용합니다. */
export const DATA_SOURCE = 'api';
export const api = httpApi;
export { ApiError, errorMessage, isApiError } from './errors';
export { API_BASE_URL } from './httpApi';
