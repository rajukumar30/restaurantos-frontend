"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChefHat, Clock3, RefreshCw, Search, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"http://localhost:8080";
type Membership={tenantId:string;tenantName:string;roles:string};
type Branch={id:string;name:string;branchCode:string};
type Order={id:string;orderNumber:string;tableName:string;status:string;totalAmount:number;lineCount:number;itemCount:number;itemsSummary:string;createdAt:string};
const filters=["ALL","NEW","ACCEPTED","PREPARING","READY","SERVED","CANCELLED"];
const nextStatus:Record<string,string>={NEW:"ACCEPTED",ACCEPTED:"PREPARING",PREPARING:"READY",READY:"SERVED"};
const statusLabel:Record<string,string>={NEW:"New order",ACCEPTED:"Accepted",PREPARING:"Preparing",READY:"Ready",SERVED:"Served",CANCELLED:"Cancelled"};
const tone:Record<string,string>={NEW:"bg-[#fbede7] text-[#c65e3d]",ACCEPTED:"bg-[#eaf0f6] text-[#55799c]",PREPARING:"bg-[#f8f0dc] text-[#98752d]",READY:"bg-[#eaf2e9] text-[#527a5b]",SERVED:"bg-[#efeee9] text-[#77796f]",CANCELLED:"bg-[#f2e8e8] text-[#a34e4e]"};

export default function OrdersPage(){
  const router=useRouter();
  const [token,setToken]=useState("");
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [tenantId,setTenantId]=useState("");
  const [branches,setBranches]=useState<Branch[]>([]);
  const [branchId,setBranchId]=useState("");
  const [orders,setOrders]=useState<Order[]>([]);
  const [filter,setFilter]=useState("ALL");
  const [search,setSearch]=useState("");
  const [loading,setLoading]=useState(true);
  const [updating,setUpdating]=useState("");
  const [error,setError]=useState("");
  const [lastUpdated,setLastUpdated]=useState<Date|null>(null);

  useEffect(()=>{
    const accessToken=localStorage.getItem("restaurantos_access_token")??"";
    const raw=localStorage.getItem("restaurantos_user");
    if(!accessToken||!raw){router.replace("/login");return;}
    try{const user=JSON.parse(raw);const list:Membership[]=user.memberships??[];if(!list.length){router.replace("/login");return;}setToken(accessToken);setMemberships(list);setTenantId(list[0].tenantId);}
    catch{router.replace("/login");}
  },[router]);

  useEffect(()=>{
    if(!token||!tenantId)return;let cancelled=false;
    async function loadBranches(){
      try{const response=await fetch(API+"/api/v1/tenants/"+tenantId+"/branches",{headers:{Authorization:"Bearer "+token}});const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Unable to load branches.");if(!cancelled){setBranches(payload.data);setBranchId(current=>payload.data.some((b:Branch)=>b.id===current)?current:(payload.data[0]?.id??""));}}
      catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to load branches.");}
    }
    loadBranches();return()=>{cancelled=true;};
  },[token,tenantId]);

  const loadOrders=useCallback(async(showLoader=false)=>{
    if(!token||!tenantId||!branchId)return;
    if(showLoader)setLoading(true);
    try{
      const response=await fetch(API+"/api/v1/tenants/"+tenantId+"/orders?branchId="+branchId,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Unable to load orders.");
      setOrders(payload.data);setLastUpdated(new Date());setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load orders.");}
    finally{setLoading(false);}
  },[token,tenantId,branchId]);

  useEffect(()=>{if(!branchId)return;loadOrders(true);const timer=window.setInterval(()=>loadOrders(false),10000);return()=>window.clearInterval(timer);},[branchId,loadOrders]);

  async function updateStatus(order:Order,status:string){
    setUpdating(order.id);setError("");
    try{
      const response=await fetch(API+"/api/v1/tenants/"+tenantId+"/orders/"+order.id+"/status",{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({branchId,status})});
      const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Could not update order.");
      await loadOrders(false);
    }catch(e){setError(e instanceof Error?e.message:"Unable to update order.");}
    finally{setUpdating("");}
  }

  const visible=useMemo(()=>orders.filter(order=>(filter==="ALL"||order.status===filter)&&((order.orderNumber+" "+order.tableName+" "+order.itemsSummary).toLowerCase().includes(search.toLowerCase()))),[orders,filter,search]);
  const counts=useMemo(()=>Object.fromEntries(filters.map(key=>[key,key==="ALL"?orders.length:orders.filter(o=>o.status===key).length])),[orders]);
  const pending=orders.filter(o=>["NEW","ACCEPTED","PREPARING","READY"].includes(o.status)).length;
  const money=(value:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);
  const time=(value:string)=>new Intl.DateTimeFormat("en-IN",{hour:"numeric",minute:"2-digit"}).format(new Date(value));
  function logout(){localStorage.removeItem("restaurantos_access_token");localStorage.removeItem("restaurantos_user");router.push("/login");}

  return <main className="min-h-screen bg-[#f7f4ec]">
    <header className="flex items-center justify-between border-b border-[#e9e5dc] bg-[#fffefa] px-5 py-4 sm:px-9"><div className="flex items-center gap-3"><div className="brand-mark">r.</div><div><div className="font-bold tracking-tight">restaurant<span className="text-[#E56A42]">os</span></div><div className="text-[9px] uppercase tracking-[.16em] text-[#99998f]">Orders & kitchen</div></div></div><div className="flex gap-2"><Link href="/" className="ghost-button inline-flex items-center gap-2"><ArrowLeft size={14}/> Dashboard</Link><button onClick={logout} className="ghost-button hidden sm:block">Sign out</button></div></header>
    <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><div className="eyebrow">Workspace / Order operations</div><h1 className="mt-2 text-3xl font-bold tracking-[-.055em] sm:text-4xl">Orders & kitchen<span className="text-[#E56A42]">.</span></h1><p className="mt-3 text-sm text-[#77796f]">Track incoming orders and move them through the kitchen workflow.</p></div><div className="flex items-center gap-3"><div className="text-right"><div className="text-xs font-semibold">{lastUpdated?"Updated "+time(lastUpdated.toISOString()):"Waiting for updates"}</div><div className="mt-1 text-[10px] text-[#99998f]">Auto-refreshes every 10 seconds</div></div><button onClick={()=>loadOrders(true)} className="ghost-button inline-flex items-center gap-2"><RefreshCw size={14}/> Refresh</button></div></div>
      <div className="mb-6 flex flex-wrap items-center gap-3"><label className="text-xs text-[#77796f]">Restaurant</label><select value={tenantId} onChange={e=>{setTenantId(e.target.value);setBranchId("");}} className="ghost-button">{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select><label className="ml-2 text-xs text-[#77796f]">Branch</label><select value={branchId} onChange={e=>setBranchId(e.target.value)} className="ghost-button"><option value="">Select branch</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Orders today" value={orders.length}/><Metric label="Active queue" value={pending}/><Metric label="New orders" value={orders.filter(o=>o.status==="NEW").length}/><Metric label="Ready to serve" value={orders.filter(o=>o.status==="READY").length}/></div>
      {error&&<div role="alert" className="mb-5 rounded-xl bg-[#fbede7] px-4 py-3 text-xs text-[#a7442a]">{error}</div>}
      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[#eeeae2] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><ChefHat size={18} className="text-[#d36a45]"/><h2 className="font-bold">Kitchen queue</h2></div><p className="mt-1 text-xs text-[#99998f]">Newest orders appear first</p></div><div className="relative w-full sm:max-w-xs"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#99998f]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search order, table or item…" className="w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] py-2.5 pl-9 pr-3 text-xs outline-none focus:border-[#d68b6d]"/></div></div>
        <div className="flex gap-2 overflow-x-auto border-b border-[#eeeae2] px-5 py-3 sm:px-6">{filters.map(key=><button key={key} onClick={()=>setFilter(key)} className={"shrink-0 rounded-full px-3 py-2 text-[10px] font-bold transition "+(filter===key?"bg-[#252922] text-white":"bg-[#f4f1e9] text-[#77796f] hover:bg-[#ebe7de]")}>{key==="ALL"?"All":statusLabel[key]} <span className="ml-1 opacity-70">{counts[key]??0}</span></button>)}</div>
        {loading?<div className="py-20 text-center text-sm text-[#99998f]">Loading order queue…</div>:!branchId?<div className="py-20 text-center"><Utensils className="mx-auto text-[#c3bcae]" size={25}/><p className="mt-3 text-sm font-semibold">Choose a branch</p><p className="mt-1 text-xs text-[#99998f]">Select a branch to see its orders.</p></div>:visible.length===0?<div className="py-20 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f5eee5] text-[#d36a45]"><ChefHat size={21}/></div><p className="mt-4 text-sm font-semibold">No orders in this view</p><p className="mt-1 text-xs text-[#99998f]">New QR orders will appear here automatically.</p></div>:<div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">{visible.map(order=><article key={order.id} className="rounded-xl border border-[#e9e5dc] bg-[#fffefa] p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#99998f]">{order.orderNumber}</div><h3 className="mt-1 text-lg font-bold">{order.tableName}</h3></div><span className={"rounded-full px-2.5 py-1 text-[10px] font-bold "+(tone[order.status]??tone.NEW)}>{statusLabel[order.status]??order.status}</span></div><div className="mt-4 rounded-lg bg-[#f7f4ec] px-3 py-3"><div className="text-[10px] font-bold uppercase tracking-wider text-[#99998f]">Items · {order.itemCount} units</div><p className="mt-1 text-xs leading-5 text-[#55584f]">{order.itemsSummary||"Order items"}</p></div><div className="mt-4 flex items-center justify-between gap-3"><div><div className="text-base font-bold">{money(Number(order.totalAmount))}</div><div className="mt-1 flex items-center gap-1 text-[10px] text-[#99998f]"><Clock3 size={11}/>{time(order.createdAt)} · {order.lineCount} lines</div></div>{nextStatus[order.status]?<button disabled={updating===order.id} onClick={()=>updateStatus(order,nextStatus[order.status])} className="primary-button disabled:opacity-50">{updating===order.id?"Updating…":({NEW:"Accept order",ACCEPTED:"Start preparing",PREPARING:"Mark ready",READY:"Mark served"} as Record<string,string>)[order.status]}</button>:order.status==="SERVED"?<span className="text-[10px] font-semibold text-[#527a5b]">Completed</span>:<span className="text-[10px] text-[#99998f]">No further action</span>}</div></article>)}</div>}
      </section>
      <p className="mt-6 text-center text-[10px] text-[#aaa99f]">Order updates are polled every 10 seconds. Instant push updates can be added when we introduce WebSockets.</p>
    </div>
  </main>;
}
function Metric({label,value}:{label:string;value:number}){return <div className="panel p-5"><div className="text-xs text-[#85867d]">{label}</div><div className="mt-3 text-3xl font-bold tabular-nums">{value}</div></div>;}
