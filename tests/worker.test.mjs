import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';
function envFor(){const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0000_talented_the_twelve.sql',import.meta.url),'utf8'));
 return {database:db,DB:{prepare(sql){let values=[];const stmt=db.prepare(sql);return {bind(...args){values=args;return this;},async first(){return stmt.get(...values)||null;},async run(){return{meta:{changes:stmt.run(...values).changes}};}};}},ASSETS:{async fetch(){return new Response('<html>App</html>',{headers:{'content-type':'text/html'}});}}};}
async function call(env,path,body,cookie,headers={}){const response=await worker.fetch(new Request('https://workspace.example'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}),env);return{status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie'),headers:response.headers};}
test('hosted sessions persist in D1, stay isolated, and reject stale writes',async()=>{
 const env=envFor();assert.equal((await call(env,'/api/workspace')).status,401);
 const a=await call(env,'/api/auth/demo',{role:'admin'}),b=await call(env,'/api/auth/demo',{role:'admin'});assert.match(a.cookie,/HttpOnly; Secure; SameSite=Lax/);
 const cookie=a.cookie.split(';')[0],other=b.cookie.split(';')[0],original=a.body.state.inventory[0].available_quantity;
 const saved=await call(env,'/api/actions',{action:'adjustStock',payload:{inventory_id:1,delta:20,reason:'Test receipt'},version:1},cookie);assert.equal(saved.status,200);assert.equal(saved.body.version,2);
 assert.equal((await call(env,'/api/session',null,cookie)).body.state.inventory[0].available_quantity,original+20);
 assert.equal((await call(env,'/api/session',null,other)).body.state.inventory[0].available_quantity,original);
 assert.equal((await call(env,'/api/actions',{action:'adjustStock',payload:{inventory_id:1,delta:1,reason:'Stale receipt'},version:1},cookie)).status,409);
 const count=env.database.prepare('SELECT state FROM demo_workspaces WHERE version=2').get().state;
 await call(env,'/api/workspace',null,cookie);assert.equal(env.database.prepare('SELECT state FROM demo_workspaces WHERE version=2').get().state,count);
 env.database.close();
});
test('hosted API enforces role scope, origins and body validation',async()=>{
 const env=envFor();const session=await call(env,'/api/auth/demo',{role:'customer'});const cookie=session.cookie.split(';')[0];
 assert.deepEqual(session.body.state.finance,[]);assert.ok(session.body.state.orders.every(o=>o.customer_id===2));
 assert.equal((await call(env,'/api/actions',{action:'resetDemo',version:1},cookie)).status,403);
 assert.equal((await call(env,'/api/auth/demo',{role:'admin'},cookie,{Origin:'https://evil.example'})).status,403);
 assert.equal((await call(env,'/api/auth/demo',{role:'superuser'})).status,400);
 assert.equal((await call(env,'/api/auth/login',{username:'admin',password:'example'})).status,503);
 assert.equal((await call(env,'/api/dispatch-demo',null,cookie)).status,404);
 env.database.close();
});
