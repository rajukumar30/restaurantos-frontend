"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {LayoutDashboard,ChefHat,UtensilsCrossed,Wallet,Menu,X,LogOut,ShieldCheck,Users,ClipboardList,Clock3,History} from "lucide-react";
import {staffRole,roleHome} from "./role-routes";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
async function fetchWithTimeout(url:string,headers:HeadersInit){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),20000);try{return await fetch(url,{headers,signal:controller.signal,cache:"no-store"});}finally{clearTimeout(timeout);}}
type Access={roles:string[];permissions:string[]};
type NavItem={href:string;label:string;icon:typeof LayoutDashboard};
const navigation:NavItem[]=[
 {href:"/staff/manager",label:"Dashboard",icon:LayoutDashboard},
 {href:"/staff/kitchen",label:"Kitchen display",icon:ChefHat},
 {href:"/staff/tables",label:"Table service",icon:UtensilsCrossed},
 {href:"/staff/billing",label:"Billing & payments",icon:Wallet}
];
export default function StaffLayout({children}:{children:React.ReactNode}){
 const pathname=usePathname(),router=useRouter();
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(true);
 const [access,setAccess]=useState<Access>({roles:[],permissions:[]});
 const [restaurant,setRestaurant]=useState("Restaurant workspace");
 const [name,setName]=useState("Team member");
 const [error,setError]=useState("");
 const [retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;
 async function initialize(){
  const token=localStorage.getItem("restaurantos_access_token"),raw=localStorage.getItem("restaurantos_user");
  if(!token||!raw){router.replace("/login?next="+encodeURIComponent(pathname));return;}
  try{
   const user=JSON.parse(raw),memberships=user.memberships||[];
   if(!memberships.length){router.replace("/login");return;}
   const membership=memberships[0];setRestaurant(membership.tenantName||"Restaurant workspace");setName(user.name||"Team member");
   const headers={Authorization:"Bearer "+token};
   const branchesResponse=await fetchWithTimeout(API+"/api/v1/tenants/"+membership.tenantId+"/staff-operations/branches",headers);
   const branchesPayload=await branchesResponse.json();
   if(!branchesResponse.ok||!branchesPayload.success)throw Error(branchesPayload.message||"Cannot load staff access");
   const branch=branchesPayload.data?.[0];
   if(!branch)throw Error("No active branch assigned to this account.");
   const response=await fetchWithTimeout(API+"/api/v1/tenants/"+membership.tenantId+"/staff-operations/access?branchId="+branch.id,headers);
   const payload=await response.json();
   if(!response.ok||!payload.success)throw Error(payload.message||"Cannot load permissions");
   if(active){setAccess(payload.data);setError("");}
  }catch(e){if(active)setError(e instanceof Error&&e.name==="AbortError"?"The server is taking too long to respond. Please retry.":e instanceof Error?e.message:"Cannot load staff access");}
  finally{if(active)setLoading(false);}
 }
 void initialize();return()=>{active=false;};
 },[router,retry]);
 const roles=access.roles.map(r=>r.toUpperCase());
 const resolvedRole=staffRole(roles);
 const home=roleHome(resolvedRole);
 const manager=resolvedRole==="MANAGER";
 const kitchen=resolvedRole==="KITCHEN"||manager;
 const waiter=resolvedRole==="WAITER"||manager;
 const cashier=resolvedRole==="CASHIER"||manager;
 const allowed=(href:string)=>href===home||
 (href==="/staff/kitchen"&&kitchen&&access.permissions.includes("kitchen:operate"))||
 (href==="/staff/tables"&&waiter&&access.permissions.includes("orders:manage"))||
 (href==="/staff/billing"&&cashier&&access.permissions.includes("payments:read"));
 const extra=[
  ...(kitchen&&access.permissions.includes("kitchen:operate")?[
   {href:"/staff/operations/kitchen-history",label:"Kitchen history",icon:History}]:[]),
  ...(waiter&&access.permissions.includes("orders:manage")?[
   {href:"/staff/operations/waiter-orders",label:"Active orders",icon:ClipboardList},
   {href:"/staff/operations/waiter-history",label:"Order history",icon:History}]:[]),
  ...(manager&&access.permissions.includes("orders:manage")?[
   {href:"/staff/operations/manager-orders",label:"Live orders",icon:Clock3}]:[]),
  ...(cashier&&access.permissions.includes("payments:read")?[
   {href:"/staff/operations/cashier-orders",label:"Billing queue",icon:ClipboardList}]:[])
 ];
 const links=[{href:home,label:"Dashboard",icon:LayoutDashboard},
 ...navigation.slice(1).filter(item=>item.href!==home&&allowed(item.href)),...extra];
 const current=pathname==="/staff"||pathname==="/staff/"?home:pathname;
 const title=links.find(item=>item.href===current)?.label||"Staff workspace";
 const role=manager?"Manager":resolvedRole==="KITCHEN"?"Kitchen staff":resolvedRole==="WAITER"?"Waiter":resolvedRole==="CASHIER"?"Cashier":"Staff";
 useEffect(()=>{if(loading||error)return;if(pathname==="/staff/dashboard"||pathname==="/staff"||pathname==="/staff/"){router.replace(home);}},[loading,error,pathname,home,router]);
 function logout(){localStorage.removeItem("restaurantos_access_token");localStorage.removeItem("restaurantos_user");router.replace("/login");}
 if(loading)return <main className="grid min-h-screen place-items-center text-sm text-[#77796f]"><div className="text-center"><p className="font-semibold">Opening staff workspace…</p><p className="mt-2 text-xs text-[#77796f]">Connecting to restaurant server (up to 20 seconds)</p><button onClick={()=>{setLoading(true);setRetry(n=>n+1);}} className="mt-4 rounded-lg border bg-white px-4 py-2 text-sm">Retry connection</button></div></main>;
 if(error)return <main className="grid min-h-screen place-items-center bg-[#f7f7f4] p-6"><div className="max-w-md rounded-2xl border bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-3 text-[#e7764c]"/><h1 className="font-bold">Staff access unavailable</h1><p className="mt-2 text-sm text-[#77796f]">{error}</p><div className="mt-5 flex justify-center gap-2"><button className="rounded-xl border px-4 py-2" onClick={()=>{setLoading(true);setError("");setRetry(n=>n+1);}}>Retry</button><button className="rounded-xl bg-[#1b241f] px-4 py-2 text-white" onClick={logout}>Return to login</button></div></div></main>;
 if(!["/staff/dashboard","/staff","/staff/"].includes(pathname)&&!links.some(item=>item.href===current))return <main className="grid min-h-screen place-items-center p-6"><div className="text-center"><ShieldCheck className="mx-auto mb-3"/><p className="font-semibold">This page is not available for your role.</p><Link className="mt-3 inline-block text-[#d36a45]" href={home}>Go to dashboard</Link></div></main>;
 return <div className="min-h-screen bg-[#f7f7f4] text-[#20241f] lg:flex">
 {open&&<button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={()=>setOpen(false)}/>}
 <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#1b241f] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open?"translate-x-0":"-translate-x-full"}`}>
  <div className="flex items-center justify-between px-6 pb-7 pt-7"><Link href={home} onClick={()=>setOpen(false)} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7764c] text-xl font-black">r.</span><span className="text-xl font-extrabold tracking-[-.06em]">restaurant<span className="text-[#f18c66]">os</span></span></Link><button aria-label="Close menu" className="lg:hidden" onClick={()=>setOpen(false)}><X size={20}/></button></div>
  <div className="mx-4 mb-8 rounded-2xl border border-white/10 bg-white/[.06] p-3"><p className="text-[10px] font-bold uppercase tracking-widest text-[#aebdb2]">Staff workspace</p><p className="mt-2 truncate text-sm font-semibold">{restaurant}</p><p className="mt-1 truncate text-xs text-[#aebdb2]">{role} · {name}</p></div>
  <nav aria-label="Staff navigation" className="min-h-0 flex-1 overflow-y-auto px-3"><p className="px-4 pb-3 text-[10px] font-bold uppercase tracking-widest text-[#879b8e]">Workspace</p>{links.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>setOpen(false)} aria-current={current===href?"page":undefined} className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-semibold transition-colors ${current===href?"bg-[#e7764c] text-white":"text-[#b9c7bb] hover:bg-white/10 hover:text-white"}`}><Icon size={18}/>{label}</Link>)}</nav>
  <div className="m-4 rounded-2xl bg-[#29392f] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#e4f0e6]"><Users size={15} className="text-[#efad7e]"/>RestaurantOS Staff</div><p className="mt-2 text-xs leading-5 text-[#b3c5b7]">Your daily operations, all in one place.</p></div>
  <button onClick={logout} className="mx-4 mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-[#d7dfd8] hover:bg-white/10"><LogOut size={17}/>Sign out</button>
 </aside>
 <div className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-[#e9ebe5] bg-white/95 px-4 backdrop-blur sm:px-8"><div className="flex items-center gap-3"><button aria-label="Open navigation" className="rounded-xl border p-2.5 lg:hidden" onClick={()=>setOpen(true)}><Menu size={19}/></button><div><p className="text-[11px] text-[#899087]">Staff / {role}</p><p className="text-sm font-bold">{title}</p></div></div><span className="hidden truncate text-xs font-semibold text-[#788078] sm:block">{restaurant}</span></header><div className="min-w-0">{children}</div></div>
 </div>;
}
