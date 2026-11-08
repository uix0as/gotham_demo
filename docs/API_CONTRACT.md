# API 규격

현재 기준은 Express 백엔드 구현입니다. 모든 경로 앞에 `/api`를 붙입니다. 개발 프론트는 Vite `/api` 프록시를 사용하며 Express는 기본 `5000`에서 실행합니다. 현재 Mac에서는 AirPlay 포트 충돌로 로컬 `.env`의 PORT를 `5001`, 프론트 `.env.local`의 API_PROXY_TARGET을 `http://localhost:5001`로 설정합니다. 학교용 기본값은 5000입니다.

## 응답과 오류

정상 응답은 `{ "data": ... }`이며 배열 조회는 `data` 자체가 배열입니다. 삭제·로그아웃은 성공 결과 객체를 반환합니다. 오류는 다음 형태입니다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해 주세요.",
    "details": { "title": "사건명을 입력해 주세요." }
  }
}
```

| HTTP | code | 의미 |
|---|---|---|
| 400 | VALIDATION_ERROR | 요청 본문·필드·사건 ID 오류 |
| 401 | UNAUTHORIZED / SESSION_EXPIRED | 로그인 필요, 유효하지 않거나 만료된 JWT |
| 401 | INVALID_CREDENTIALS | 이메일 또는 비밀번호 불일치 |
| 403 | FORBIDDEN | 작성자 불일치·허용하지 않은 출처의 변경 요청 |
| 404 | NOT_FOUND | 없는 사건·API |
| 409 | CONFLICT | 아이디 또는 이메일 중복 |
| 500 | INTERNAL_ERROR | 내부 오류. SQL·스택·비밀번호를 응답하지 않음 |

## 인증

`POST /auth/login`은 `bcrypt.compare()`로 비밀번호를 확인하고 JWT를 발급합니다. JWT는 `HttpOnly`, `SameSite=Lax`, `Path=/` 쿠키 **`dnx_token`**으로 전송합니다. HTTPS 운영 환경에서는 `Secure` 속성을 사용합니다. 프론트 Axios는 `withCredentials: true`로 요청합니다. 비밀키는 서버의 `JWT_SECRET`만 사용하며 브라우저에 전달하지 않습니다.

API 테스트용 `Authorization: Bearer <JWT>`도 지원합니다. 브라우저는 쿠키 방식을 사용합니다. 인증 미들웨어는 JWT 서명·만료·현재 회원 존재 여부를 검사합니다. 회원 탈퇴 후 남아 있는 JWT로 인증할 수 없습니다. 로그아웃은 쿠키를 만료시킵니다. 별도 서버 토큰 차단 목록은 두지 않으므로 탈취된 토큰을 만료 전에 개별 폐기하는 기능은 범위에 포함하지 않습니다.

쿠키를 쓰는 상태 변경 요청의 `Origin`을 서버 허용 목록과 비교합니다. 로컬 개발·동일 출처 시연 설정을 사용하며 CLI 등 Origin이 없는 요청도 허용합니다. 요청 JSON에 있는 `member_id`, `author_id`, `id`는 작성자 결정에 사용하지 않습니다.

## 회원

| Method | 경로 | 인증 | 요청 | 결과 |
|---|---|---|---|---|
| POST | `/auth/signup` | 공개 | nickname, email, password | 201 회원 생성 |
| POST | `/auth/login` | 공개 | email, password | 회원 + JWT 쿠키 |
| POST | `/auth/logout` | 선택 | 없음 | 쿠키 제거 |
| GET | `/auth/me` | 필요 | 없음 | 현재 회원 |
| PATCH | `/members/me` | 필요 | nickname, 선택 email | 수정된 회원 |
| DELETE | `/members/me` | 필요 | 없음 | 회원 및 작성 사건 삭제, 쿠키 제거 |

회원 응답에는 다음 공개 필드만 포함합니다. `password_hash`는 조회 응답에 포함하지 않습니다.

```json
{
  "data": {
    "member_id": 1,
    "username": "알파 관제관",
    "nickname": "알파 관제관",
    "email": "alpha@demo.local",
    "created_at": "2026-11-08T03:00:00.000Z",
    "updated_at": "2026-11-08T03:00:00.000Z"
  }
}
```

`nickname`은 기존 UI와의 호환 필드이며 DB `username`에 저장됩니다. 아이디와 이메일은 각각 UNIQUE입니다. 이메일은 소문자로 정규화합니다. 비밀번호는 영문·숫자를 포함한 8~64자이며 bcrypt가 처리하는 UTF-8 바이트 제한도 서버에서 검증합니다. 가입만으로 자동 로그인하지 않으며 로그인 화면으로 이동합니다.

## 사건

| Method | 경로 | 인증 | 결과 |
|---|---|---|---|
| GET | `/events` | 공개 | 전체 사건, 최신 발생 시각 순 |
| GET | `/events/:id` | 공개 | 단일 사건 |
| POST | `/events` | 필요 | 201 사건 생성 |
| PATCH | `/events/:id` | 작성자 | 변경된 사건 |
| DELETE | `/events/:id` | 작성자 | 삭제 성공 |
| GET | `/events-with-authors` | 공개 | 실제 MySQL INNER JOIN 결과 |

등록 요청 예시:

```json
{
  "title": "가상 중계기 통신 장애",
  "severity": "높음",
  "source_type": "훈련 상황보고",
  "event_type": "통신 장애",
  "sector": "A-2",
  "map_x": 35,
  "map_y": 60,
  "description": "[가상 훈련] 중계기 연결 상태 점검 요청",
  "status": "접수",
  "occurred_at": "2026-11-08T14:20:00+09:00"
}
```

수정은 같은 필드 중 변경할 항목만 전송합니다. 예를 들어 `{ "status": "검토 중" }`으로 상태를 변경합니다. 다른 회원의 사건을 수정·삭제하면 403, 없는 사건은 404입니다. 인증 없이 변경하면 401입니다.

| 필드 | 의미 |
|---|---|
| event_id | DB incidents.id, 양의 정수 |
| member_id | DB incidents.author_id, JWT에서 서버가 결정 |
| title | 필수 사건명 |
| event_type | DB category, 사건 유형 |
| severity | 낮음·보통·높음·긴급 |
| sector | DB location, 가상 발생 구역 |
| source_type | 정보 출처 |
| map_x, map_y | 0~100 정수, 가상 지도 좌표 |
| description | 사건 설명 |
| status | 접수·검토 중·처리 완료 |
| occurred_at | 오프셋을 포함한 발생 시각 |
| created_at, updated_at | 서버·DB가 정하는 등록·수정 시각 |

날짜는 DB에 UTC로 저장하고 API는 ISO 8601 UTC `Z` 문자열을 반환합니다. 프론트는 KST로 표시합니다. 오프셋을 포함한 입력을 같은 순간의 UTC 값으로 변환하므로 학교 컴퓨터의 시스템 시간대가 달라도 발생 시각이 바뀌지 않습니다.

## JOIN

`GET /events-with-authors`는 사건 공개 필드에 `nickname`, `username`, `email`을 더한 행 배열을 반환합니다. SQL 핵심은 다음과 같습니다.

```sql
SELECT i.id AS event_id, i.title, i.category AS event_type,
       i.severity, i.status, i.created_at,
       m.id AS member_id, m.username, m.username AS nickname, m.email
FROM incidents AS i
INNER JOIN members AS m ON i.author_id = m.id
ORDER BY i.occurred_at DESC, i.id DESC;
```

실제 쿼리는 지도·상세 표시용 사건 필드도 함께 선택합니다. 결과를 프론트에서 회원 배열과 사건 배열로 다시 합치지 않습니다. 가상 이메일은 수행평가 필수 JOIN 필드로 표시하며 비밀번호 해시는 선택하지 않습니다.

## 분석 전용 공개 데이터

`GET /analysis-records`는 저장된 `analysis_records`의 공개 읽기 전용 데이터를 `{data: []}`로 반환합니다. 데이터는 서버 가져오기 명령으로 준비하며 브라우저 조회 때 외부 API를 호출하지 않습니다. 외부 자료의 출처·원본 URL·실제 위도/경도·규모·가져온 시각을 포함하고 `data_source`로 external/synthetic을 구분합니다. 화면 호환 ID는 음수, member_id는 0이며 웹 회원이 작성한 사건을 뜻하지 않습니다. 이 행에 사용할 웹 POST/PATCH/DELETE API는 제공하지 않습니다. 일반 사건 JOIN 결과에도 들어가지 않습니다. 자세한 가져오기 절차는 `DATA_SOURCES.md`를 참고합니다.

분석 상세는 `GET /analysis-records/:id`로 조회하며 `:id`는 실제 analysis_records의 양수 PK 또는 화면에서 사용하는 음수 event_id를 모두 허용합니다. 어느 경우든 같은 분석 테이블의 양수 PK로 변환해 조회합니다. 분석 전용 POST/PATCH/DELETE 요청은 404이며 일반 사건 API의 음수 ID도 거부됩니다.
