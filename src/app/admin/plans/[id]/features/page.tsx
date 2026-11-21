"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Feature={key:string;name:string;category:string;available:boolean;included:boolean;dependencies:string[]};
export default function PlanFeaturesPage(){
 const params=useParams();const id=String(params.id??"");const [features,setFeatures]=useState<Feature[]>([]);
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState<string|null>(null);const [error,setError]=useState("");
 const [editable,setEditable]=useState(false);const [permissionError,setPermissionError]=useState("");
 useEffect(()=>{if(!id)return;const controller=new AbortController();
 const token=localStorage.getItem("restaurantos_access_token");
 const headers={Authorization:"Bearer "+token};
 async function load(){
  setLoading(true);setError("");setPermissionError("");
  try{
   const r=await fetch(API+"/api/v1/platform/plans/"+encodeURIComponent(id)+"/features",{headers,signal:controller.signal,cache:"no-store"});
   const p=await r.json();
   if(!r.ok||!p.success||!Array.isArray(p.data))throw Error(p.message||"Unable to load plan features");
   if(!controller.signal.aborted)setFeatures(p.data);
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Unable to load features");}
  finally{if(!controller.signal.aborted)setLoading(false);}
  try{
   const r=await fetch(API+"/api/v1/platform/plans",{headers,signal:controller.signal,cache:"no-store"});
   const p=await r.json();
   if(!r.ok||!p.success||!Array.isArray(p.data))throw Error(p.message||"Unable to check plan status");
   const plan=p.data.find((item:{id:string})=>item.id===id);
   if(!plan)throw Error("Plan not found");
   let allowed=plan.status==="DRAFT";
   if(plan.status==="ARCHIVED"){
    try{
     const check=await fetch(API+"/api/v1/platform/plans/"+encodeURIComponent(id)+"/feature-editable",{headers,signal:controller.signal,cache:"no-store"});
     const result=await check.json();
     if(!check.ok||!result.success)throw Error(result.message||"Unable to verify editing permission");
     allowed=result.data===true;
    }catch(e){if(!controller.signal.aborted)setPermissionError("Feature editing cannot be verified yet. "+(e instanceof Error?e.message:"Please retry."));}
   }
   if(!controller.signal.aborted)setEditable(allowed);
  }catch(e){if(!controller.signal.aborted)setPermissionError(e instanceof Error?e.message:"Unable to check editing permission");}
 }
 void load();return()=>controller.abort();
 },[id]);
 async function toggle(f:Feature){if(!editable||saving)return;setSaving(f.key);setError("");try{const token=localStorage.getItem("restaurantos_access_token");const r=await fetch(API+"/api/v1/platform/plans/"+encodeURIComponent(id)+"/features/"+encodeURIComponent(f.key),{method:"PUT",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({included:!f.included})});const p=await r.json();if(!r.ok||!p.success)throw Error(p.message||"Unable to update feature");setFeatures(p.data);}catch(e){setError(e instanceof Error?e.message:"Unable to update feature");}finally{setSaving(null);}}
 return <main className="px-4 py-6 sm:px-8 sm:py-10"><Link href="/admin/plans" className="text-sm font-semibold text-[#b85d3e]">← Plan catalog</Link><h1 className="mt-4 text-2xl font-extrabold">Plan features</h1><p className="mt-2 text-sm text-[#77796f]">Choose which features this subscription tier includes. Draft plans and archived plans without subscription history can change features. Active plans and archived plans with subscribers are protected.</p>
 {permissionError&&<p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{permissionError}</p>}
 {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
 {loading?<p className="mt-6 text-sm">Loading features…</p>:<section className="mt-6 grid gap-3 sm:grid-cols-2">{features.map(f=><article key={f.key} className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4"><div><h2 className="text-sm font-bold">{f.name}</h2><p className="mt-1 text-xs text-[#77796f]">{f.category}{f.dependencies.length?" · Requires "+f.dependencies.join(", "):""}</p>{!f.available&&<p className="mt-1 text-xs text-amber-700">Not yet available</p>}</div><button type="button" role="switch" aria-checked={f.included} aria-label={f.name} disabled={!editable||saving!==null||(!f.available&&!f.included)} onClick={()=>void toggle(f)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-40 ${f.included?"bg-[#e56a42]":"bg-slate-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${f.included?"left-6":"left-1"}`}/></button></article>)}</section>}
 {!loading&&!editable&&!permissionError&&<p className="mt-5 text-sm text-[#77796f]">Read-only: active plans and archived plans with subscription history cannot change their included features.</p>}</main>;
}
