import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CheckCircle2, AlertCircle, X, RefreshCw } from 'lucide-react';
import { request } from './lib/api';
import { WorkspaceContext, useWorkspace } from './lib/context';
import Layout from './components/Layout';
import Login from './pages/Login';
import './App.css';
const Dashboard=lazy(()=>import('./pages/Dashboard'));
const Records=lazy(()=>import('./pages/Records'));
const Analytics=lazy(()=>import('./pages/Analytics'));
function Protected({roles,children}){const {user}=useWorkspace();return roles.includes(user.role)?children:<Navigate to="/" replace/>;}
function RouteScroll(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo(0,0);},[pathname]);return null;}
function App(){
  const [session,setSession]=useState(null),[booting,setBooting]=useState(true),[bootError,setBootError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState(null);
  const notify=useCallback((message,type='success')=>setNotice({message,type,id:Date.now()}),[]);
  const boot=useCallback(async()=>{try{setSession(await request('/session'));}catch(error){if(error.status!==401)setBootError(error.message);}finally{setBooting(false);}},[]);
  useEffect(()=>{let active=true;request('/session').then(result=>{if(active)setSession(result);}).catch(error=>{if(active&&error.status!==401)setBootError(error.message);}).finally(()=>{if(active)setBooting(false);});return()=>{active=false;};},[]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),5500);return()=>clearTimeout(timer);},[notice]);
  const refresh=useCallback(async()=>{try{setSession(await request('/workspace'));notify('Workspace refreshed');}catch(error){if(error.status===401)setSession(null);notify(error.message,'error');}},[notify]);
  const perform=useCallback(async(action,payload={})=>{if(busy)throw new Error('A change is being saved. Please wait.');setBusy(true);try{const result=await request('/actions',{method:'POST',body:JSON.stringify({action,payload,version:session.version})});setSession(result);notify(result.message||'Changes saved');return result;}catch(error){if(error.status===401)setSession(null);if(error.status===409){try{setSession(await request('/workspace'));}catch{/* Original save error remains visible. */}}throw error;}finally{setBusy(false);}},[busy,session,notify]);
  const logout=useCallback(async()=>{try{await request('/auth/logout',{method:'POST',body:'{}'});setSession(null);}catch(error){notify(error.message,'error');}},[notify]);
  const value=useMemo(()=>session?{...session,busy,perform,refresh,notify,logout}:null,[session,busy,perform,refresh,notify,logout]);
  if(booting)return <div className="boot-screen"><div className="spinner"/><strong>Opening your workspace</strong><p>Accurate Rings</p></div>;
  if(bootError)return <div className="boot-screen"><AlertCircle size={32}/><h1>Workspace unavailable</h1><p>{bootError}</p><button className="button button-primary" onClick={()=>{setBooting(true);setBootError('');boot();}}><RefreshCw size={16}/>Try again</button></div>;
  if(!session)return <Login onLogin={setSession}/>;
  return <WorkspaceContext.Provider value={value}><BrowserRouter><RouteScroll/><Suspense fallback={<div className="boot-screen"><div className="spinner"/><p>Opening this view…</p></div>}><Routes><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="orders" element={<Records kind="orders"/>}/><Route path="inventory" element={<Protected roles={['admin','staff']}><Records kind="inventory"/></Protected>}/><Route path="production" element={<Protected roles={['admin','staff']}><Records kind="production"/></Protected>}/><Route path="machine-usage" element={<Protected roles={['admin','staff']}><Records kind="machines"/></Protected>}/><Route path="quality-check" element={<Protected roles={['admin','staff']}><Records kind="quality"/></Protected>}/><Route path="dispatch" element={<Records kind="dispatch"/>}/><Route path="profit-loss" element={<Protected roles={['admin']}><Records kind="finance"/></Protected>}/><Route path="reports" element={<Protected roles={['admin']}><Analytics/></Protected>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></Suspense></BrowserRouter>{notice&&<div className={'toast '+(notice.type==='error'?'toast-error':'')} role="status">{notice.type==='error'?<AlertCircle size={19}/>:<CheckCircle2 size={19}/>}<span>{notice.message}</span><button aria-label="Dismiss notification" onClick={()=>setNotice(null)}><X size={16}/></button></div>}</WorkspaceContext.Provider>;
}
export default App;
