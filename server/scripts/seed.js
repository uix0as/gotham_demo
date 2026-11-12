import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { requireDatabaseSettings } from '../config.js';

const accounts = [
  { username: '알파 관제관', email: 'alpha@demo.local' },
  { username: '브라보 분석관', email: 'bravo@demo.local' },
];

// 가상 데이터이며 실제 시설·장비·좌표와 관계없습니다.
// 같은 작성자 + 같은 시드 제목은 다시 삽입하지 않아 반복 실행해도 중복되지 않습니다.
const rows = [
  ['통신 장애', 'A-2', '훈련 상황보고', 35, 60, '높음', '접수', '14:20', '가상 통신 중계기 R-07 연결 장애. 중앙 기동구역 통신 점검 요청.'],
  ['강풍 관측', 'A-2', '가상 기상센서', 42, 66, '높음', '검토 중', '14:25', '가상 기상센서 WX-12 순간 풍속 관측. 임시 안테나 상태 확인 필요.'],
  ['전원 이상', 'B-1', '가상 장비센서', 46, 30, '긴급', '접수', '14:30', '가상 발전기 PG-2 출력 변동 감지. 예비 전원 전환 기록.'],
  ['센서 연결 오류', 'A-2', '가상 장비센서', 39, 72, '보통', '접수', '14:41', '가상 감지센서 GS-03 하트비트 누락. 링크 재연결 시도 중.'],
  ['장비 점검', 'B-1', '훈련 상황보고', 52, 24, '보통', '검토 중', '14:52', '가상 발전기 및 배전반 점검 착수. 가상 연료 필터 교체 예정.'],
  ['통신 복구', 'A-2', '훈련 상황보고', 36, 62, '낮음', '처리 완료', '15:05', '가상 예비 중계기 전환으로 통신 복구 완료. 신호 품질 양호.'],
  ['레이더 신호 감쇠', 'C-3', '가상 레이더', 78, 70, '높음', '처리 완료', '09:10', '가상 레이더 RD-5 반사 신호 저하. 모의 탐지 범위 점검.'],
  ['시정 악화', 'C-3', '가상 기상센서', 84, 64, '보통', '처리 완료', '09:22', '가상 기상센서 WX-21 안개 관측. 모의 훈련 시정 점검.'],
  ['장비 점검', 'C-3', '훈련 상황보고', 80, 76, '낮음', '처리 완료', '09:35', '가상 RD-5 레이돔 결로 확인 및 모의 제습 조치 완료.'],
  ['센서 연결 오류', 'A-1', '가상 장비센서', 14, 22, '보통', '검토 중', '11:05', '가상 광학 관측센서 OP-1 영상 스트림 단절. 가상 전원 정상.'],
  ['통신 장애', 'A-1', '훈련 상황보고', 18, 30, '높음', '접수', '11:48', '가상 관측소 데이터 회선 간헐적 단절 보고. 모의 회선 확인 요청.'],
  ['레이더 신호 감쇠', 'B-2', '가상 레이더', 82, 20, '높음', '검토 중', '12:30', '가상 RD-2 북동 구간 잡음 증가. 모의 장비 상태 확인.'],
  ['강풍 관측', 'B-2', '가상 기상센서', 88, 28, '보통', '접수', '12:38', '가상 WX-08 돌풍 관측. 가상 레이더 회전부 점검 필요.'],
  ['전원 이상', 'C-1', '가상 장비센서', 12, 70, '보통', '처리 완료', '13:15', '가상 컨테이너 전원 순간 차단 후 모의 자동 복귀 확인.'],
  ['장비 점검', 'C-1', '훈련 상황보고', 16, 82, '낮음', '접수', '16:40', '가상 보급 차량 정기 점검 일정 등록. 모의 점검 특이사항 없음.'],
  ['통신 장애', 'B-1', '훈련 상황보고', 40, 16, '보통', '처리 완료', '08:10', '가상 지휘망 데이터 링크 지연 발생. 모의 라우팅 확인.'],
  ['통신 복구', 'B-1', '가상 장비센서', 44, 18, '낮음', '처리 완료', '08:34', '가상 링크 라우팅 재설정 후 모의 지연 정상화 확인.'],
  ['강풍 관측', 'A-2', '가상 기상센서', 50, 84, '높음', '접수', '15:20', '가상 WX-14 풍속 관측 지속. 모의 훈련로 이동 주의 안내.'],
];

// 분석 기록: [작성자 이메일, 대상 사건 제목, 제목, 판단, 신뢰도, 내용]
const notes = [
  ["alpha@demo.local", "[가상 훈련 02] A-2 강풍 관측", "A-2 통신 장애와 강풍의 시간 근접", "주의", "보통", "통신 장애(14:20) 5분 뒤 같은 구역에서 강풍이 관측됨. 임시 안테나 고정 상태 확인 필요. 인과관계는 확인되지 않음."],
  ["bravo@demo.local", "[가상 훈련 01] A-2 통신 장애", "중계기 R-07 장애 원인 후보", "관찰", "낮음", "장비 자체 결함과 기상 영향 두 가지 후보. 예비 중계기 전환(15:05) 이후 복구된 점으로 보아 일시적 장애 가능성."],
  ["alpha@demo.local", "[가상 훈련 03] B-1 전원 이상", "B-1 발전기 출력 변동 재발 위험", "위험", "높음", "PG-2 출력 변동 후 22분 뒤 점검 착수. 연료 필터 교체 전까지 재발 가능성이 높음. 예비 전원 유지 권고."],
  ["bravo@demo.local", "[가상 훈련 12] B-2 레이더 신호 감쇠", "B-2 레이더 잡음과 돌풍", "주의", "보통", "RD-2 잡음 증가 8분 뒤 돌풍 관측. 회전부 점검 결과를 받은 뒤 상태 재평가."],
];

try {
  requireDatabaseSettings();
  const ids = [];
  for (const account of accounts) {
    const [existing] = await pool.execute('SELECT id, username FROM members WHERE email = ?', [account.email]);
    if (existing.length) {
      if (existing[0].username !== account.username) throw new Error('동일 시연 이메일을 다른 회원이 사용하고 있습니다. 기존 데이터를 보존하기 위해 중단합니다.');
      ids.push(existing[0].id);
      continue;
    }
    const passwordHash = await bcrypt.hash('demo1234', 10);
    const [result] = await pool.execute('INSERT INTO members (username, email, password_hash) VALUES (?, ?, ?)', [account.username, account.email, passwordHash]);
    ids.push(result.insertId);
  }
  let inserted = 0;
  for (const [index, row] of rows.entries()) {
    const [category, location, source, x, y, severity, status, time, description] = row;
    const title = `[가상 훈련 ${String(index + 1).padStart(2, '0')}] ${location} ${category}`;
    const authorId = ids[index % 2];
    const [existing] = await pool.execute('SELECT id FROM incidents WHERE author_id = ? AND title = ? LIMIT 1', [authorId, title]);
    if (existing.length) continue;
    const occurredAt = new Date(`2026-11-08T${time}:00+09:00`);
    await pool.execute(
      `INSERT INTO incidents (title, category, severity, location, source_type, map_x, map_y, description, status, occurred_at, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, category, severity, location, source, x, y, `[가상 훈련] ${description}`, status, occurredAt, authorId],
    );
    inserted += 1;
  }
  let insertedNotes = 0;
  for (const [email, incidentTitle, title, assessment, confidence, content] of notes) {
    const authorId = ids[accounts.findIndex((account) => account.email === email)];
    const [[incident]] = await pool.execute('SELECT id FROM incidents WHERE title = ? ORDER BY id LIMIT 1', [incidentTitle]);
    if (!incident) continue;
    const [existing] = await pool.execute('SELECT id FROM analysis_notes WHERE author_id = ? AND title = ? LIMIT 1', [authorId, title]);
    if (existing.length) continue;
    await pool.execute(
      'INSERT INTO analysis_notes (incident_id, author_id, title, assessment, confidence, content) VALUES (?, ?, ?, ?, ?, ?)',
      [incident.id, authorId, title, assessment, confidence, content],
    );
    insertedNotes += 1;
  }
  console.log(`시연 데이터 준비 완료: 회원 2개 확인, 사건 ${inserted}개·분석 기록 ${insertedNotes}개 새로 추가. 기존 데이터와 비밀번호 유지.`);
  console.log('시연 로그인: alpha@demo.local / bravo@demo.local, 최초 비밀번호: demo1234');
} catch (error) {
  console.error(error.code ? `시드 실패 (${error.code}). DB 초기화 및 접속 설정을 확인하세요.` : error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
