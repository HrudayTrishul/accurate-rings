const base=(import.meta.env.VITE_API_BASE_URL||'/api').replace(/\/$/,'');
export async function request(path,options={}) {
  let response;
  try{response=await fetch(base+path,{credentials:'include',signal:AbortSignal.timeout(15000),...options,headers:{'Content-Type':'application/json',...options.headers}});}catch{throw Object.assign(new Error('The workspace could not be reached. Check your connection and try again.'),{status:503});}
  let body;try{body=await response.json();}catch{throw new Error('The server returned an unexpected response. Please try again.');}
  if(!response.ok)throw Object.assign(new Error(body.message||'The request could not be completed.'),{status:response.status});
  return body;
}
