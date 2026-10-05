const express=require('express');
const cors=require('cors');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
const crypto=require('node:crypto');
const path=require('node:path');
const fs=require('node:fs/promises');
require('dotenv').config({path:path.join(__dirname,'.env'),quiet:true});
async function start(){
  const {applyAction,createWorkspace,visibleWorkspace,WorkspaceError}=await import('../shared/workspace.mjs');
  const {DemoStore,MysqlStore}=await import('./store.mjs');
  const mode=process.env.APP_MODE==='mysql'?'mysql':'demo';
  const dataDirectory=process.env.DATA_DIR||path.join(__dirname,'.data');
  let secret=process.env.JWT_SECRET||'';
  if(!secret&&mode==='demo'){
    await fs.mkdir(dataDirectory,{recursive:true});const secretFile=path.join(dataDirectory,'session-secret');
    try{secret=await fs.readFile(secretFile,'utf8');}catch(error){if(error.code!=='ENOENT')throw error;secret=crypto.randomBytes(48).toString('hex');try{await fs.writeFile(secretFile,secret,{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;secret=await fs.readFile(secretFile,'utf8');}}
  }
  if(secret.length<32)throw new Error('Set JWT_SECRET to at least 32 random characters in backend/.env.');
  const store=mode==='mysql'?new MysqlStore():new DemoStore(dataDirectory);
  const app=express();app.disable('x-powered-by');
  const origins=(process.env.FRONTEND_URL||'http://localhost:5173,http://127.0.0.1:5173').split(',');
  app.use(cors({origin:(origin,cb)=>cb(null,!origin||origins.includes(origin)),credentials:true}));
  app.use(express.json({limit:'64kb'}));
  app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Referrer-Policy':'strict-origin-when-cross-origin'});if(req.method!=='GET'&&req.headers.origin&&!origins.includes(req.headers.origin))return res.status(403).json({message:'This request came from another site.'});next();});
  const secure=process.env.NODE_ENV==='production',cookieOptions={httpOnly:true,secure,sameSite:'lax',path:'/',maxAge:86400000};
  const getUser=req=>{const token=req.headers.cookie?.split(';').map(c=>c.trim()).find(c=>c.startsWith('ar_session='))?.slice(11);try{return jwt.verify(token,secret,{algorithms:['HS256']});}catch{return null;}};
  const signIn=(res,user)=>res.cookie('ar_session',jwt.sign(user,secret,{expiresIn:'1d',algorithm:'HS256'}),cookieOptions);
  const demoUser=(role,sid)=>({user_id:'demo',name:role==='admin'?'Hruday Rao':role==='staff'?'Ravi Kumar':'Kavya Menon',username:'demo-'+role,role,customer_id:role==='customer'?2:null,sid,mode:'demo'});
  const payloadFor=(record,user,message)=>({state:visibleWorkspace(record.state,user),version:record.version,user:{user_id:user.user_id,name:user.name,username:user.username,role:user.role,customer_id:user.customer_id},mode,message});
  const attempts=new Map();
  app.get('/api/health',(req,res)=>res.json({status:'ok',app:'Accurate Rings',mode}));
  app.post('/api/auth/demo',async(req,res)=>{if(mode!=='demo')throw new WorkspaceError('Sample login is disabled for this company workspace.',403);const role=req.body.role;if(!['admin','staff','customer'].includes(role))throw new WorkspaceError('Choose a valid demo role.');const existing=getUser(req),sid=existing?.mode==='demo'?existing.sid:crypto.randomUUID();const record=await store.read(sid);const user=demoUser(role,sid);signIn(res,user);res.json(payloadFor(record,user));});
  app.post('/api/auth/login',async(req,res)=>{
    if(mode==='demo')throw new WorkspaceError('Open the sample workspace, or configure MySQL mode for company login.',400);
    const key=req.ip,entry=attempts.get(key)||{count:0,until:Date.now()+900000};if(entry.until<Date.now()){entry.count=0;entry.until=Date.now()+900000;}if(entry.count>=10)throw new WorkspaceError('Too many login attempts. Try again in 15 minutes.',429);entry.count++;attempts.set(key,entry);
    const {username,password}=req.body;if(typeof username!=='string'||typeof password!=='string'||username.length>120||password.length>200)throw new WorkspaceError('Enter a username and password.');
    const account=await store.user(username.trim());if(!account||!/^\$2[aby]\$/.test(account.password)||!await bcrypt.compare(password,account.password))throw new WorkspaceError('Invalid username or password.',401);
    attempts.delete(key);const user={user_id:account.user_id,name:account.name,username:account.username,role:account.role,customer_id:account.customer_id||null,sid:'company',mode:'mysql'};signIn(res,user);res.json(payloadFor(await store.read('company'),user));
  });
  app.use('/api',(req,res,next)=>{req.user=getUser(req);if(!req.user||req.user.mode!==mode)return res.status(401).json({message:'Please sign in to open your workspace.'});next();});
  app.post('/api/auth/logout',(req,res)=>{res.clearCookie('ar_session',{httpOnly:true,secure,sameSite:'lax',path:'/'});res.json({status:'ok'});});
  app.get(['/api/session','/api/workspace'],async(req,res)=>res.json(payloadFor(await store.read(req.user.sid),req.user)));
  app.post('/api/actions',async(req,res)=>{
    const body=req.body;if(!Number.isInteger(body.version))throw new WorkspaceError('Refresh the workspace before saving.',409);
    const outcome=await store.update(req.user.sid,body.version,state=>{if(body.action==='resetDemo'){if(mode!=='demo'||req.user.role!=='admin')throw new WorkspaceError('This workspace cannot be reset.',403);return{state:createWorkspace(),message:'Sample workspace restored'};}return applyAction(state,body.action,body.payload||{},req.user);});res.json(payloadFor(outcome,req.user,outcome.message));
  });
  app.use('/api',(req,res)=>res.status(404).json({message:'This endpoint is not available.'}));
  if(process.env.SERVE_FRONTEND==='true'){const directory=path.resolve(__dirname,'../dist/client');app.use(express.static(directory));app.get('/{*path}',(req,res)=>res.sendFile(path.join(directory,'index.html')));}
  app.use((error,req,res,next)=>{void next;if(!(error instanceof WorkspaceError))console.error('Workspace request failed:',error.code||error.message);res.status(error.status||503).json({message:error instanceof WorkspaceError?error.message:'Workspace is temporarily unavailable. Please check its connection and try again.'});});
  const port=Number(process.env.PORT||5000),host=process.env.HOST||'127.0.0.1';const server=app.listen(port,host,()=>console.log('Accurate Rings '+mode+' server listening on '+host+':'+server.address().port));
  function stop(){server.close(()=>process.exit(0));}process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
start().catch(error=>{console.error(error.message);process.exit(1);});
