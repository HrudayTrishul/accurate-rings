import { applyAction, createWorkspace, visibleWorkspace, WorkspaceError } from '../shared/workspace.mjs';
const COOKIE='ar_demo';
const demoUser=role=>({user_id:'demo',name:role==='admin'?'Hruday Rao':role==='staff'?'Ravi Kumar':'Kavya Menon',username:`demo-${role}`,role,customer_id:role==='customer'?2:null});
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Permissions-Policy':'camera=(), microphone=(), geolocation=()','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.tile.openstreetmap.org; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"};
const cookieToken=request=>request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
async function hash(token){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
function response(body,status=200,headers={}){return Response.json(body,{status,headers:{...security,'Cache-Control':'no-store',...headers}});}
async function bodyFor(request){if(Number(request.headers.get('content-length'))>65536)throw new WorkspaceError('Request is too large.',413);const raw=await request.text();if(raw.length>65536)throw new WorkspaceError('Request is too large.',413);try{return JSON.parse(raw);}catch{throw new WorkspaceError('Enter valid form data.');}}
async function sessionFor(request,env){const token=cookieToken(request);if(!token||!/^[a-f0-9]{64}$/.test(token))return null;return env.DB.prepare('SELECT * FROM demo_workspaces WHERE token_hash = ? AND expires_at > ?').bind(await hash(token),Date.now()).first();}
const resultFor=(row,message)=>({state:visibleWorkspace(JSON.parse(row.state),demoUser(row.role)),user:demoUser(row.role),version:row.version,mode:'demo',message});
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    try {
      if(!url.pathname.startsWith('/api/')){const asset=await env.ASSETS.fetch(request);return new Response(asset.body,{status:asset.status,headers:{...Object.fromEntries(asset.headers),...security}});}
      if(request.method!=='GET'){const origin=request.headers.get('origin');if((origin&&origin!==url.origin)||request.headers.get('sec-fetch-site')==='cross-site')throw new WorkspaceError('This request came from another site.',403);}
      if(url.pathname==='/api/health'&&request.method==='GET')return response({status:'ok',app:'Accurate Rings',mode:'demo'});
      if(!env.DB)throw new WorkspaceError('Workspace storage is temporarily unavailable. Please try again.',503);
      let row=await sessionFor(request,env);
      if(url.pathname==='/api/auth/demo'&&request.method==='POST'){
        const body=await bodyFor(request);if(!['admin','staff','customer'].includes(body.role))throw new WorkspaceError('Choose a valid demo role.');
        if(row){await env.DB.prepare('UPDATE demo_workspaces SET role = ? WHERE id = ?').bind(body.role,row.id).run();row.role=body.role;return response(resultFor(row));}
        const token=[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');const expires=Date.now()+30*86400000;
        row={id:crypto.randomUUID(),token_hash:await hash(token),role:body.role,state:JSON.stringify(createWorkspace()),version:1,expires_at:expires};
        await env.DB.prepare('DELETE FROM demo_workspaces WHERE expires_at < ?').bind(Date.now()).run();
        await env.DB.prepare('INSERT INTO demo_workspaces (id, token_hash, role, state, version, expires_at) VALUES (?, ?, ?, ?, ?, ?)').bind(row.id,row.token_hash,row.role,row.state,row.version,expires).run();
        return response(resultFor(row),200,{'Set-Cookie':`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`});
      }
      if(url.pathname==='/api/auth/login'&&request.method==='POST')throw new WorkspaceError('Company login is available when this project is connected to your own backend. Use the sample workspace here.',503);
      if(!row)throw new WorkspaceError('Please sign in to open your workspace.',401);
      if(url.pathname==='/api/auth/logout'&&request.method==='POST')return response({status:'ok'},200,{'Set-Cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`});
      if((url.pathname==='/api/session'||url.pathname==='/api/workspace')&&request.method==='GET')return response(resultFor(row));
      if(url.pathname==='/api/actions'&&request.method==='POST'){
        const body=await bodyFor(request);if(!Number.isInteger(body.version)||body.version!==row.version)throw new WorkspaceError('The workspace changed. Refresh it before saving again.',409);
        let outcome;if(body.action==='resetDemo'){if(row.role!=='admin')throw new WorkspaceError('Only an administrator can reset the sample workspace.',403);outcome={state:createWorkspace(),message:'Sample workspace restored'};}else outcome=applyAction(JSON.parse(row.state),body.action,body.payload||{},demoUser(row.role));
        const changed=await env.DB.prepare('UPDATE demo_workspaces SET state = ?, version = version + 1 WHERE id = ? AND version = ?').bind(JSON.stringify(outcome.state),row.id,row.version).run();
        if(changed.meta.changes!==1)throw new WorkspaceError('Another change was saved first. Refresh before trying again.',409);
        row.state=JSON.stringify(outcome.state);row.version++;return response(resultFor(row,outcome.message));
      }
      throw new WorkspaceError('This endpoint is not available.',404);
    }catch(error){if(!(error instanceof WorkspaceError))console.error('Workspace request failed',error.message);return response({message:error instanceof WorkspaceError?error.message:'Workspace is temporarily unavailable. Please try again.'},error.status||503);}
  }
};
