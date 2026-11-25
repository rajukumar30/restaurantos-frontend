"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {useStaffBootstrap} from "../bootstrap-context";
import {useOrderEvents} from "@/lib/realtime/use-order-events";
import {useOptimisticStatus} from "@/lib/use-optimistic-status";
import {UtensilsCrossed,RefreshCw,BellRing,Clock3} from "lucide-react";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
type Order={id:string;orderNumber:string;tableName:string;status:string;itemsSummary:string;createdAt:string};
type Branch={id:string;name:string};
async function read(r:Response){const raw=await r.text();let p;try{p=JSON.parse(raw);}catch{throw Error("Invalid response ("+r.status+")");}if(!r.ok||!p.success)throw Error(p.message||"Request failed");return p.data;}
export default function WaiterTables(){
 const router=useRouter();const bootstrap=useStaffBootstrap();const [token,setToken]=useState("");const [tenant,setTenant]=useState("");const [branch,setBranch]=useState("");const [branches,setBranches]=useState<Branch[]>([]);const [confirmedOrders,setOrders]=useState<Order[]>([]);const [permissions,setPermissions]=useState<string[]>([]);const [error,setError]=useState("");const [now,setNow]=useState(Date.now());const [readyOnly,setReadyOnly]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{const t=localStorage.getItem("restaurantos_access_token"),raw=localStorage.getItem("restaurantos_user");if(!t||!raw){router.replace("/login?next=%2Fstaff%2Ftables");return;}try{const m=JSON.parse(raw).memberships||[];if(!m.length)throw Error("No membership");setToken(t);setTenant(m[0].tenantId);}catch{router.replace("/login");}},[router]);
 useEffect(()=>{if(!token||!tenant)return;if(bootstrap?.token===token&&bootstrap.tenantId===tenant){setBranches(bootstrap.branches);setBranch(bootstrap.branches[0]?.id||"");setPermissions(bootstrap.access.permissions);return;}let live=true;read(awaitFetch());async function awaitFetch(){return fetch(API+"/api/v1/tenants/"+tenant+"/staff-operations/branches",{headers:{Authorization:"Bearer "+token}});}async function read(p:Promise<Response>){try{const response=await p;const raw=await response.json();if(!response.ok||!raw.success)throw Error(raw.message||"Cannot load branches");if(live){setBranches(raw.data);setBranch(raw.data[0]?.id||"");}}catch(e){if(live)setError(e instanceof Error?e.message:"Unable to load branches");}}return()=>{live=false;};},[token,tenant,bootstrap]);
 const scope=JSON.stringify([token,tenant,branch]),scopeRef=useRef(scope),version=useRef(0),metadataVersion=useRef(0);
 const reusedAccess=useRef(false);
 const {rows:orders,pending:busy,run}=useOptimisticStatus(scope,confirmedOrders);
 useEffect(()=>{scopeRef.current=scope;setOrders([]);setPermissions([]);return()=>{scopeRef.current="";version.current++;metadataVersion.current++;};},[scope]);
 const load=useCallback(async(resourceId?:string)=>{
  if(!branch||scopeRef.current!==scope)return;
  const current=++version.current,meta=resourceId?metadataVersion.current:++metadataVersion.current;
  const headers={Authorization:"Bearer "+token};
  const initialAccess=!reusedAccess.current&&bootstrap?.token===token&&bootstrap.tenantId===tenant&&bootstrap.branches[0]?.id===branch?bootstrap.access:null;
  if(!resourceId&&initialAccess)reusedAccess.current=true;
  try{await Promise.all([
   (async()=>{const rows:Order[]=await read(await fetch(API+"/api/v1/tenants/"+tenant+"/orders?branchId="+branch+"&live=true",{headers,cache:"no-store"}));if(scopeRef.current===scope&&version.current===current)setOrders(rows);})(),
   resourceId?Promise.resolve():(async()=>{const a=initialAccess??await read(await fetch(API+"/api/v1/tenants/"+tenant+"/staff-operations/access?branchId="+branch,{headers,cache:"no-store"}));if(scopeRef.current===scope&&metadataVersion.current===meta)setPermissions(a.permissions);})()
  ]);if(!resourceId&&scopeRef.current===scope&&version.current===current)setError("");}
  catch(e){if(scopeRef.current===scope&&version.current===current)setError(e instanceof Error?e.message:"Unable to load orders");}
 },[branch,tenant,token,scope,bootstrap]);
 useEffect(()=>{if(branch)void load();},[load,branch]);
 const realtimeStatus=useOrderEvents(token,tenant,branch,load);
 const ready=useMemo(()=>orders.filter(o=>o.status==="READY").sort((a,b)=>new Date(a.createdAt).getTime()-new Date(b.createdAt).getTime()),[orders]);
 const tables=useMemo(()=>{const result=new Map<string,Order[]>();for(const o of orders.filter(o=>readyOnly?o.status==="READY":["NEW","ACCEPTED","PREPARING","READY"].includes(o.status))){const key=o.tableName||"Unassigned";result.set(key,[...(result.get(key)||[]),o]);}return [...result.entries()].sort((a,b)=>Number(b[1].some(o=>o.status==="READY"))-Number(a[1].some(o=>o.status==="READY")));},[orders,readyOnly]);
 async function serve(o:Order){
  if(busy.has(o.id)||!permissions.includes("orders:manage")||o.status!=="READY")return;
  const status="SERVED";
  await run(o,status,async signal=>read(await fetch(API+"/api/v1/tenants/"+tenant+"/orders/"+o.id+"/status",{method:"PATCH",signal,headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({branchId:branch,status})})),
   confirmed=>{version.current++;setOrders(rows=>rows.map(row=>row.id===o.id&&row.status===o.status?{...row,status:confirmed}:row));},
   ()=>{void load("mutation");},
   e=>setError("Order #"+o.orderNumber+": "+(e instanceof Error?e.message:"Update not confirmed")+". Checking server status."));
 }
 return <main className="min-h-screen bg-[#f7f7f4]"><div className="mx-auto max-w-6xl px-5 py-8"><div className="mb-6 flex flex-wrap justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[#d36a45]">Staff / Waiter</p><h1 className="mt-2 flex items-center gap-2 text-3xl font-extrabold"><UtensilsCrossed/>Table service</h1><p className="mt-2 text-sm text-[#788078]">Orders grouped by table · {realtimeStatus==="connected"?"Live updates":realtimeStatus==="connecting"?"Connecting":"Offline · use Refresh"}</p></div><button onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm"><RefreshCw size={15}/>Refresh</button></div><label className="mb-6 block text-sm">Branch <select className="ml-2 rounded-lg border bg-white p-2" value={branch} onChange={e=>setBranch(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>{ready.length>0&&<div role="status" aria-live="polite" className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 font-bold text-emerald-900"><BellRing size={19}/>{ready.length} {ready.length===1?"order is":"orders are"} ready for pickup</div><button onClick={()=>setReadyOnly(v=>!v)} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">{readyOnly?"Show all active orders":"Show ready orders only"}</button></div><p className="mt-2 text-sm text-emerald-800">{ready.map(o=>(o.tableName||"Unassigned")+" (#"+o.orderNumber+")").join(" · ")}</p></div>}{ready.length===0&&readyOnly&&<button onClick={()=>setReadyOnly(false)} className="mb-4 rounded-lg border bg-white px-3 py-2 text-sm">Show all active orders</button>}{busy.size>0&&<p role="status" className="mb-3 text-xs font-medium text-amber-700">{busy.size} update{busy.size===1?"":"s"} syncing · continue with other tickets</p>}{error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{tables.length===0?<div className="rounded-2xl border bg-white p-8">No tables with active orders.</div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tables.map(([name,items])=><section key={name} className={`rounded-2xl border bg-white p-5 ${items.some(o=>o.status==="READY")?"border-emerald-400 ring-2 ring-emerald-100":""}`}><h2 className="text-lg font-bold">{name}</h2><p className="mb-4 text-xs text-[#788078]">{items.length} active orders {items.some(o=>o.status==="READY")?"· Food ready for pickup":""}</p><div className="space-y-3">{items.map(o=><div key={o.id} className={`rounded-xl p-3 ${o.status==="READY"?"bg-emerald-50 ring-1 ring-emerald-200":"bg-[#f7f7f4]"}`}><div className="flex justify-between gap-2"><b className="text-sm">#{o.orderNumber}</b><span className="text-xs font-bold text-[#d36a45]">{o.status}</span></div><p className="mt-2 text-sm">{o.itemsSummary}</p>{o.status==="READY"&&<p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-800"><Clock3 size={13}/>Order placed {Math.max(0,Math.floor((now-new Date(o.createdAt).getTime())/60000))} min ago · Collect from kitchen</p>}{o.status==="READY"&&permissions.includes("orders:manage")&&<button disabled={busy.has(o.id)} onClick={()=>void serve(o)} className="mt-3 rounded-lg bg-[#e7764c] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy.has(o.id)?"Syncing…":"Confirm served"}</button>}</div>)}</div></section>)}</div>}</div></main>;
}
