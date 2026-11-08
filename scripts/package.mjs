import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { zipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = {};
const projectDocs = new Set(['API_CONTRACT.md', 'DATABASE_SCHEMA.md', 'DATA_SOURCES.md', 'PROJECT_OVERVIEW.md', 'PRESENTATION.md', 'example-analysis.csv']);
const excluded = new Set(['.git', 'node_modules', 'dist', '.next', 'out', '.runtime', 'release', '.taste-skill', '.impeccable']);
async function collect(directory, relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.name === '.DS_Store' || entry.name.endsWith('.log') || entry.name.endsWith('.tsbuildinfo')) continue;
    if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
    if (relative === 'docs' && !projectDocs.has(entry.name)) continue;
    if (!relative && ['DESIGN.md', 'PRODUCT.md'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await collect(path, name);
    else if (entry.isFile()) files[`gotham_demo/${name}`] = new Uint8Array(await readFile(path));
  }
}
await collect(root);
await mkdir(join(root, 'release'), { recursive: true });
const destination = join(root, 'release', 'gotham_demo.zip');
await writeFile(destination, zipSync(files, { level: 6 }));
console.log(`학교 컴퓨터용 소스 ZIP: ${destination}`);
console.log('.env, node_modules, MySQL 원시 파일, .git, 빌드 결과는 제외합니다. sql 폴더의 학교용 SQL 백업은 포함됩니다.');
