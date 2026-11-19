"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
type Membership = {tenantId:string;tenantName:string};
type Branch = {id:string;name:string};
type Dashboard = {
  summary:{ordersToday:number;revenueToday:number;activeOrders:number;readyOrders:number};
  dailySales:{day:string;revenue:number;orders:number}[];
  popularItems:{name:string;quantity:number;revenue:number}[];
  recentOrders:{orderNumber:string;status:string;totalAmount:number;tableName:string}[];
};
const money=(value:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(value);
export default function Home(){
  const router=useRouter();
  const [token,setToken]=useState("");
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [tenantId,setTenantId]=useState("");
  const [branches,setBranches]=useState<Branch[]>([]);
  const [branchId,setBranchId]=useState("");
  const [data,setData]=useState<Dashboard|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    const t=localStorage.getItem("restaurantos_access_token");
    const raw=localStorage.getItem("restaurantos_user");
    if(!t||!raw){router.replace("/login");return;}
    try{
      const user=JSON.parse(raw);
      const list:Membership[]=user.memberships??[];
      if(!list.length){router.replace(user.authorities?.includes("PLATFORM_ADMIN")?"/admin/restaurants/new":"/login");return;}
      setToken(t);setMemberships(list);setTenantId(list[0].tenantId);
    }catch{router.replace("/login");}
  },[router]);

  useEffect(()=>{
    if(!token||!tenantId)return;
    let cancelled=false;
    setBranchId("");setBranches([]);setData(null);
    fetch(`${API}/api/v1/tenants/${tenantId}/branches`,{headers:{Authorization:`Bearer ${token}`}})
      .then(async r=>{const p=await r.json();if(!r.ok||!p.success)throw new Error(p.message??"Cannot load branches");return p.data as Branch[];})
      .then(list=>{if(!cancelled){setBranches(list);setBranchId(list[0]?.id??"");}})
      .catch(e=>{if(!cancelled)setError(e.message);});
    return()=>{cancelled=true;};
  },[token,tenantId]);

  const refresh=useCallback(async()=>{
    if(!token||!tenantId||!branchId)return;
    try{
      const r=await fetch(`${API}/api/v1/tenants/${tenantId}/dashboard?branchId=${branchId}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      const p=await r.json();if(!r.ok||!p.success)throw new Error(p.message??"Cannot load dashboard");
      setData(p.data);setError("");
    }catch(e){setError(e instanceof Error?e.message:"Unable to load dashboard");}
    finally{setLoading(false);}
  },[token,tenantId,branchId]);

  useEffect(()=>{if(!branchId)return;setData(null);setLoading(true);refresh();const timer=window.setInterval(refresh,30000);return()=>window.clearInterval(timer);},[branchId,refresh]);

  const max=Math.max(1,...(data?.dailySales??[]).map(x=>Number(x.revenue)));
  return <main className="min-h-screen bg-[#f7f4ec]">
    <header className="border-b border-[#e9e5dc] bg-[#fffefa] px-5 py-5 sm:px-10 flex flex-wrap justify-between items-center gap-4">
      <div className="font-bold text-xl">restaurant<span className="text-[#E56A42]">os</span><span className="ml-3 text-xs font-normal text-[#77796f]">Live dashboard</span></div>
      <nav className="flex flex-wrap gap-3 text-sm"><Link href="/orders">Orders & kitchen</Link><Link href="/menu">Menu</Link><Link href="/tables">Tables & QR</Link><Link href="/staff">Staff</Link></nav>
    </header>
    <div className="mx-auto max-w-7xl px-5 py-9 sm:px-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7"><div><div className="eyebrow">Restaurant performance</div><h1 className="page-title mt-2">Dashboard<span className="text-[#E56A42]">.</span></h1><p className="text-sm text-[#77796f] mt-2">Live branch metrics, refreshed every 30 seconds.</p></div><button className="ghost-button" onClick={()=>refresh()}>Refresh now</button></div>
      <div className="flex flex-wrap items-center gap-3 mb-6"><label className="text-xs">Restaurant</label><select className="ghost-button" value={tenantId} onChange={e=>setTenantId(e.target.value)}>{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select><label className="text-xs">Branch</label><select className="ghost-button" value={branchId} onChange={e=>setBranchId(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      {error&&<p role="alert" className="mb-5 rounded-xl bg-[#fbede7] p-4 text-sm text-[#a7442a]">{error}</p>}
      {loading&&!data?<p className="text-sm text-[#77796f]">Loading dashboard…</p>:!data?<p className="text-sm text-[#77796f]">No dashboard data available for this branch.</p>:<>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {([["Revenue today",money(Number(data.summary.revenueToday))],["Orders today",data.summary.ordersToday],["Active queue",data.summary.activeOrders],["Ready to serve",data.summary.readyOrders]] as [string,string|number][]).map(([label,value])=><div key={label} className="panel p-5"><p className="text-xs text-[#77796f]">{label}</p><p className="text-2xl font-bold mt-3">{value}</p></div>)}
        </div>
        <div className="grid lg:grid-cols-2 gap-5 mb-6">
          <section className="panel p-6"><h2 className="font-bold mb-5">Revenue · last 7 days</h2><div className="flex items-end gap-3 h-48">{data.dailySales.map(d=><div key={d.day} className="flex-1 h-full flex flex-col justify-end items-center gap-2"><span className="text-[10px]">{money(Number(d.revenue))}</span><div className="w-full rounded-t bg-[#E56A42] min-h-[2px]" style={{height:`${Math.max(2,Number(d.revenue)/max*75)}%`}}/><span className="text-[10px] text-[#77796f]">{d.day.slice(5)}</span></div>)}</div></section>
          <section className="panel p-6"><h2 className="font-bold mb-5">Top selling items · last 30 days</h2>{data.popularItems.length?data.popularItems.map(i=><div key={i.name} className="flex justify-between border-b border-[#eeeae2] py-3 text-sm"><span>{i.name} <span className="text-[#77796f]">× {i.quantity}</span></span><strong>{money(Number(i.revenue))}</strong></div>):<p className="text-sm text-[#77796f]">No sales yet.</p>}</section>
        </div>
        <section className="panel p-6"><div className="flex justify-between mb-4"><h2 className="font-bold">Recent orders</h2><Link href="/orders" className="text-sm underline">View all</Link></div>{data.recentOrders.length?data.recentOrders.map(o=><div key={o.orderNumber} className="grid grid-cols-4 gap-2 py-3 border-b border-[#eeeae2] text-xs sm:text-sm"><strong>{o.orderNumber}</strong><span>{o.tableName}</span><span>{o.status}</span><span className="text-right">{money(Number(o.totalAmount))}</span></div>):<p className="text-sm text-[#77796f]">No orders yet.</p>}</section>
      </>}
    </div>
  </main>;
}
