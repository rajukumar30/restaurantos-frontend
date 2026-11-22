"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {Activity,RefreshCw,ShieldCheck,Server,Database,ExternalLink} from "lucide-react";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Health={status?:string;components?:{db?:{status?:string}}};
type Result={checkedAt:string;api:"UP"|"DOWN"|"UNKNOWN";database:"UP"|"DOWN"|"UNKNOWN";latencyMs:number|null;error:string};
export default function PlatformMonitoring(){
 const [result,setResult]=useState<Result|null>(null);
 const [loading,setLoading]=useState(true);
 const check=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);
  const started=performance.now();
  try{
   const response=await fetch(API+"/actuator/health",{cache:"no-store",signal});
   if(!response.ok)throw new Error("Backend health endpoint returned HTTP "+response.status);
   const health:Health=await response.json();
   if(!signal?.aborted)setResult({checkedAt:new Date().toISOString(),api:health.status==="UP"?"UP":"DOWN",database:health.components?.db?.status==="UP"?"UP":health.components?.db?.status==="DOWN"?"DOWN":"UNKNOWN",latencyMs:Math.round(performance.now()-started),error:""});
  }catch(e){if(!signal?.aborted)setResult({checkedAt:new Date().toISOString(),api:"UNKNOWN",database:"UNKNOWN",latencyMs:null,error:e instanceof Error?e.message:"Unable to reach health endpoint"});}
  finally{if(!signal?.aborted)setLoading(false);}
 },[]);
 useEffect(()=>{const controller=new AbortController();void check(controller.signal);return()=>controller.abort();},[check]);
 const state=(status:string)=>status==="UP"?"text-green-700 bg-green-50":status==="DOWN"?"text-red-700 bg-red-50":"text-amber-800 bg-amber-50";
 return <main className="px-4 py-6 sm:px-8 sm:py-10">
  <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#c15d3c]">Platform operations</p><h1 className="mt-2 text-3xl font-extrabold">System monitoring</h1><p className="mt-2 text-sm text-[#77796f]">On-demand backend health checks. No automatic polling or background requests.</p></div><button type="button" disabled={loading} onClick={()=>void check()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold disabled:opacity-50"><RefreshCw size={16}/>{loading?"Checking…":"Check now"}</button></div>
  <div className="mt-6 grid gap-4 md:grid-cols-3">
   {([{label:"Backend API",value:result?.api??"UNKNOWN",icon:Server},{label:"Database",value:result?.database??"UNKNOWN",icon:Database},{label:"Health check latency",value:result?.latencyMs==null?"Unavailable":result.latencyMs+" ms",icon:Activity}] as const).map(({label,value,icon:Icon})=><section key={label} className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[#77796f]"><Icon size={18}/>{label}</div><p className={`mt-4 inline-block rounded-lg px-3 py-2 text-lg font-extrabold ${value==="UP"||value==="DOWN"||value==="UNKNOWN"?state(value):""}`}>{value}</p></section>)}
  </div>
  {result?.error&&<p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Health check could not be completed: {result.error}. This does not by itself prove the service is down; network or CORS restrictions may prevent the browser from reading the response.</p>}
  <section className="mt-5 rounded-2xl border bg-white p-5"><h2 className="flex items-center gap-2 font-extrabold"><ShieldCheck size={18}/> What this check verifies</h2><p className="mt-3 text-sm leading-6 text-[#77796f]">Backend status comes from the public Spring Boot Actuator health endpoint. Database status is displayed only if that endpoint explicitly exposes it; otherwise it remains Unknown. This is not a substitute for authenticated transaction tests, uptime monitoring, or infrastructure alerts.</p><p className="mt-3 text-xs text-[#77796f]">{result?"Last checked: "+new Date(result.checkedAt).toLocaleString("en-IN"):"No check completed yet."}</p><div className="mt-5 flex flex-wrap gap-4 text-sm font-bold text-[#b85d3e]"><Link href="/admin/dashboard">Platform dashboard</Link><Link href="/admin/audit">Audit logs</Link><a href={API+"/actuator/health"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1">Health endpoint <ExternalLink size={14}/></a></div></section>
 </main>;
}
