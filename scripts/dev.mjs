import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const vite=path.join(path.dirname(require.resolve('vite/package.json',{paths:[path.resolve('frontend')]})),'bin/vite.js');
const children = [
  spawn(process.execPath, ['server.js'], { cwd: 'backend', stdio: 'inherit' }),
  spawn(process.execPath, [vite, '--config', 'frontend/vite.config.js', '--host', '127.0.0.1'], { stdio: 'inherit' }),
];
function shutdown() { for (const child of children) child.kill(); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
for (const child of children) child.on('exit', shutdown);
