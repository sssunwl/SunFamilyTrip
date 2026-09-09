import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(appDir, '..', 'assets');
const destination = path.join(appDir, 'public', 'assets');

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log(`已複製舊產品圖：${source} → ${destination}`);
