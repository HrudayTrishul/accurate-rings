import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createWorkspace, emptyWorkspace, WorkspaceError } from '../shared/workspace.mjs';
const require=createRequire(import.meta.url);
export class DemoStore {
  constructor(directory){this.directory=directory;this.locks=new Map();}
  filename(id){if(!/^[a-zA-Z0-9-]+$/.test(id))throw new WorkspaceError('Invalid workspace.',400);return path.join(this.directory,id+'.json');}
  async write(id,record){await mkdir(this.directory,{recursive:true});const filename=this.filename(id),temporary=filename+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify(record),'utf8');await rename(temporary,filename);}
  async read(id){try{return JSON.parse(await readFile(this.filename(id),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;const record={state:createWorkspace(),version:1};await this.write(id,record);return record;}}
  async update(id,version,fn){const prior=this.locks.get(id)||Promise.resolve();const next=prior.catch(()=>{}).then(async()=>{const record=await this.read(id);if(record.version!==version)throw new WorkspaceError('The workspace changed. Refresh it before saving again.',409);const outcome=fn(record.state);const updated={...outcome,version:record.version+1};await this.write(id,updated);return updated;});this.locks.set(id,next);try{return await next;}finally{if(this.locks.get(id)===next)this.locks.delete(id);}}
}
export class MysqlStore {
  constructor(){this.pool=require('mysql2/promise').createPool({host:process.env.DB_HOST||'127.0.0.1',port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectionLimit:10,waitForConnections:true});}
  async user(username){const [rows]=await this.pool.execute('SELECT * FROM users WHERE username = ? LIMIT 1',[username]);return rows[0];}
  async read(id){await this.pool.execute('INSERT IGNORE INTO workspace_documents (id, state, version) VALUES (?, ?, 1)',[id,JSON.stringify(emptyWorkspace())]);const [rows]=await this.pool.execute('SELECT state, version FROM workspace_documents WHERE id = ?',[id]);return{state:typeof rows[0].state==='string'?JSON.parse(rows[0].state):rows[0].state,version:rows[0].version};}
  async update(id,version,fn){const connection=await this.pool.getConnection();try{await connection.beginTransaction();const [rows]=await connection.execute('SELECT state, version FROM workspace_documents WHERE id = ? FOR UPDATE',[id]);if(!rows[0]||rows[0].version!==version)throw new WorkspaceError('The workspace changed. Refresh it before saving again.',409);const outcome=fn(typeof rows[0].state==='string'?JSON.parse(rows[0].state):rows[0].state);await connection.execute('UPDATE workspace_documents SET state = ?, version = version + 1 WHERE id = ?',[JSON.stringify(outcome.state),id]);await connection.commit();return{...outcome,version:version+1};}catch(error){await connection.rollback();throw error;}finally{connection.release();}}
}
