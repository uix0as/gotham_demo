import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Windows의 npm.cmd와 macOS의 npm을 같은 명령으로 실행합니다.
const root = fileURLToPath(new URL('../', import.meta.url));
for (const directory of ['.', 'client', 'server']) {
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--no-audit', '--no-fund'], {
    cwd: join(root, directory),
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('설치 완료. server/.env 설정 후 npm run db:init, npm run db:seed, npm run dev 순서로 실행하세요. 공개 관측 가져오기는 선택 사항입니다. README_SCHOOL_SETUP.md를 확인하세요.');
