"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Delivery={id:string;status:string;attempts:number;restaurantName:string;reminderType:string;dueOn:string;createdAt:string;sentAt:string|null;nextAttemptAt:string|null;lastError:string|null};
type Status={enabled:boolean;configured:boolean;deliverySummary:{status:string;count:number}[];recentDeliveries:Delivery[]};
export default function BillingEmailPage(){
 const [data,setData]=useState<Status|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const load=useCallback(async()=>{
  const token=localStorage.getItem("restaurantos_access_token");
  if(!token){setError("Please sign in as Platform Admin.");return;}
  setLoading(true);setError("");
  try{
   const res=await fetch(API+"/api/v1/platform/billing/email/status",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const body=await res.json();
   if(!res.ok||!body.success)throw Error(body.message||"Could not load delivery status");
   setData(body.data);
  }catch(e){setError(e instanceof Error?e.message:"Unable to load delivery status");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/admin/billing" className="text-sm font-semibold text-[#b85d3e]">← Billing overview</Link><h1 className="mt-2 text-3xl font-extrabold">Subscription email delivery</h1><p className="mt-2 text-sm text-[#77796f]">Platform-only visibility into reminder delivery. No passwords or recipient email addresses are displayed.</p></div><button type="button" onClick={()=>void load()} disabled={loading} className="rounded-xl border bg-white px-4 py-3 text-sm font-bold disabled:opacity-50">Refresh</button></div>
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  {loading&&<p className="mt-5 text-sm">Loading delivery status…</p>}
  {data&&<><div className="mt-6 grid gap-3 sm:grid-cols-2"><section className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#77796f]">Email dispatch</p><p className="mt-2 text-xl font-extrabold">{data.enabled?"Enabled":"Disabled"}</p></section><section className="rounded-2xl border bg-white p-5"><p className="text-sm text-[#77796f]">Basic sender configuration</p><p className="mt-2 text-xl font-extrabold">{data.configured?"Present":"Incomplete"}</p></section></div>
   <p className="mt-4 text-sm text-[#77796f]">Configuration presence does not verify SMTP authentication or actual delivery. Enable sending only after credential rotation and testing.</p>
   <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="text-lg font-extrabold">Outbox totals</h2>{data.deliverySummary.length===0?<p className="mt-3 text-sm text-[#77796f]">No email delivery records yet.</p>:<div className="mt-4 flex flex-wrap gap-3">{data.deliverySummary.map(s=><div key={s.status} className="rounded-xl border px-4 py-3"><p className="text-xs text-[#77796f]">{s.status}</p><p className="text-xl font-extrabold">{s.count}</p></div>)}</div>}</section>
   <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="text-lg font-extrabold">Recent delivery attempts</h2>{data.recentDeliveries.length===0?<p className="mt-3 text-sm text-[#77796f]">No attempts recorded yet.</p>:<div className="mt-3 divide-y">{data.recentDeliveries.map(e=><div key={e.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><div><p className="font-bold">{e.restaurantName} · {e.reminderType.replaceAll("_"," ")}</p><p className="mt-1 text-xs text-[#77796f]">Due {e.dueOn} · Attempts {e.attempts}{e.lastError?" · "+e.lastError:""}</p></div><span className="font-bold">{e.status}</span></div>)}</div>}</section>
  </>}
 </main>;
}
