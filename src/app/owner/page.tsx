"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Bell, CalendarDays, ChefHat, ChevronDown, ClipboardList, Clock3, LayoutDashboard, LogOut, Menu as MenuIcon, Package, RefreshCw, Settings2, ShieldCheck, Smartphone, Sparkles, TrendingUp, Users, UtensilsCrossed, Wallet, X } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
type Membership = {tenantId:string;tenantName:string};
type Branch = {id:string;name:string};
type Dashboard = {
 summary:{ordersToday:number;revenueToday:number;activeOrders:number;readyOrders:number};
 dailySales:{day:string;revenue:number;orders:number}[];
 popularItems:{name:string;quantity:number;revenue:number}[];
 recentOrders:{orderNumber:string;status:string;totalAmount:number;tableName:string}[];
};
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v)||0);
const links=[
 {href:"/owner/",label:"Overview",icon:LayoutDashboard},
 {href:"/owner/orders",label:"Orders & kitchen",icon:ChefHat},
 {href:"/owner/menu",label:"Menu management",icon:UtensilsCrossed},
 {href:"/owner/tables",label:"Tables & QR",icon:Smartphone},
 {href:"/owner/staff",label:"Team & access",icon:Users}
];
const statusClass=(status:string)=> {
 const s=status.toUpperCase();
 if(["READY","SERVED","COMPLETED","PAID"].includes(s))return "bg-[#e7f4eb] text-[#28734b]";
 if(["NEW","PENDING"].includes(s))return "bg-[#fff0df] text-[#a86422]";
 if(["CANCELLED","REJECTED"].includes(s))return "bg-[#fce9e7] text-[#b34d46]";
 return "bg-[#eef0f3] text-[#5a6373]";
};
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
 const [branchLoading,setBranchLoading]=useState(false);
 const [refreshing,setRefreshing]=useState(false);
 const [menuOpen,setMenuOpen]=useState(false);
 const [updatedAt,setUpdatedAt]=useState<Date|null>(null);
 const [branchRetry,setBranchRetry]=useState(0);
 const redirectToLogin=useCallback(()=>{localStorage.removeItem("restaurantos_access_token");localStorage.removeItem("restaurantos_user");router.replace("/login?next=%2Fowner%2F");},[router]);

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
  const controller=new AbortController();
  setBranchLoading(true);setError("");setBranches([]);setBranchId("");setData(null);setLoading(true);
  fetch(`${API}/api/v1/tenants/${tenantId}/branches`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal})
   .then(async r=>{const raw=await r.text();let p: {success?:boolean;message?:string;data?:Branch[]};try{p=raw?JSON.parse(raw):{};}catch{throw new Error("Branch service returned an invalid response. Please retry.");}if(!r.ok||!p.success){if(r.status===401){redirectToLogin();throw new Error("Session expired. Redirecting to login…");}if(r.status===403)throw new Error("You do not have permission to view this restaurant.");throw new Error(p.message??(r.status===503||r.status===502||r.status===504?"Server is waking up or temporarily unavailable. Please retry.":"Cannot load branches (HTTP "+r.status+")"));}if(!Array.isArray(p.data))throw new Error("Branch data is unavailable. Please retry.");return p.data;})
   .then(list=>{if(!controller.signal.aborted){setBranches(list);setBranchId(list[0]?.id??"");if(!list.length)setLoading(false);}})
   .catch(e=>{if(!controller.signal.aborted){setError(e instanceof Error?e.message:"Cannot load branches");setLoading(false);}})
   .finally(()=>{if(!controller.signal.aborted)setBranchLoading(false);});
  return()=>controller.abort();
 },[token,tenantId,branchRetry,redirectToLogin]);

 const refresh=useCallback(async(signal?:AbortSignal)=>{
  if(!token||!tenantId||!branchId)return;
  setRefreshing(true);
  try{
   const r=await fetch(`${API}/api/v1/tenants/${tenantId}/dashboard?branchId=${encodeURIComponent(branchId)}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store",signal});
   if(r.status===401){redirectToLogin();return;}
   if(r.status===403)throw new Error("You do not have permission to view this dashboard.");
   const raw=await r.text();let p;
   try{p=JSON.parse(raw);}catch{throw new Error("Dashboard server returned an invalid response. Please retry.");}
   if(!r.ok||!p.success)throw new Error(p.message??"Cannot load dashboard");
   if(!signal?.aborted){setData(p.data);setError("");setUpdatedAt(new Date());}
  }catch(e){if(!signal?.aborted)setError(e instanceof Error?e.message:"Unable to load dashboard");}
  finally{if(!signal?.aborted){setLoading(false);setRefreshing(false);}}
 },[token,tenantId,branchId,redirectToLogin]);

 useEffect(()=>{
  if(!branchId)return;
  const controller=new AbortController();
  setData(null);setLoading(true);
  refresh(controller.signal);
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")refresh(controller.signal);},30000);
  return()=>{controller.abort();window.clearInterval(timer);};
 },[branchId,refresh]);

 function logout(){localStorage.removeItem("restaurantos_access_token");localStorage.removeItem("restaurantos_user");router.push("/login");}
 const selectedRestaurant=memberships.find(m=>m.tenantId===tenantId)?.tenantName??"Restaurant workspace";
 const selectedBranch=branches.find(b=>b.id===branchId)?.name??"Select branch";
 const sales=data?.dailySales??[];
 const max=Math.max(1,...sales.map(d=>Number(d.revenue)||0));
 const stats=[
  {label:"Order value today",value:money(data?.summary.revenueToday??0),icon:Wallet,note:"Non-cancelled orders",tone:"bg-[#fff0e7] text-[#d5653d]"},
  {label:"Orders today",value:String(data?.summary.ordersToday??0),icon:ClipboardList,note:"Orders placed today",tone:"bg-[#edf1ff] text-[#6177ba]"},
  {label:"In the kitchen",value:String(data?.summary.activeOrders??0),icon:ChefHat,note:"New, accepted & preparing",tone:"bg-[#fff3df] text-[#b9842c]"},
  {label:"Ready to serve",value:String(data?.summary.readyOrders??0),icon:Bell,note:"Awaiting service",tone:"bg-[#e6f3ea] text-[#38835a]"}
 ];
 return <div className="min-h-screen bg-[#f7f7f4] text-[#20241f] lg:flex">
  {menuOpen&&<button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={()=>setMenuOpen(false)}/>}
  <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#1b241f] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${menuOpen?"translate-x-0":"-translate-x-full"}`}>
   <div className="flex items-center justify-between px-6 pb-7 pt-7">
    <Link href="/owner/" className="flex items-center gap-3" onClick={()=>setMenuOpen(false)}><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7764c] text-xl font-black">r.</span><span className="text-xl font-extrabold tracking-[-.06em]">restaurant<span className="text-[#f18c66]">os</span></span></Link>
    <button className="lg:hidden" aria-label="Close menu" onClick={()=>setMenuOpen(false)}><X size={20}/></button>
   </div>
   <div className="mx-4 mb-8 rounded-2xl border border-white/10 bg-white/[.06] p-3"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#aebdb2]"><span className="h-2 w-2 rounded-full bg-[#74c999]"/>Restaurant workspace</div><p className="mt-2 truncate text-sm font-semibold">{selectedRestaurant}</p><p className="mt-1 truncate text-xs text-[#aebdb2]">{selectedBranch}</p></div>
   <nav className="flex-1 px-3" aria-label="Main navigation">
    <p className="px-4 pb-3 text-[10px] font-bold uppercase tracking-[.17em] text-[#879b8e]">Workspace</p>
    {links.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>setMenuOpen(false)} aria-current={href==="/owner/"?"page":undefined} className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-semibold transition-colors ${href==="/"?"bg-[#e7764c] text-white":"text-[#b9c7bb] hover:bg-white/10 hover:text-white"}`}><Icon size={18}/>{label}{href==="/"&&<span className="ml-auto h-1.5 w-1.5 rounded-full bg-white"/>}</Link>)}
    <p className="px-4 pb-3 pt-8 text-[10px] font-bold uppercase tracking-[.17em] text-[#879b8e]">Management</p>
    <Link href="/admin/restaurants/new" className="flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] text-[#b9c7bb] hover:bg-white/10 hover:text-white"><ShieldCheck size={18}/>Platform admin</Link>
   </nav>
   <div className="m-4 rounded-2xl bg-[#29392f] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#e4f0e6]"><Sparkles size={15} className="text-[#efad7e]"/>RestaurantOS V2</div><p className="mt-2 text-xs leading-5 text-[#b3c5b7]">A clearer view of your restaurant, every day.</p></div>
   <button onClick={logout} className="mx-4 mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-[#d7dfd8] hover:bg-white/10"><LogOut size={17}/>Sign out</button>
  </aside>
  <div className="min-w-0 flex-1">
   <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-[#e9ebe5] bg-white/95 px-4 backdrop-blur sm:px-8">
    <div className="flex min-w-0 items-center gap-3"><button aria-label="Open navigation" className="rounded-xl border border-[#e8e9e4] p-2.5 lg:hidden" onClick={()=>setMenuOpen(true)}><MenuIcon size={19}/></button><div className="min-w-0"><p className="text-[11px] font-medium text-[#899087]">Workspace / Overview</p><p className="truncate text-sm font-bold sm:text-base">{selectedRestaurant}</p></div></div>
    <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded-full bg-[#edf7ef] px-3 py-2 text-xs font-semibold text-[#358050] sm:inline-flex"><span className="h-2 w-2 rounded-full bg-[#55b776]"/>Live operations</span><button onClick={()=>refresh()} disabled={!branchId||refreshing} aria-label="Refresh dashboard" title="Refresh dashboard" className="rounded-xl border border-[#e7eae3] bg-white p-2.5 disabled:opacity-50"><RefreshCw size={18} className={refreshing?"animate-spin":""}/></button><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5e6db] text-sm font-bold text-[#ba623c]">{selectedRestaurant.charAt(0).toUpperCase()}</span></div>
   </header>
   <main className="mx-auto max-w-[1500px] px-4 pb-12 pt-7 sm:px-8 sm:pt-9">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#7e8b7f]"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div><h1 className="text-3xl font-extrabold tracking-[-.055em] sm:text-[38px]">Good to see you <span className="text-[#de744d]">again.</span></h1><p className="mt-2 text-sm text-[#7c847a]">Here is what is happening across your restaurant today.</p></div><div className="flex flex-wrap gap-2"><Link href="/owner/orders" className="inline-flex items-center gap-2 rounded-xl bg-[#e7764c] px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#ce623d]"><ClipboardList size={16}/>Manage orders<ArrowRight size={14}/></Link></div></div>
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e7e9e2] bg-white p-3 shadow-sm sm:p-4"><Settings2 size={17} className="text-[#8a9287]"/><label htmlFor="restaurant-select" className="text-xs font-semibold text-[#68736b]">Restaurant</label><div className="relative"><select id="restaurant-select" value={tenantId} onChange={e=>setTenantId(e.target.value)} className="max-w-[200px] appearance-none rounded-lg bg-[#f5f6f2] py-2 pl-3 pr-8 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#e7764c]">{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2 top-2.5"/></div><label htmlFor="branch-select" className="ml-1 text-xs font-semibold text-[#68736b]">Branch</label><div className="relative"><select id="branch-select" value={branchId} disabled={branchLoading||!branches.length} onChange={e=>setBranchId(e.target.value)} className="max-w-[200px] appearance-none rounded-lg bg-[#f5f6f2] py-2 pl-3 pr-8 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#e7764c] disabled:opacity-50">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2 top-2.5"/></div><span className="ml-auto text-[11px] text-[#9a9f96]">{updatedAt?"Updated "+updatedAt.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"Updates every 30 seconds"}</span></div>
    {error&&<div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f1d2c8] bg-[#fff0ea] p-4 text-sm text-[#a54431]"><span>{error}</span><button onClick={()=>{if(branchId)refresh();else setBranchRetry(n=>n+1);}} className="font-bold underline">Retry</button></div>}
    {loading&&!data?<div className="space-y-5" role="status" aria-label="Loading dashboard"><div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[1,2,3,4].map(n=><div key={n} className="h-36 animate-pulse rounded-2xl bg-[#e9ebe6]"/>)}</div><div className="grid min-w-0 gap-5 2xl:grid-cols-5"><div className="h-80 animate-pulse rounded-2xl bg-[#e9ebe6] 2xl:col-span-3"/><div className="h-80 animate-pulse rounded-2xl bg-[#e9ebe6] 2xl:col-span-2"/></div></div>:!data?<div className="rounded-2xl border border-[#e7e9e2] bg-white p-8 text-sm text-[#7c847a]">{branches.length?"No dashboard data available for this branch.":"No branches available. Choose another restaurant or create a branch."}</div>:<>
     <section aria-label="Today's metrics" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">{stats.map(({label,value,icon:Icon,note,tone})=><div key={label} className="rounded-2xl border border-[#e8eae4] bg-white p-4 shadow-[0_4px_22px_rgba(32,36,31,.025)] sm:p-5"><div className="mb-5 flex items-start justify-between gap-2"><p className="text-xs font-semibold text-[#777f77]">{label}</p><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon size={18}/></span></div><p className="text-2xl font-extrabold tracking-[-.05em] sm:text-3xl">{value}</p><p className="mt-2 text-[11px] text-[#8d968b]">{note}</p></div>)}</section>
     <div className="mb-6 grid gap-5 xl:grid-cols-5">
      <section className="min-w-0 rounded-2xl border border-[#e8eae4] bg-white p-4 sm:p-6 2xl:col-span-3"><div className="mb-7 flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><TrendingUp size={18} className="text-[#de744d]"/><h2 className="text-base font-extrabold">Sales overview</h2></div><p className="mt-1 text-xs text-[#899188]">Order value from non-cancelled orders · last 7 days</p></div><span className="rounded-lg bg-[#f6f6f2] px-3 py-2 text-xs font-semibold text-[#667168]">Last 7 days</span></div><div className="flex h-[235px] items-end gap-2 sm:gap-4">{sales.map(d=><div key={d.day} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={d.day+": "+money(Number(d.revenue))+" · "+d.orders+" orders"}><span className="hidden text-[10px] font-semibold text-[#788277] sm:block">{Number(d.revenue)>0?money(Number(d.revenue)):""}</span><div className="flex h-[185px] w-full items-end justify-center rounded-lg bg-[linear-gradient(to_top,#f4f5f1_1px,transparent_1px)] bg-[length:100%_25%]"><div className="w-full max-w-[45px] rounded-t-lg bg-[#e7764c] transition-colors group-hover:bg-[#bf5d3d]" style={{height:`${Math.max(2,(Number(d.revenue)||0)/max*100)}%`}}/></div><span className="text-[10px] font-semibold text-[#899188]">{new Date(d.day+"T12:00:00").toLocaleDateString("en-IN",{weekday:"short"})}</span></div>)}</div><p className="mt-4 text-[11px] text-[#a0a69d]">Based on orders, not verified payment collections.</p></section>
      <section className="min-w-0 rounded-2xl border border-[#e8eae4] bg-white p-4 sm:p-6 2xl:col-span-2"><div className="mb-5 flex items-center gap-2"><Package size={18} className="text-[#de744d]"/><h2 className="text-base font-extrabold">Popular menu items</h2></div><p className="mb-5 text-xs text-[#899188]">Most ordered in the last 30 days</p>{data.popularItems.length?data.popularItems.map((item,i)=><div key={item.name} className="flex items-center gap-3 border-b border-[#f0f1ec] py-3 last:border-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f6f2e9] text-xs font-bold text-[#9a7751]">{String(i+1).padStart(2,"0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.name}</p><p className="text-[11px] text-[#8d968b]">{item.quantity} sold</p></div><span className="text-xs font-bold">{money(Number(item.revenue))}</span></div>):<p className="rounded-xl bg-[#f7f8f5] p-5 text-sm text-[#8d968b]">Popular items will appear once orders come in.</p>}</section>
     </div>
     <div className="grid gap-5 xl:grid-cols-5">
      <section className="rounded-2xl border border-[#e8eae4] bg-white p-5 sm:p-6 2xl:col-span-3"><div className="mb-5 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><Activity size={18} className="text-[#de744d]"/><h2 className="text-base font-extrabold">Recent orders</h2></div><p className="mt-1 text-xs text-[#899188]">Latest activity from this branch</p></div><Link href="/orders" className="flex items-center gap-1 text-xs font-bold text-[#d66d47] hover:underline">View all <ArrowRight size={14}/></Link></div><div className="min-w-0"><table className="hidden w-full text-left text-xs sm:table"><thead><tr className="border-b border-[#edf0e9] text-[#939a91]"><th className="pb-3 font-semibold">Order</th><th className="pb-3 font-semibold">Table</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 text-right font-semibold">Amount</th></tr></thead><tbody>{data.recentOrders.map(o=><tr key={o.orderNumber} className="border-b border-[#f1f2ee] last:border-0"><td className="py-4 font-bold">{o.orderNumber}</td><td className="py-4 text-[#747e75]">{o.tableName||"—"}</td><td className="py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(o.status)}`}>{o.status.replaceAll("_"," ")}</span></td><td className="py-4 text-right font-bold">{money(Number(o.totalAmount))}</td></tr>)}</tbody></table><div className="divide-y divide-[#f0f1ec] sm:hidden">{data.recentOrders.map(o=><div key={o.orderNumber} className="flex min-w-0 items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-bold">{o.orderNumber}</p><p className="mt-1 truncate text-[11px] text-[#747e75]">{o.tableName||"No table"}</p><span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${statusClass(o.status)}`}>{o.status.replaceAll("_"," ")}</span></div><p className="shrink-0 text-xs font-bold">{money(Number(o.totalAmount))}</p></div>)}</div>{!data.recentOrders.length&&<p className="py-8 text-center text-sm text-[#899188]">No orders yet. New orders will appear here.</p>}</div></section>
      <section className="rounded-2xl border border-[#e8eae4] bg-white p-5 sm:p-6 2xl:col-span-2"><div className="mb-2 flex items-center gap-2"><Sparkles size={18} className="text-[#de744d]"/><h2 className="text-base font-extrabold">Quick actions</h2></div><p className="mb-5 text-xs text-[#899188]">Everything you need, one click away</p>{[{href:"/owner/orders",label:"Open order queue",desc:"Manage incoming orders",icon:ClipboardList},{href:"/owner/menu",label:"Update your menu",desc:"Items, prices & availability",icon:UtensilsCrossed},{href:"/owner/tables",label:"Manage tables & QR",desc:"Table setup and QR codes",icon:Smartphone},{href:"/owner/staff",label:"Manage your team",desc:"Staff accounts & access",icon:Users}].map(({href,label,desc,icon:Icon})=><Link key={href} href={href} className="group mb-2 flex items-center gap-3 rounded-xl border border-[#eef0e9] p-3 transition-colors hover:bg-[#faf4ed]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7f3ed] text-[#cc7751]"><Icon size={18}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold">{label}</span><span className="block text-[11px] text-[#939a91]">{desc}</span></span><ArrowRight size={16} className="text-[#a3aaa0] group-hover:text-[#cc7751]"/></Link>)}</section>
     </div>
    </>}
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-[#e5e8e1] pt-5 text-[11px] text-[#969d94]"><span>RestaurantOS · Your operations, beautifully organized</span><span className="flex items-center gap-1"><Clock3 size={12}/>Auto-refresh every 30 seconds</span></footer>
   </main>
  </div>
 </div>;
}
