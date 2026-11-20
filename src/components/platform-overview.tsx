"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Building2, ChartColumnIncreasing, CirclePlus, ClipboardList, Store } from "lucide-react";

const API=process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://restaurantos-backend-kz2r.onrender.com";
export type Overview={restaurants:number;activeRestaurants:number;branches:number;ordersLast30Days:number;grossOrderValueLast30Days:number;dailyOrders:{date:string;orders:number;grossOrderValue:number}[]};
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(v);
const num=(v:number)=>new Intl.NumberFormat("en-IN").format(v);
export function usePlatformOverview(){
  const [data,setData]=useState<Overview|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const token=localStorage.getItem("restaurantos_access_token");
    if(!token){setLoading(false);return;}
    const controller=new AbortController();
    async function load(){
      try{
        const response=await fetch(API+"/api/v1/platform/analytics/overview",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal});
        const payload=await response.json();
        if(!response.ok||!payload.success)throw new Error(payload.message||"Analytics unavailable");
        if(!controller.signal.aborted)setData(payload.data);
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Analytics unavailable");}
      finally{if(!controller.signal.aborted)setLoading(false);}
    }
    void load();return()=>controller.abort();
  },[]);
  return {data,error,loading};
}
export function Metrics({data}:{data:Overview}){
  const cards=[
    {name:"Total restaurants",value:num(data.restaurants),detail:"All registered tenants",icon:Store},
    {name:"Active restaurants",value:num(data.activeRestaurants),detail:"Active tenant accounts",icon:Activity},
    {name:"Restaurant branches",value:num(data.branches),detail:"Across all restaurants",icon:Building2},
    {name:"Orders processed",value:num(data.ordersLast30Days),detail:"Last 30 days",icon:ClipboardList},
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({name,value,detail,icon:Icon})=><section key={name} className="rounded-2xl border border-[#e8e5dd] bg-white p-5 shadow-sm"><div className="mb-5 flex items-center justify-between"><span className="text-sm font-semibold text-[#666b62]">{name}</span><span className="rounded-xl bg-[#fff1e9] p-2 text-[#c15d3c]"><Icon size={19}/></span></div><p className="text-3xl font-extrabold tracking-tight tabular-nums">{value}</p><p className="mt-2 text-xs text-[#858a80]">{detail}</p></section>)}</div>;
}
export function OrderChart({data}:{data:Overview}){
  const max=Math.max(1,...data.dailyOrders.map(d=>d.orders));
  return <section className="rounded-2xl border border-[#e8e5dd] bg-white p-5 shadow-sm sm:p-6"><div className="mb-6 flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-extrabold">Order activity</h2><p className="mt-1 text-sm text-[#858a80]">Daily orders over the past 7 days · UTC</p></div><span className="rounded-full bg-[#f5f4ef] px-3 py-1 text-xs font-semibold">Last 7 days</span></div><div className="flex h-48 items-end gap-2 border-b border-[#e8e5dd] pb-1 sm:gap-4">{data.dailyOrders.map(day=><div key={day.date} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={day.date+": "+day.orders+" orders"}><span className="text-[11px] font-semibold tabular-nums text-[#73796f]">{day.orders}</span><div className="w-full max-w-16 rounded-t-lg bg-[#e56a42] transition-colors group-hover:bg-[#b94c2d]" style={{height:Math.max(3,(day.orders/max)*140)+"px"}}/><span className="text-[10px] text-[#858a80]">{new Date(day.date+"T12:00:00Z").toLocaleDateString("en-IN",{weekday:"short",timeZone:"UTC"})}</span></div>)}</div></section>;
}
export function OverviewDashboard(){
  const {data,error,loading}=usePlatformOverview();
  return <div className="px-5 py-8 sm:px-8 sm:py-10">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#c15d3c]">Platform overview</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome to your control center</h1><p className="mt-2 text-sm text-[#77796f]">A clear view of your restaurants, operations and platform activity.</p></div><Link href="/admin/restaurants/new" className="inline-flex items-center gap-2 rounded-xl bg-[#e56a42] px-4 py-3 text-sm font-bold text-white hover:bg-[#c95b37]"><CirclePlus size={17}/> Add restaurant</Link></div>
    {error&&<p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading?<p role="status" className="rounded-xl bg-white p-6 text-sm">Loading live platform metrics…</p>:data?<><Metrics data={data}/><div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><OrderChart data={data}/><section className="rounded-2xl border border-[#e8e5dd] bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><ChartColumnIncreasing className="text-[#e56a42]" size={20}/><h2 className="text-lg font-extrabold">Order value</h2></div><p className="mt-7 text-xs font-semibold uppercase tracking-widest text-[#858a80]">Gross food order value · 30 days</p><p className="mt-3 break-words text-3xl font-extrabold">{money(data.grossOrderValueLast30Days)}</p><p className="mt-3 text-sm leading-6 text-[#77796f]">Restaurant sales volume, not RestaurantOS subscription revenue. Subscription billing analytics will appear when billing is implemented.</p><Link href="/admin/analytics" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-[#b85d3e]">Explore analytics <ArrowRight size={16}/></Link></section></div></>:null}
    <section className="mt-6 rounded-2xl border border-[#e8e5dd] bg-white p-6"><h2 className="text-lg font-extrabold">Quick actions</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{[{title:"Manage restaurants",href:"/admin/restaurants"},{title:"Configure features",href:"/admin/restaurants/features"},{title:"View analytics",href:"/admin/analytics"}].map(a=><Link key={a.href} href={a.href} className="flex items-center justify-between rounded-xl border border-[#e8e5dd] p-4 text-sm font-semibold hover:border-[#e56a42]">{a.title}<ArrowRight size={16}/></Link>)}</div></section>
  </div>;
}
