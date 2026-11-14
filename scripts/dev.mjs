import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const windows = process.platform === 'win32';
// 1) 사전 점검: .env·MySQL·테이블·포트가 준비되지 않으면 화면만 뜨고 API가 죽는 상황을 막습니다.
const check = spawnSync(process.execPath, ['scripts/preflight.js'], { cwd: fileURLToPath(new URL('../server/', import.meta.url)), stdio: 'inherit' });
if (check.status !== 0) process.exit(check.status ?? 1);
const commands = [
  ['server', 'node_modules/nodemon/bin/nodemon.js', 'index.js'],
  ['client', 'node_modules/vite/bin/vite.js', '--port', process.env.CLIENT_PORT || '5173'],
];
const children = commands.map(([directory, entry, ...args]) => spawn(process.execPath, [entry, ...args], {
  cwd: fileURLToPath(new URL(`../${directory}/`, import.meta.url)),
  stdio: 'inherit',
  detached: !windows,
}));
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => {
    if (!child.pid) return;
    if (windows) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') console.error(error.message); }
    }
  });
  process.exitCode = code;
}
children.forEach((child) => {
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => stop(code ?? 0));
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
