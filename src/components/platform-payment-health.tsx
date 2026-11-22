"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Payment={id:string;tenantId:string;restaurantName:string;amountPaise:number;status:string;provider:string;createdAt:string};
type Envelope={success:boolean;message?:string;data?:Payment[]};
const money=(paise:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(paise/100);

export default function PlatformPaymentHealth(){
 const [payments,setPayments]=useState<Payment[]|null>(null);
 const [error,setError]=useState("");
 const [refreshing,setRefreshing]=useState(false);
 async function load(signal?:AbortSignal){
  const token=localStorage.getItem("restaurantos_access_token");
  if(!token){setError("Sign in to review payments.");return;}
  setRefreshing(true);setError("");
  try{
   const response=await fetch(API+"/api/v1/platform/billing/payments",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal});
   const body:Envelope=await response.json();
   if(!response.ok||!body.success||!Array.isArray(body.data))throw Error(body.message||"Payment ledger unavailable");
   if(!signal?.aborted)setPayments(body.data);
  }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"Payment ledger unavailable");}
  finally{if(!signal?.aborted)setRefreshing(false);}
 }
 useEffect(()=>{const controller=new AbortController();void load(controller.signal);return()=>controller.abort();},[]);
 const pending=useMemo(()=>payments?.filter(p=>p.status==="PENDING")??[],[payments]);
 const stale=useMemo(()=>pending.filter(p=>Date.now()-Date.parse(p.createdAt)>24*60*60*1000),[pending]);
 return <section className="mt-5 rounded-2xl border border-[#e8e5dd] bg-white p-5 shadow-sm sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold">Payment review queue</h2><p className="mt-1 text-sm text-[#77796f]">Administrative subscription payments only; no gateway settlement verification.</p></div><div className="flex gap-3"><button type="button" disabled={refreshing} onClick={()=>void load()} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-40">{refreshing?"Refreshing…":"Refresh"}</button><Link href="/admin/billing" className="rounded-lg border px-3 py-2 text-xs font-bold">Open billing</Link></div></div>
  {error?<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>:payments===null?<p className="mt-4 text-sm">Loading payment records…</p>:<>
   <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">{([["Pending attempts",pending.length],["Older than 24 hours",stale.length],["Ledger records reviewed",payments.length]] as const).map(([label,value])=><div key={label} className="rounded-xl bg-[#f7f4ec] p-4"><p className="text-xs font-semibold text-[#77796f]">{label}</p><p className="mt-2 text-2xl font-extrabold tabular-nums">{value}</p></div>)}</div>
   <p className="mt-3 text-xs text-[#77796f]">Based on the latest 200 ledger records, not a platform-wide total. Pending does not mean paid.</p>
   <div className="mt-4 divide-y">{pending.slice(0,5).map(p=><div key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm"><div><Link href={"/admin/restaurants/"+encodeURIComponent(p.tenantId)} className="font-bold text-[#b85d3e]">{p.restaurantName}</Link><p className="text-xs text-[#77796f]">{p.provider} · {new Date(p.createdAt).toLocaleString("en-IN")}</p></div><span className="font-bold">{money(p.amountPaise)}</span></div>)}{pending.length===0&&<p className="py-3 text-sm text-[#77796f]">No pending payments among the latest records.</p>}{pending.length>5&&<p className="py-3 text-xs text-[#77796f]">Showing 5 of {pending.length} pending records. Review all in billing.</p>}</div>
  </>}
 </section>;
}
