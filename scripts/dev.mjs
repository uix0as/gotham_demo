import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const windows = process.platform === 'win32';
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
