import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
const files=readdirSync('tests').filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f);
const result=spawnSync(process.execPath,['--test',...files],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
console.log('ACCURATE_RINGS_TESTS_OK');
