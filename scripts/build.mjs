import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const vite=path.join(path.dirname(require.resolve('vite/package.json',{paths:[path.resolve('frontend')]})),'bin/vite.js');

const result = spawnSync(process.execPath, [vite, 'build', '--config', 'frontend/vite.config.js'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
await mkdir('dist/server', { recursive: true });
await build({ entryPoints: ['worker/index.js'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true });
await writeFile('dist/server/wrangler.json', JSON.stringify({ name: 'accurate-rings', main: './index.js', compatibility_date: '2026-10-01', assets: { directory: '../client', binding: 'ASSETS', not_found_handling: 'single-page-application', run_worker_first: ['/api/*'] }, d1_databases: [{ binding: 'DB', database_name: 'accurate-rings-demo', database_id: 'local-development' }] }, null, 2));
console.log('ACCURATE_RINGS_BUILD_OK');
