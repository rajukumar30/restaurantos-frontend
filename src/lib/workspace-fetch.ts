// Browser-only, bounded, session-scoped workspace read cache.
// Never cache payment, dining credentials, order mutations, staff records or authorization.
type Entry={body:string;at:number};
const entries=new Map<string,Entry>();
const pending=new Map<string,Promise<Response>>();
const MAX=24,BRANCH_TTL=20000,PREVIEW_TTL=30000;
let session="",generation=0;
const api=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
function clear(){generation++;entries.clear();pending.clear();}
export function clearWorkspaceCache(){clear();session="";}
function currentToken(){
 if(typeof window==="undefined")return "";
 try{
  const token=window.localStorage.getItem("restaurantos_access_token")??"";
  const payload=JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")));
  return typeof payload.exp==="number"&&payload.exp*1000>Date.now()+1000?token:"";
 }catch{return "";}
}
function scope(token:string){const current=currentToken();if(current!==session){clear();session=current;}return !!current&&token===current;}
function kind(url:string){
 try{
  const u=new URL(url),base=new URL(api);
  if(u.origin!==base.origin)return "";
  if(/^\/api\/v1\/tenants\/[0-9a-f-]{36}\/(branches|staff-operations\/branches)$/i.test(u.pathname)&&!u.search)return "branch";
  if(/^\/api\/v1\/tenants\/[0-9a-f-]{36}\/(dashboard|menu\/catalog)$/i.test(u.pathname))return "preview";
 }catch{}
 return "";
}
function remember(url:string,body:string){
 if(body.length>1000000)return;
 entries.delete(url);entries.set(url,{body,at:Date.now()});
 while(entries.size>MAX){const first=entries.keys().next().value;if(first===undefined)break;entries.delete(first);}
}
export function readWorkspacePreview<T>(url:string,token:string):{data:T;at:number}|null{
 if(!scope(token)||kind(url)!=="preview")return null;
 const e=entries.get(url);if(!e||Date.now()-e.at>PREVIEW_TTL)return null;
 try{return {data:JSON.parse(e.body).data as T,at:e.at};}catch{return null;}
}
function abortError(){return new DOMException("Request aborted","AbortError");}
function withAbort<T>(promise:Promise<T>,signal?:AbortSignal|null):Promise<T>{
 if(!signal)return promise;
 if(signal.aborted)return Promise.reject(abortError());
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(abortError());signal.addEventListener("abort",abort,{once:true});
  promise.then(resolve,reject).finally(()=>signal.removeEventListener("abort",abort));
 });
}
export async function workspaceFetch(url:string,init:RequestInit={}):Promise<Response>{
 const token=new Headers(init.headers).get("Authorization")?.replace(/^Bearer /,"")??"";
 const scoped=scope(token),method=(init.method??"GET").toUpperCase(),type=kind(url);
 if(init.signal?.aborted)throw abortError();
 if(method!=="GET"){
  if(scoped)clear();
  try{return await fetch(url,init);}finally{if(scope(token))clear();}
 }
 if(!scoped||!type)return fetch(url,init);
 const epoch=generation;
 const branch=type==="branch";
 const cached=entries.get(url);
 if(branch&&init.cache!=="reload"&&cached&&Date.now()-cached.at<BRANCH_TTL)
  return new Response(cached.body,{status:200,headers:{"Content-Type":"application/json"}});
 if(branch&&init.cache!=="reload"){
  const existing=pending.get(url);
  if(existing)return (await withAbort(existing,init.signal)).clone();
 }
 const run=async()=>{
  // Branch fetches are shared; one page unmounting must not abort another's request.
  const response=await fetch(url,branch?{...init,cache:"no-store",signal:AbortSignal.timeout(15000)}:init);
  if(response.status===401||response.status===403){if(scope(token))clear();return response;}
  if(response.ok&&scope(token)&&generation===epoch){
   try{const body=await response.clone().text();const p=JSON.parse(body);
    if(p?.success&&p.data!=null&&scope(token)&&generation===epoch)remember(url,body);
   }catch{/* Never cache invalid responses. */}
  }
  return response;
 };
 if(!branch)return run();
 const task=run();pending.set(url,task);
 void task.then(()=>{if(pending.get(url)===task)pending.delete(url);},()=>{if(pending.get(url)===task)pending.delete(url);});
 return (await withAbort(task,init.signal)).clone();
}
