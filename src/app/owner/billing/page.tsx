"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {AlertCircle,CalendarClock,ReceiptText,RefreshCw} from "lucide-react";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Invoice={id:string;restaurantName:string;periodStart:string;periodEnd:string;dueOn:string;amountPaise:number;status:string;currency:string};
type Overview={invoices:Invoice[];unpaidPaise:number;overduePaise:number;dueSoonCount:number;asOf:string};
type Membership={tenantId:string;tenantName:string};
const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(n/100);
export default function OwnerBillingPage(){
 const [memberships,setMemberships]=useState<Membership[]>([]);
 const [tenantId,setTenantId]=useState("");
 const [data,setData]=useState<Overview|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{
  try{
   const raw=localStorage.getItem("restaurantos_user");
   const user=raw?JSON.parse(raw):{};
   const list:Membership[]=Array.isArray(user.memberships)?user.memberships:[];
   setMemberships(list);setTenantId(list[0]?.tenantId??"");
  }catch{setError("Unable to read your restaurant session.");}
 },[]);
 useEffect(()=>{
  if(!tenantId)return;
  const token=localStorage.getItem("restaurantos_access_token");
  if(!token){setError("Sign in to view billing.");return;}
  const controller=new AbortController();
  setLoading(true);setError("");setData(null);
  fetch(API+"/api/v1/tenants/"+encodeURIComponent(tenantId)+"/billing",{
   headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal
  }).then(async r=>{const body=await r.json();if(!r.ok||!body.success||!body.data)throw Error(body.message||"Billing information unavailable");return body.data as Overview;})
   .then(value=>{if(!controller.signal.aborted)setData(value);})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Billing information unavailable");})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[tenantId,refresh]);
 return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-[#b85d3e]">Restaurant subscription</p><h1 className="mt-1 text-3xl font-extrabold">Billing & invoices</h1><p className="mt-2 text-sm text-[#77796f]">View unpaid invoices and upcoming due dates. Payment collection is not available yet.</p></div><button type="button" disabled={loading} onClick={()=>setRefresh(n=>n+1)} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold disabled:opacity-50"><RefreshCw size={16}/>Refresh</button></div>
  {memberships.length>1&&<label className="mt-5 block text-sm font-bold">Restaurant<select value={tenantId} onChange={e=>setTenantId(e.target.value)} className="mt-2 block w-full max-w-sm rounded-xl border bg-white p-3">{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select></label>}
  {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  {loading?<p className="mt-6 text-sm">Loading invoices…</p>:data&&<>
   <div className="mt-6 grid gap-3 sm:grid-cols-3">
    {([{label:"Unpaid invoices",value:money(data.unpaidPaise),icon:ReceiptText},{label:"Overdue amount",value:money(data.overduePaise),icon:AlertCircle},{label:"Due within 7 days",value:String(data.dueSoonCount),icon:CalendarClock}] as const).map(({label,value,icon:Icon})=><section key={label} className="rounded-2xl border bg-white p-5"><p className="flex items-center gap-2 text-sm text-[#77796f]"><Icon size={17}/>{label}</p><p className="mt-3 text-2xl font-extrabold">{value}</p></section>)}
   </div>
   {data.overduePaise>0&&<p role="status" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">You have overdue invoices. Please contact RestaurantOS support to arrange payment. No online payment gateway is connected yet.</p>}
   {data.dueSoonCount>0&&<p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">A subscription invoice is due within the next 7 days.</p>}
   <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="text-lg font-extrabold">Invoice history</h2><p className="mt-1 text-xs text-[#77796f]">Latest 200 invoices. Status is administrative data, not independently verified settlement.</p>
   {data.invoices.length===0?<p className="mt-5 text-sm text-[#77796f]">No invoices issued yet.</p>:<div className="mt-4 divide-y">{data.invoices.map(i=><article key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-bold">{i.periodStart} — {i.periodEnd}</p><p className="mt-1 text-xs text-[#77796f]">Due {i.dueOn} · {i.status}</p></div><p className="font-extrabold">{money(i.amountPaise)}</p></article>)}</div>}</section>
   <p className="mt-4 text-xs text-[#77796f]">Balances reflect the latest 200 invoice records only, not a complete account statement. <Link href="/owner/features" className="font-bold text-[#b85d3e]">View plan & features</Link>.</p>
  </>}
 </main>;
}
