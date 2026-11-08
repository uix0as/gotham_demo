export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}

export function validationError(details) {
  if (Object.keys(details).length) throw new ApiError(400, 'VALIDATION_ERROR', '입력값을 확인해 주세요.', details);
}
