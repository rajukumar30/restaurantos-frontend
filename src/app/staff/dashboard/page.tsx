"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {ChefHat,ClipboardList,RefreshCw,LogOut,Clock3,ShieldCheck} from "lucide-react";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"http://localhost:8080";
type Membership={tenantId:string;tenantName:string;roles?:string};
type Branch={id:string;name:string};
type Order={id:string;orderNumber:string;tableName:string;status:string;totalAmount:number;itemsSummary:string;createdAt:string;itemCount:number};
type Access={roles:string[];permissions:string[]};
async function json(response:Response){const raw=await response.text();let data;try{data=raw?JSON.parse(raw):null;}catch{throw Error("Invalid server response ("+response.status+")");}if(!response.ok||!data?.success)throw Error(data?.message||"Request failed (HTTP "+response.status+")");return data.data;}
const next:Record<string,string>={NEW:"ACCEPTED",ACCEPTED:"PREPARING",PREPARING:"READY",READY:"SERVED"};
export default function StaffDashboard(){
 const router=useRouter();
 const [token,setToken]=useState("");
 const [memberships,setMemberships]=useState<Membership[]>([]);
 const [tenantId,setTenantId]=useState("");
 const [branchId,setBranchId]=useState("");
 const [branches,setBranches]=useState<Branch[]>([]);
 const [access,setAccess]=useState<Access>({roles:[],permissions:[]});
 const [orders,setOrders]=useState<Order[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [updating,setUpdating]=useState("");
 const [updated,setUpdated]=useState<Date|null>(null);
 useEffect(()=>{const t=localStorage.getItem("restaurantos_access_token");const raw=localStorage.getItem("restaurantos_user");if(!t||!raw){router.replace("/login?next=%2Fstaff%2Fdashboard");return;}try{const user=JSON.parse(raw);const list:Membership[]=user.memberships||[];if(!list.length){router.replace("/login");return;}setToken(t);setMemberships(list);setTenantId(list[0].tenantId);}catch{router.replace("/login");}},[router]);
 useEffect(()=>{if(!token||!tenantId)return;let live=true;setBranchId("");setBranches([]);setAccess({roles:[],permissions:[]});setOrders([]);setLoading(true);jsonFetch();async function jsonFetch(){try{const b=await json(await fetch(API+"/api/v1/tenants/"+tenantId+"/staff-operations/branches",{headers:{Authorization:"Bearer "+token}}));if(live){setBranches(b);setBranchId(b[0]?.id||"");if(!b.length)setLoading(false);}}catch(e){if(live){setError(e instanceof Error?e.message:"Cannot load branches");setLoading(false);}}}return()=>{live=false;};},[token,tenantId]);
 const load=useCallback(async()=>{if(!token||!tenantId||!branchId)return;try{const headers={Authorization:"Bearer "+token};const [a,o]=await Promise.all([fetch(API+"/api/v1/tenants/"+tenantId+"/staff-operations/access?branchId="+branchId,{headers}),fetch(API+"/api/v1/tenants/"+tenantId+"/orders?branchId="+branchId,{headers,cache:"no-store"})]);setAccess(await json(a));setOrders(await json(o));setError("");setUpdated(new Date());}catch(e){setError(e instanceof Error?e.message:"Unable to load orders");}finally{setLoading(false);}},[token,tenantId,branchId]);
 useEffect(()=>{if(!branchId)return;setLoading(true);void load();const timer=window.setInterval(()=>void load(),10000);return()=>window.clearInterval(timer);},[branchId,load]);
 const kitchen=access.permissions.includes("kitchen:operate");
 const manage=access.permissions.includes("orders:manage");
 const cashier=access.roles.includes("CASHIER");
 const active=useMemo(()=>orders.filter(o=>["NEW","ACCEPTED","PREPARING","READY"].includes(o.status)),[orders]);
 const canAdvance=(o:Order)=>kitchen?["NEW","ACCEPTED","PREPARING"].includes(o.status):manage&&o.status==="READY";
 async function advance(o:Order){const status=next[o.status];if(!status)return;setUpdating(o.id);try{const endpoint=kitchen?"/staff-operations/kitchen/orders/":"/orders/";const suffix=kitchen?"/status":"/status";await json(await fetch(API+"/api/v1/tenants/"+tenantId+endpoint+o.id+suffix,{method:"PATCH",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({branchId,status})}));await load();}catch(e){setError(e instanceof Error?e.message:"Could not update order");}finally{setUpdating("");}}
 const title=kitchen?"Kitchen display":cashier?"Cashier workspace":manage?"Service operations":"Staff dashboard";
 function logout(){localStorage.removeItem("restaurantos_access_token");localStorage.removeItem("restaurantos_user");router.replace("/login");}
 return <main className="min-h-screen bg-[#f7f7f4] text-[#20241f]">
  <header className="border-b border-[#e7e9e2] bg-[#1b241f] px-5 py-5 text-white sm:px-9"><div className="mx-auto flex max-w-7xl items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7764c] text-xl font-black">r.</span><div><div className="font-bold">restaurant<span className="text-[#f18c66]">os</span></div><div className="text-xs text-[#aebdb2]">Staff workspace</div></div></div><button onClick={logout} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs"><LogOut size={15}/>Sign out</button></div></header>
  <div className="mx-auto max-w-7xl px-5 py-8 sm:px-9"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#d36a45]">RestaurantOS / Staff</p><h1 className="mt-2 text-3xl font-extrabold">{title}</h1><p className="mt-2 text-sm text-[#788078]">{access.roles.join(" · ")||"Assigned employee"} · Live orders refresh every 10 seconds</p></div><button onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm"><RefreshCw size={16}/>Refresh</button></div>
  <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border bg-white p-4"><label className="text-sm">Restaurant <select className="ml-2 rounded-lg border p-2" value={tenantId} onChange={e=>setTenantId(e.target.value)}>{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select></label><label className="text-sm">Branch <select className="ml-2 rounded-lg border p-2" value={branchId} onChange={e=>setBranchId(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
  <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">{[["Active orders",active.length],["New",orders.filter(o=>o.status==="NEW").length],["Preparing",orders.filter(o=>o.status==="PREPARING").length],["Ready",orders.filter(o=>o.status==="READY").length]].map(([label,count])=><div key={label} className="rounded-2xl border bg-white p-5"><p className="text-xs text-[#788078]">{label}</p><p className="mt-2 text-3xl font-bold">{count}</p></div>)}</div>
  {error&&<p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold">{kitchen?<ChefHat size={20}/>:<ClipboardList size={20}/>} {kitchen?"Kitchen queue":"Live order queue"}</h2><span className="flex items-center gap-1 text-xs text-[#788078]"><Clock3 size={14}/>{updated?"Updated "+updated.toLocaleTimeString():"Waiting for updates"}</span></div>
  {loading?<div className="rounded-2xl border bg-white p-10 text-center">Loading orders…</div>:active.length===0?<div className="rounded-2xl border bg-white p-10 text-center text-[#788078]">No active orders for this branch.</div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map(o=><article key={o.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-2"><div><p className="font-bold">#{o.orderNumber}</p><p className="mt-1 text-sm text-[#788078]">{o.tableName}</p></div><span className="rounded-full bg-[#f5e6db] px-3 py-1 text-xs font-bold text-[#a65d38]">{o.status}</span></div><p className="mt-4 min-h-12 text-sm leading-6">{o.itemsSummary||o.itemCount+" items"}</p><div className="mt-4 flex items-center justify-between border-t pt-4"><span className="text-xs text-[#788078]">{new Date(o.createdAt).toLocaleTimeString()}</span>{canAdvance(o)&&<button disabled={updating===o.id} onClick={()=>void advance(o)} className="rounded-xl bg-[#e7764c] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{updating===o.id?"Updating…":next[o.status]==="READY"?"Mark ready":next[o.status]==="SERVED"?"Mark served":next[o.status]==="PREPARING"?"Start preparing":"Accept order"}</button>}</div></article>)}</div>}
  <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-[#788078]"><ShieldCheck size={16}/>Actions are restricted by your assigned branch permissions. {manage&&<Link className="font-bold text-[#d36a45]" href="/staff/kitchen">Open kitchen view</Link>}</div>
  </div>
 </main>;
}
