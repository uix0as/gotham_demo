# 분석 데이터의 출처와 저장 구조

회원·사건 CRUD는 가상 시연 데이터로 운영하고, 더 풍부한 분석 화면은 공개 데이터 스냅샷을 별도 테이블에 가져와 사용합니다. 외부 API를 브라우저에서 실시간으로 호출해야만 발표가 가능한 구조가 아닙니다. 저장된 파일을 MySQL에 넣은 뒤 인터넷 없이 조회합니다.

## 데이터 구분

| 구분 | DB | 작성자 | 변경 방법 | 분석 화면 | 회원 JOIN |
|---|---|---|---|---|---|
| 직접 등록한 가상 사건 | incidents | 로그인 회원 | 웹 CRUD | 표시 | 포함 |
| 공개 외부 데이터 | analysis_records | 웹 회원 없음 | 서버 가져오기 명령 | 출처 선택 후 표시 | 제외 |
| CSV의 가상 분석 데이터 | analysis_records | 웹 회원 없음 | 서버 가져오기 명령 | synthetic 표시 | 제외 |

화면의 “가상 데이터” 필터에는 CSV 합성 자료 외에도 웹의 “가상 사건 생성” 버튼으로 만든 회원 사건이 포함될 수 있습니다. 후자는 incidents에 저장된 본인 사건이므로 작성자가 CRUD할 수 있습니다. 읽기 전용 여부는 합성 여부가 아니라 analysis_records로 가져온 행인지로 구분합니다.

외부 데이터를 임의 회원에게 작성 사건으로 배정하지 않습니다. 외부 행은 읽기 전용이며 수정·삭제 버튼을 제공하지 않습니다. 회원 탈퇴가 외부 공개 데이터를 삭제하지 않습니다. 평가용 JOIN은 여전히 `incidents INNER JOIN members`의 실제 SQL 결과입니다.

## USGS 공개 지진 데이터

- 제공자: U.S. Geological Survey, Earthquake Hazards Program 및 원본 기여 관측 네트워크.
- 원본 API: [Past 30 Days · All Earthquakes GeoJSON](https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson).
- 형식 설명: [USGS GeoJSON Summary Format](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php).
- 보관 파일: `data/usgs-earthquakes.geojson`, 출처 메타데이터: `data/usgs-source.json`. 2026-11-08 13:08 KST에 API HTTP 200을 확인하고 원본 9,979행 중 발생 시각이 최신인 1,000행을 보관했습니다. 포함된 발생 시각 범위는 2026-11-03T19:23:23Z~2026-11-08T03:38:40Z입니다. 원본을 내려받은 시점의 스냅샷이므로 “현재 실시간 관측”을 의미하지 않습니다.
- 사용 필드: 원본 ID, 사건 제목·장소, 발생 시각, 지진 규모, 실제 경도·위도·깊이, 원본 상세 링크, 관측 네트워크, 가져온 시각.
- 응답 전체를 JavaScript 소스에 수천 줄의 객체로 하드코딩하지 않고 데이터 파일과 DB에 보관합니다.

GeoJSON은 `FeatureCollection.features` 안에 관측 행을 담습니다. 좌표 배열의 순서는 **경도, 위도, 깊이**이며 발생 시각은 밀리초 단위 Unix time입니다. 이 형식에 맞게 서버에서 정규화합니다. 깊이는 설명 문자열에 보존하고 실제 위도·경도·규모는 별도 컬럼에 저장합니다. [USGS 형식 설명](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php)

### 출처와 이용 조건

USGS가 직접 만든 데이터·정보는 미국 공공영역 자료라는 공식 안내가 있으며 출처 표기를 요청합니다. 단, USGS 사이트의 모든 제3자 자료에 같은 조건이 적용되는 것은 아니므로 원본 링크와 기여 네트워크를 보존합니다. 이 프로젝트는 공식 기관의 후원·인증을 주장하지 않습니다. [USGS Copyrights and Credits](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits)

표기 예: `Source: U.S. Geological Survey / contributing network · original event URL · imported_at`.

## 가져오기와 오프라인 재현

프로젝트 루트에서 기본 스냅샷을 가져옵니다.

```sh
npm run data:import
```

백엔드의 `scripts/import-data.js`는 로컬 GeoJSON 또는 CSV를 받습니다. 실제 옵션·허용 CSV 열은 아래 명령과 함께 소스의 안내를 확인합니다.

```sh
# 기본 공개 스냅샷을 사용
npm --prefix server run data:import

# 다른 로컬 데이터 파일을 사용 (경로는 실제 파일 위치로 변경)
node server/scripts/import-data.js --file data/my-analysis.geojson
node server/scripts/import-data.js --file data/my-analysis.csv

# 인터넷에 연결된 상태에서 USGS 최신 응답 갱신
node server/scripts/import-data.js --refresh-usgs
```

Windows에서는 `C:/path/data.csv`처럼 실제 경로를 사용하거나 따옴표로 경로를 감쌉니다. 학교 발표에서는 미리 보관한 스냅샷과 DB만 사용하면 됩니다. 최신 API 다운로드는 선택 사항입니다. CSV의 개인정보나 비밀 데이터를 가져오지 않습니다.

원본 source ID와 데이터 출처를 기준으로 중복을 식별합니다. 반복 실행 시 같은 외부 사건이 무한히 복제되지 않게 가져오기 코드에서 처리합니다. 데이터 초기화 또는 외부 데이터 전체 삭제는 일반 회원 CRUD와 분리합니다.

## API와 시각화

`GET /api/analysis-records`는 MySQL에 저장한 분석 전용 행을 반환하고 `GET /api/analysis-records/:id`는 실제 분석 테이블의 양수 ID 또는 화면 호환 음수 ID로 상세를 조회합니다. 프론트는 이 결과와 직접 등록 사건을 분석용 배열로 함께 사용하고 출처별로 선택할 수 있게 합니다. 분석 전용 행의 호환 ID는 음수, 웹 회원 ID는 0이며 이것은 화면 모델을 위한 구분입니다. 실제 `incidents`의 PK·FK나 작성자를 바꾸지 않습니다.

각 행은 `data_source`(external/synthetic), `source_name`, `source_url`, 원본 식별자, 실제 좌표·규모, `imported_at` 같은 출처 정보를 포함합니다. 사용자는 상세 패널에서 원본과 가져온 시점을 확인합니다. 외부 행이 선택되면 웹 사건 CRUD API로 보내지 않습니다.

기존 전술 지도를 보존하기 위해 외부 자료의 좌표를 가상 지도 범위로 정규화하고 예시 구역에 배치합니다. **그 지도상의 구역·0~100 좌표는 실제 지리 위치를 뜻하지 않습니다.** 실제 위도·경도는 상세 정보에서 별도로 확인합니다. 중요도 등 일부 UI 값도 시연을 위한 변환이며 공식 위험 등급이 아닙니다.

관계망은 기존의 같은 구역·가까운 발생 시각 규칙을 사용합니다. 외부 지진의 물리적 원인·상호 영향이나 실제 작전 관계를 추론하는 과학 분석이 아닙니다. 많은 데이터에서 브라우저가 멈추지 않도록 지도는 최신 500건, 관계 그래프는 최신 250건, 최근 목록은 최신 100건을 그립니다. 선택한 사건은 표시 한도 안에 유지합니다. 통계는 필터 결과 전체로 계산하고 화면 표시 건수와 구분합니다. 연관 묶음은 규모순 50개, 묶음 안의 사건은 시간순 50건, 연결 근거는 100건까지 표시합니다. 일자·구역 필터로 범위를 좁힐 수 있습니다.

## SQL로 출처 확인

```sql
USE gotham_20612;
SELECT COUNT(*) AS manual_incidents FROM incidents;
SELECT COUNT(*) AS imported_records FROM analysis_records;
SELECT * FROM analysis_records ORDER BY id DESC LIMIT 5;
```

평가용 사건·작성자 JOIN에는 외부 테이블이 들어가지 않습니다.

```sql
SELECT i.id, i.title, i.category, i.severity, i.status,
       m.username, m.email, i.created_at
FROM incidents AS i
INNER JOIN members AS m ON i.author_id = m.id;
```

수집 시각과 행 수는 data/usgs-source.json에서 확인합니다. 외부 API 값은 시간이 지나면 바뀌지만 포함된 스냅샷으로 오프라인 시연 데이터를 재현할 수 있습니다.

## CSV 열과 검증 규칙

포함된 `docs/example-analysis.csv`는 출처를 명시한 합성 예제 2행입니다. 다음 명령으로 CSV 경로도 재현할 수 있습니다.

```sh
node server/scripts/import-data.js --file docs/example-analysis.csv
```

원본 출처 URL을 요구하는 스키마를 보여주기 위해 `example.org` 예시 주소를 사용하며 실제 관측 기관의 데이터로 표시하지 않습니다.

CSV는 UTF-8로 저장합니다. 헤더는 아래 이름을 사용하며, 값 안의 쉼표·줄바꿈은 CSV 따옴표 규칙으로 감쌉니다. `csv-parse`로 읽으므로 문자열을 단순 쉼표로 분리하지 않습니다.

```csv
source_name,external_id,title,event_type,severity,sector,map_x,map_y,description,status,occurred_at,source_url,is_synthetic
학생 가상 데이터,synthetic-001,가상 센서 점검,장비 점검,보통,A-2,35,60,합성 분석용 데이터이며 실제 사건이 아닙니다,접수,2026-11-08T14:20:00+09:00,https://example.org/synthetic-dataset,true
```

이 예시는 **합성 데이터**이며 `example.org`는 원본 다운로드 주소가 아닌 예시 출처 표기입니다. 실제 공개 CSV는 실제 제공자의 HTTPS 출처와 이용 조건을 적습니다. 기본 필수 헤더는 위 13개입니다.

| 선택 열 | 처리 |
|---|---|
| dataset_url | 없으면 source_url 사용 |
| source_license | 없으면 제공 CSV의 이용 조건 확인 안내 저장; 실제 조건 기재 권장 |
| contributor | 제공자·기여자 |
| latitude, longitude | 실제 위도 -90~90, 경도 -180~180; 없으면 NULL |
| magnitude | 규모 -10~20; 없으면 NULL |
| collected_at | 시간대 있는 ISO 8601; 없으면 입력 파일 수정 시각 사용 |

`is_synthetic`은 `true` 또는 `false`를 명시합니다. 발생 시각에는 `Z` 또는 `+09:00` 등 시간대를 붙입니다. map_x/map_y는 0~100 숫자입니다. 중요도는 낮음·보통·높음·긴급, 상태는 접수·검토 중·처리 완료 중 하나입니다. source_url과 dataset_url은 HTTPS여야 합니다.

입력 파일은 50MB 이하입니다. `--limit`은 1~10000이며 GeoJSON 기본값은 최신 1,000행, CSV 기본값은 최대 10,000행입니다. CSV가 지정한 한도를 넘으면 잘라 넣지 않고 오류를 반환합니다. 예를 들어 프로젝트 루트에서 아래처럼 실행합니다.

```sh
node server/scripts/import-data.js --file data/my-analysis.csv --limit 5000
```

상대 경로는 현재 터미널 폴더가 아니라 **프로젝트 루트 기준**으로 해석합니다. 전체 행을 먼저 검증하고 DB 트랜잭션으로 저장하므로 중간 오류가 발생하면 일부 행만 남기지 않고 롤백합니다. 기본 공개 스냅샷은 `data/usgs-source.json`의 SHA-256을 대조하고 `retrieved_at`을 `collected_at`으로 사용합니다. 별도 출처 manifest가 없는 GeoJSON·CSV는 파일 수정 시각을 기본 수집 시각으로 사용하므로 실제 최초 수집 시각을 안다면 명시합니다.

## 가져오기 SQL과 조회 SQL 위치

`server/analysis-data.js`의 `importAnalysisRecords`는 출처 이름과 원본 ID의 복합 UNIQUE 키를 이용해 다시 가져온 행을 갱신합니다.

```sql
INSERT INTO analysis_records (...)
VALUES (?, ...)
ON DUPLICATE KEY UPDATE ...;
```

같은 `(source_name, external_id)`는 중복 INSERT 대신 UPDATE됩니다. 파라미터 바인딩과 트랜잭션을 사용합니다. 문법 설명은 [MySQL INSERT ... ON DUPLICATE KEY UPDATE](https://dev.mysql.com/doc/refman/8.4/en/insert-on-duplicate.html)를 참고합니다.

같은 파일의 `listAnalysisRecords`는 분석 테이블을 SELECT하며, 필수 평가용 JOIN은 `server/queries.js`의 `listIncidentsWithAuthors`에서 별도로 수행합니다. [MySQL JOIN 구문](https://dev.mysql.com/doc/refman/8.4/en/join.html)

## 실행 확인과 범위

2026-11-08에 실제 MySQL 9.0.1의 `gotham_20612`에서 다음을 확인했습니다.

- 기본 오프라인 가져오기: 공개 USGS 1,000행 저장 성공.
- 같은 스냅샷 재가져오기: INSERT 0, UPDATE 1,000, 중복 행 증가 없음.
- `docs/example-analysis.csv`: 명시적 합성 데이터 2행 저장 성공.
- 최종 DB 상태: 회원 2명, 별도 수동 사건 18건, 분석 테이블의 공개 1,000행 + 합성 2행입니다. 임시 테스트·브라우저 시연 회원은 정리했습니다.
- 통합 테스트 13/13: CSV 따옴표 파싱, 재가져오기 중복 방지, 읽기 전용 API, 일반 사건 API의 음수 ID 거부, 회원 탈퇴 후 외부 행 유지 포함.
- 브라우저 공개 필터 1,000행, 읽기 전용 상세의 원본 링크·실제 위도/경도·규모·수집 시각·기여자·이용 조건을 확인했습니다. 공개 관계망은 250노드, 합성 CSV 관계망은 2노드·1연결로 표시되고 출처·유형 옵션도 실제 데이터에서 구성됩니다.
- 공개 API의 실제 HTTP 200 응답은 스냅샷 수집 과정에서 확인했습니다. **`--refresh-usgs` 명령의 라이브 새로고침 분기는 구현했지만 직접 실행하지 않았습니다.**

새로고침 명령은 원본 feature를 보존한 최신 한도 스냅샷과 출처 manifest를 함께 갱신하도록 작성했습니다. 기본 manifest는 `data/usgs-source.json`, 다른 GeoJSON 파일은 `<파일명>.source.json`입니다. CSV 예제는 합성 표시를 유지합니다. 학교 Windows에서의 실제 가져오기와 MySQL 백업 복원은 학교 환경에서 최종 확인해야 합니다.
