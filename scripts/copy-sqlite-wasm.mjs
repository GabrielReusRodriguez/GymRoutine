// Copia el binario WASM de SQLite a public/ para que el navegador lo cargue
// desde una URL estable (init: locateFile). Se ejecuta en predev/prebuild.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm');
const targetDir = join(root, 'public');
const target = join(targetDir, 'sqlite3.wasm');

if (!existsSync(source)) {
  console.error(`[sqlite-wasm] No se encontró ${source}. Ejecuta npm install.`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, target);
console.log('[sqlite-wasm] sqlite3.wasm copiado a public/');
