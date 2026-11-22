"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Plan={id:string;name:string;monthlyPricePaise:number;annualPricePaise:number};
type Subscription={id:string;tenantId:string;restaurantName:string;planId:string;planName:string;billingCycle:string;status:string;lifecycleStatus:string;freeAccessNow:boolean;endsOn:string|null};
type Envelope<T>={success:boolean;message?:string;data?:T};
type Payment={id:string;tenantId:string;restaurantName:string;subscriptionId:string;amountPaise:number;currency:string;status:string;provider:string;providerPaymentId:string|null;createdAt:string};
const money=(p:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(p/100);
export default function PlatformBillingPage(){
 const [plans,setPlans]=useState<Plan[]>([]),[subscriptions,setSubscriptions]=useState<Subscription[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[search,setSearch]=useState("");
 const [payments,setPayments]=useState<Payment[]>([]),[paymentError,setPaymentError]=useState("");
 useEffect(()=>{const controller=new AbortController();const token=localStorage.getItem("restaurantos_access_token");
 if(!token){setError("Sign in to view the subscription overview.");setLoading(false);return;}
 Promise.all(["/api/v1/platform/plans","/api/v1/platform/subscriptions"].map(async path=>{
  const response=await fetch(API+path,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal});
  const body:Envelope<unknown[]>=await response.json();if(!response.ok||!body.success||!Array.isArray(body.data))throw Error(body.message||"Unable to load subscription overview");
  return body.data;
 })).then(([p,s])=>{if(!controller.signal.aborted){setPlans(p as Plan[]);setSubscriptions(s as Subscription[]);}})
 .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Unable to load subscription overview");})
 .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
 fetch(API+"/api/v1/platform/billing/payments",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal})
 .then(async r=>{const body:Envelope<Payment[]>=await r.json();if(!r.ok||!body.success||!Array.isArray(body.data))throw Error(body.message||"Unable to load payment ledger");return body.data;})
 .then(data=>{if(!controller.signal.aborted)setPayments(data);})
 .catch(e=>{if(!controller.signal.aborted)setPaymentError(e instanceof Error?e.message:"Payment ledger unavailable");});
 return()=>controller.abort();
 },[]);
 const rows=useMemo(()=>subscriptions.filter(s=>s.status==="ACTIVE"&&(s.lifecycleStatus==="ACTIVE"||s.lifecycleStatus==="FREE_PERIOD")).map(s=>{
  const plan=plans.find(p=>p.id===s.planId);
  const rate=plan?(s.billingCycle==="ANNUAL"?plan.annualPricePaise:plan.monthlyPricePaise):null;
  return {...s,rate};
 }),[subscriptions,plans]);
 const visible=rows.filter(s=>[s.restaurantName,s.planName].join(" ").toLowerCase().includes(search.toLowerCase()));
 function exportReference(){
  const quote=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;
  const data=[["Restaurant","Plan","Billing cycle","Lifecycle","Catalog price (INR)","Free access","End date"],...visible.map(s=>[s.restaurantName,s.planName,s.billingCycle,s.lifecycleStatus,s.rate===null?"":(s.rate/100).toFixed(2),s.freeAccessNow?"YES":"NO",s.endsOn??""])];
  const csv="\uFEFF"+data.map(r=>r.map(quote).join(",")).join("\r\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  const a=document.createElement("a");a.href=url;a.download="restaurantos-plan-price-reference.csv";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
 }
 return <main className="px-4 py-5 sm:px-8 sm:py-10">
 <p className="text-xs font-bold uppercase tracking-widest text-[#c15d3c]">Platform business</p>
 <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Billing overview</h1>
 <p className="mt-2 text-sm text-[#77796f]">Current subscription plan prices and access periods. This is not a payment ledger, invoice register, revenue report, or proof of collection.</p>
 <div className="mt-5 flex flex-wrap gap-3"><Link href="/admin/subscriptions" className="rounded-xl border bg-white px-4 py-3 text-sm font-bold">Manage subscriptions</Link><Link href="/admin/plans" className="rounded-xl border bg-white px-4 py-3 text-sm font-bold">Plan catalog</Link></div>
 {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
 <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Active subscription price reference</h2><p className="mt-1 text-xs text-[#77796f]">Prices come from the current plan catalog. Historical plan prices, discounts, taxes, refunds, and actual collections are not represented. Subscription API results are limited to the 200 most recent records; this is not a complete platform-wide financial report.</p>
 <button type="button" onClick={exportReference} disabled={loading||!!error||visible.length===0} className="mt-4 rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-40">Export price reference CSV</button>
 <input aria-label="Search restaurants" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search restaurant or plan" className="mt-4 w-full rounded-xl border p-3 text-sm"/>
 {loading?<p className="mt-4 text-sm">Loading…</p>:!error&&visible.length===0?<p className="mt-4 text-sm text-[#77796f]">No matching active subscriptions.</p>:<div className="mt-4 divide-y">{visible.map(s=><article key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><Link className="font-bold text-[#b85d3e]" href={"/admin/restaurants/"+encodeURIComponent(s.tenantId)}>{s.restaurantName}</Link><p className="mt-1 text-xs text-[#77796f]">{s.planName} · {s.billingCycle.toLowerCase()} · {s.lifecycleStatus.replaceAll("_"," ").toLowerCase()}{s.endsOn?" · Ends "+s.endsOn:""}</p></div><div className="text-right"><p className="font-bold">{s.rate===null?"Price unavailable":money(s.rate)}</p><p className="text-xs text-[#77796f]">Catalog price / {s.billingCycle.toLowerCase()}</p>{s.freeAccessNow&&<p className="text-xs font-bold text-green-700">Free access currently applies</p>}</div></article>)}</div>}
 </section>
 <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Subscription payment ledger</h2>
 <p className="mt-1 text-xs text-[#77796f]">Latest 200 payment records. Payment status is recorded data, not independently verified gateway settlement.</p>
 {paymentError?<p role="alert" className="mt-4 text-sm text-red-700">{paymentError}</p>:payments.length===0?<p className="mt-4 text-sm text-[#77796f]">No subscription payments recorded yet.</p>:<div className="mt-4 divide-y">{payments.map(p=><article key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-bold">{p.restaurantName}</p><p className="text-xs text-[#77796f]">{p.provider} · {p.providerPaymentId||"No provider reference"} · {new Date(p.createdAt).toLocaleString("en-IN")}</p></div><div className="text-right"><p className="font-bold">{money(p.amountPaise)}</p><p className="text-xs font-bold">{p.status}</p></div></article>)}</div>}
 </section><p className="mt-4 text-xs text-[#77796f]">Restaurant order payments are separate from platform subscription payments. No subscription payment collection or reconciliation is implemented by this page.</p>
 </main>;
}
