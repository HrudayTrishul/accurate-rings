import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
async function start(directory){
 const child=spawn(process.execPath,['backend/server.js'],{env:{...process.env,APP_MODE:'demo',DATA_DIR:directory,PORT:'0',HOST:'127.0.0.1',JWT_SECRET:'legacy-demo-secret'},stdio:['ignore','pipe','pipe']});
 const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server start timed out')),15000);child.stdout.on('data',data=>{const m=data.toString().match(/127\.0\.0\.1:(\d+)/);if(m){clearTimeout(timer);resolve('http://127.0.0.1:'+m[1]);}});child.once('exit',code=>{clearTimeout(timer);reject(new Error('Server exited '+code));});});
 return{child,url,async stop(){child.kill();await once(child,'exit');}};
}
test('local API persists changes and sessions across restart, with authenticated roles',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'accurate-rings-test-'));let server;
 try{
 server=await start(directory);
 const call=async(route,body,cookie)=>{const res=await fetch(server.url+route,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')};};
 assert.equal((await call('/api/workspace')).status,401);
 const session=await call('/api/auth/demo',{role:'admin'}),cookie=session.cookie.split(';')[0];assert.match(session.cookie,/HttpOnly/);
 const original=session.body.state.inventory[0].available_quantity;
 assert.equal((await call('/api/actions',{action:'adjustStock',payload:{inventory_id:1,delta:12,reason:'Persistence test'},version:1},cookie)).status,200);
 assert.equal((await call('/api/actions',{action:'adjustStock',payload:{inventory_id:1,delta:1,reason:'Stale test'},version:1},cookie)).status,409);
 await server.stop();server=await start(directory);const restored=await call('/api/session',null,cookie);
 assert.equal(restored.status,200);assert.equal(restored.body.version,2);assert.equal(restored.body.state.inventory[0].available_quantity,original+12);
 const customer=await call('/api/auth/demo',{role:'customer'},cookie);const customerCookie=customer.cookie.split(';')[0];
 assert.deepEqual(customer.body.state.finance,[]);assert.equal((await call('/api/actions',{action:'resetDemo',version:2},customerCookie)).status,403);
 assert.equal((await call('/api/dispatch-demo',null,customerCookie)).status,404);
 }finally{if(server&&server.child.exitCode===null)await server.stop();await rm(directory,{recursive:true,force:true});}
});
