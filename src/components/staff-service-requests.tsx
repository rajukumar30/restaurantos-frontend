"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {BellRing,RefreshCw} from "lucide-react";
import {useOrderEvents} from "@/lib/realtime/use-order-events";
import {useOptimisticStatus} from "@/lib/use-optimistic-status";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
type Request={id:string;type:string;status:string;notes?:string;tableName:string;createdAt:string};
const labels:Record<string,string>={WAITER:"Call waiter",CLEANING:"Clean table",WATER:"Drinking water",CUTLERY:"Cutlery",BILL:"Request bill",OTHER:"Other request"};
async function json(res:Response){const b=await res.json();if(!res.ok||!b.success)throw Error(b.message||"Request failed");return b.data;}
export default function StaffServiceRequests({tenantId,branchId,token,canManage}:{tenantId:string;branchId:string;token:string;canManage:boolean}){
 const [confirmedRequests,setRequests]=useState<Request[]>([]);
 const [error,setError]=useState("");
 const scope=JSON.stringify([token,tenantId,branchId]),scopeRef=useRef(scope),version=useRef(0);
 const {rows:requests,pending:updating,run}=useOptimisticStatus(scope,confirmedRequests);
 useEffect(()=>{scopeRef.current=scope;setRequests([]);return()=>{scopeRef.current="";version.current++;};},[scope]);
 const load=useCallback(async(resourceId?:string)=>{if(!tenantId||!branchId||!token||scopeRef.current!==scope)return;const current=++version.current;try{const rows=await json(await fetch(API+"/api/v1/tenants/"+tenantId+"/service-requests?branchId="+branchId,{headers:{Authorization:"Bearer "+token},cache:"no-store"}));if(scopeRef.current===scope&&version.current===current){setRequests(rows);if(!resourceId)setError("");}}catch(e){if(scopeRef.current===scope&&version.current===current)setError(e instanceof Error?e.message:"Unable to load service requests");}},[tenantId,branchId,token,scope]);
 useEffect(()=>{void load();},[load]);
 const realtimeStatus=useOrderEvents(token,tenantId,branchId,load,"service-requests");
 async function advance(r:Request){
  if(!canManage||updating.has(r.id)||!["REQUESTED","ON_THE_WAY"].includes(r.status))return;
  const status=r.status==="REQUESTED"?"ON_THE_WAY":"COMPLETED";
  await run(r,status,async signal=>json(await fetch(API+"/api/v1/tenants/"+tenantId+"/service-requests/"+r.id+"?branchId="+branchId,{method:"PATCH",signal,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({status})})),
   confirmed=>{version.current++;setRequests(rows=>confirmed==="COMPLETED"?rows.filter(row=>row.id!==r.id):rows.map(row=>row.id===r.id&&row.status===r.status?{...row,status:confirmed}:row));},
   ()=>{void load("mutation");},
   e=>setError("Service request: "+(e instanceof Error?e.message:"Update not confirmed")+". Checking server status."));
 }
 return <section className="mt-8 rounded-3xl border border-[#e3e8e0] bg-white p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><BellRing size={22} className="text-[#278348]"/><h2 className="text-xl font-extrabold">Service requests</h2><span className="rounded-full bg-[#e9f5eb] px-2 py-0.5 text-xs font-bold text-[#287646]">{requests.length}</span></div><button onClick={()=>void load()} className="flex items-center gap-1 text-xs font-bold text-[#287646]"><RefreshCw size={14}/> Refresh</button></div><p className="mt-2 text-xs text-[#7b8378]">Table assistance requests · {realtimeStatus==="connected"?"Live updates":realtimeStatus==="connecting"?"Connecting":"Offline · use Refresh"}</p>{updating.size>0&&<p role="status" className="mb-3 text-xs font-medium text-amber-700">{updating.size} update{updating.size===1?"":"s"} syncing · continue with other tickets</p>}{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{requests.length===0?<p className="mt-5 rounded-xl bg-[#f5f7f3] p-4 text-sm text-[#778077]">No pending service requests.</p>:<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{requests.map(r=><article key={r.id} className="rounded-2xl border border-[#e5e9e2] p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-extrabold">{r.tableName}</h3><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${r.status==="REQUESTED"?"bg-amber-50 text-amber-700":"bg-blue-50 text-blue-700"}`}>{r.status==="COMPLETED"?"Completed · syncing":r.status==="REQUESTED"?"New":"On the way"}</span></div><p className="mt-2 text-sm font-semibold">{labels[r.type]||r.type}</p>{r.notes&&<p className="mt-1 text-xs text-[#777]">{r.notes}</p>}<div className="mt-4 flex items-center justify-between gap-2"><span className="text-xs text-[#777]">{new Date(r.createdAt).toLocaleTimeString()}</span>{canManage&&r.status!=="COMPLETED"&&<button disabled={updating.has(r.id)} onClick={()=>void advance(r)} className="rounded-lg bg-[#243128] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{updating.has(r.id)?"Syncing…":r.status==="REQUESTED"?"Accept":"Mark complete"}</button>}</div></article>)}</div>}</section>;
}
