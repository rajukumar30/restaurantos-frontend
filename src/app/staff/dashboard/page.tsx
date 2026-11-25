"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import StaffServiceRequests from "@/components/staff-service-requests";
import {useStaffBootstrap} from "../bootstrap-context";
import {useOrderEvents} from "@/lib/realtime/use-order-events";
import {useOptimisticStatus} from "@/lib/use-optimistic-status";
import {ChefHat,RefreshCw,Clock3,ShieldCheck,Wallet,Users,UtensilsCrossed,BarChart3} from "lucide-react";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
type Membership={tenantId:string;tenantName:string;roles?:string};
type Branch={id:string;name:string};
type Order={id:string;orderNumber:string;tableName:string;status:string;totalAmount:number;itemsSummary:string;createdAt:string;itemCount:number};
type Access={roles:string[];permissions:string[]};
async function json(response:Response){const raw=await response.text();let data;try{data=raw?JSON.parse(raw):null;}catch{throw Error("Invalid server response ("+response.status+")");}if(!response.ok||!data?.success)throw Error(data?.message||"Request failed (HTTP "+response.status+")");return data.data;}
const next:Record<string,string>={NEW:"ACCEPTED",ACCEPTED:"PREPARING",PREPARING:"READY",READY:"SERVED"};
export default function StaffDashboard(){
 const router=useRouter();const bootstrap=useStaffBootstrap();
 const [token,setToken]=useState("");
 const [memberships,setMemberships]=useState<Membership[]>([]);
 const [tenantId,setTenantId]=useState("");
 const [branchId,setBranchId]=useState("");
 const [branches,setBranches]=useState<Branch[]>([]);
 const [access,setAccess]=useState<Access>({roles:[],permissions:[]});
 const [confirmedOrders,setOrders]=useState<Order[]>([]);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [updated,setUpdated]=useState<Date|null>(null);
 useEffect(()=>{const t=localStorage.getItem("restaurantos_access_token");const raw=localStorage.getItem("restaurantos_user");if(!t||!raw){router.replace("/login?next=%2Fstaff%2Fdashboard");return;}try{const user=JSON.parse(raw);const list:Membership[]=user.memberships||[];if(!list.length){router.replace("/login");return;}setToken(t);setMemberships(list);setTenantId(list[0].tenantId);}catch{router.replace("/login");}},[router]);
 useEffect(()=>{if(!token||!tenantId)return;if(bootstrap?.token===token&&bootstrap.tenantId===tenantId){setBranches(bootstrap.branches);setBranchId(bootstrap.branches[0]?.id||"");setAccess(bootstrap.access);return;}let live=true;setBranchId("");setBranches([]);setAccess({roles:[],permissions:[]});setOrders([]);setLoading(true);jsonFetch();async function jsonFetch(){try{const b=await json(await fetch(API+"/api/v1/tenants/"+tenantId+"/staff-operations/branches",{headers:{Authorization:"Bearer "+token}}));if(live){setBranches(b);setBranchId(b[0]?.id||"");if(!b.length)setLoading(false);}}catch(e){if(live){setError(e instanceof Error?e.message:"Cannot load branches");setLoading(false);}}}return()=>{live=false;};},[token,tenantId,bootstrap]);
 const scope=JSON.stringify([token,tenantId,branchId]);
 const scopeRef=useRef(scope),orderVersion=useRef(0),metadataVersion=useRef(0);
 const reusedAccess=useRef(false);
 const {rows:orders,pending:updating,run}=useOptimisticStatus(scope,confirmedOrders);
 useEffect(()=>{scopeRef.current=scope;return()=>{scopeRef.current="";orderVersion.current++;metadataVersion.current++;};},[scope]);
 const load=useCallback(async(resourceId?:string)=>{
  if(!token||!tenantId||!branchId||scopeRef.current!==scope)return;
  const version=++orderVersion.current;
  const headers={Authorization:"Bearer "+token};
  const initialAccess=!reusedAccess.current&&bootstrap?.token===token&&bootstrap.tenantId===tenantId&&bootstrap.branches[0]?.id===branchId?bootstrap.access:null;
  if(!resourceId&&initialAccess)reusedAccess.current=true;
  const metaVersion=resourceId?metadataVersion.current:++metadataVersion.current;
  const ordersRequest=(async()=>{const tickets:Order[]=await json(await fetch(API+"/api/v1/tenants/"+tenantId+"/orders?branchId="+branchId+"&live=true",{headers,cache:"no-store"}));if(scopeRef.current===scope&&orderVersion.current===version){setOrders(tickets);setUpdated(new Date());}})();
  const metadataRequest=resourceId?Promise.resolve():(async()=>{const a=initialAccess??await json(await fetch(API+"/api/v1/tenants/"+tenantId+"/staff-operations/access?branchId="+branchId,{headers,cache:"no-store"}));if(scopeRef.current===scope&&metadataVersion.current===metaVersion)setAccess(a);})();
  try{await Promise.all([ordersRequest,metadataRequest]);if(!resourceId&&scopeRef.current===scope&&orderVersion.current===version)setError("");}
  catch(e){if(scopeRef.current===scope&&orderVersion.current===version)setError(e instanceof Error?e.message:"Unable to load orders");}
  finally{if(scopeRef.current===scope&&orderVersion.current===version)setLoading(false);}
 },[token,tenantId,branchId,scope,bootstrap]);
 useEffect(()=>{if(!branchId)return;setLoading(true);void load();},[branchId,load]);
 const billingRealtime=access.roles.some(r=>r.toUpperCase()==="CASHIER") && access.permissions.includes("payments:read");
 const realtimeStatus=useOrderEvents(token,tenantId,branchId,load,billingRealtime?"billing":"orders");
 useEffect(()=>{if(!branchId||realtimeStatus==="connected")return;const onFocus=()=>{if(document.visibilityState==="visible")void load();};window.addEventListener("focus",onFocus);return()=>window.removeEventListener("focus",onFocus);},[branchId,realtimeStatus,load]);
 const roles=access.roles.map(r=>r.toUpperCase());
 const role=roles.includes("MANAGER")||roles.includes("OWNER")?"MANAGER":roles.includes("KITCHEN")?"KITCHEN":roles.includes("WAITER")?"WAITER":roles.includes("CASHIER")?"CASHIER":"STAFF";
 const kitchen=role==="KITCHEN"&&access.permissions.includes("kitchen:operate");
 const manage=access.permissions.includes("orders:manage");
 const active=useMemo(()=>orders.filter(o=>["NEW","ACCEPTED","PREPARING","READY"].includes(o.status)),[orders]);
 const queue=useMemo(()=>role==="KITCHEN"?active.filter(o=>["NEW","ACCEPTED","PREPARING"].includes(o.status)):role==="WAITER"?active.filter(o=>["NEW","READY"].includes(o.status)):role==="CASHIER"?orders.filter(o=>["SERVED","READY"].includes(o.status)):active,[orders,active,role]);
 const canAdvance=(o:Order)=>kitchen?["NEW","ACCEPTED","PREPARING"].includes(o.status):manage&&o.status==="READY"&&(role==="WAITER"||role==="MANAGER");
 async function advance(o:Order){
  const status=next[o.status];if(!status||!canAdvance(o)||updating.has(o.id))return;
  const endpoint=kitchen?"/staff-operations/kitchen/orders/":"/orders/";
  await run(o,status,async signal=>json(await fetch(API+"/api/v1/tenants/"+tenantId+endpoint+o.id+"/status",{method:"PATCH",signal,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({branchId,status})})),
   confirmed=>{orderVersion.current++;setOrders(rows=>rows.map(row=>row.id===o.id&&row.status===o.status?{...row,status:confirmed}:row));setUpdated(new Date());},
   ()=>{void load("mutation");},
   e=>setError("Order #"+o.orderNumber+": "+(e instanceof Error?e.message:"Update not confirmed")+". Checking server status."));
 }
 const config={
 MANAGER:{title:"Manager dashboard",subtitle:"Oversee live operations and coordinate your team",icon:BarChart3,queue:"Restaurant operations",metrics:[["Active orders",active.length],["New orders",orders.filter(o=>o.status==="NEW").length],["Ready for service",orders.filter(o=>o.status==="READY").length],["Served orders",orders.filter(o=>o.status==="SERVED").length]]},
 KITCHEN:{title:"Kitchen display",subtitle:"Prepare incoming tickets and keep service moving",icon:ChefHat,queue:"Kitchen tickets",metrics:[["Kitchen tickets",queue.length],["New tickets",orders.filter(o=>o.status==="NEW").length],["Accepted",orders.filter(o=>o.status==="ACCEPTED").length],["Preparing",orders.filter(o=>o.status==="PREPARING").length]]},
 WAITER:{title:"Waiter dashboard",subtitle:"Track table orders and serve dishes as soon as they are ready",icon:UtensilsCrossed,queue:"Orders needing service",metrics:[["Needs attention",queue.length],["New orders",orders.filter(o=>o.status==="NEW").length],["Ready to serve",orders.filter(o=>o.status==="READY").length],["Served",orders.filter(o=>o.status==="SERVED").length]]},
 CASHIER:{title:"Cashier dashboard",subtitle:"Review served orders and totals; payment processing is coming next",icon:Wallet,queue:"Orders for billing review",metrics:[["For review",queue.length],["Served",orders.filter(o=>o.status==="SERVED").length],["Ready",orders.filter(o=>o.status==="READY").length],["Recent orders",orders.length]]},
 STAFF:{title:"Staff dashboard",subtitle:"View the orders assigned to your restaurant branch",icon:Users,queue:"Live orders",metrics:[["Active orders",active.length],["New orders",orders.filter(o=>o.status==="NEW").length],["Preparing",orders.filter(o=>o.status==="PREPARING").length],["Ready",orders.filter(o=>o.status==="READY").length]]}
 }[role];
 const RoleIcon=config.icon;

 return <main className="min-h-screen bg-[#f7f7f4] text-[#20241f]">
  
  <div className="mx-auto max-w-7xl px-5 py-8 sm:px-9"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#d36a45]">RestaurantOS / Staff</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold"><RoleIcon size={27}/>{config.title}</h1><p className="mt-2 text-sm text-[#788078]">{config.subtitle} · {realtimeStatus==="connected"?"Live updates":realtimeStatus==="connecting"?"Connecting to live updates":"Offline · use Refresh"}</p></div><button onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm"><RefreshCw size={16}/>Refresh</button></div>
  <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border bg-white p-4"><label className="text-sm">Restaurant <select className="ml-2 rounded-lg border p-2" value={tenantId} onChange={e=>setTenantId(e.target.value)}>{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select></label><label className="text-sm">Branch <select className="ml-2 rounded-lg border p-2" value={branchId} onChange={e=>setBranchId(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
  <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">{config.metrics.map(([label,count])=><div key={label} className="rounded-2xl border bg-white p-5"><p className="text-xs text-[#788078]">{label}</p><p className="mt-2 text-3xl font-bold">{count}</p></div>)}</div>
  {updating.size>0&&<p role="status" className="mb-3 text-xs font-medium text-amber-700">{updating.size} update{updating.size===1?"":"s"} syncing · continue with other tickets</p>}{error&&<p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-bold"><RoleIcon size={20}/> {config.queue}</h2><span className="flex items-center gap-1 text-xs text-[#788078]"><Clock3 size={14}/>{updated?"Updated "+updated.toLocaleTimeString():"Waiting for updates"}</span></div>
  {loading?<div className="rounded-2xl border bg-white p-10 text-center">Loading orders…</div>:queue.length===0?<div className="rounded-2xl border bg-white p-10 text-center text-[#788078]">No active orders for this branch.</div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{queue.map(o=><article key={o.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-2"><div><p className="font-bold">#{o.orderNumber}</p><p className="mt-1 text-sm text-[#788078]">{o.tableName}</p></div><span className="rounded-full bg-[#f5e6db] px-3 py-1 text-xs font-bold text-[#a65d38]">{o.status}</span></div><p className="mt-4 min-h-12 text-sm leading-6">{o.itemsSummary||o.itemCount+" items"}</p><div className="mt-4 flex items-center justify-between border-t pt-4"><span className="text-xs text-[#788078]">{new Date(o.createdAt).toLocaleTimeString()}</span>{canAdvance(o)&&<button disabled={updating.has(o.id)} onClick={()=>void advance(o)} className="rounded-xl bg-[#e7764c] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{updating.has(o.id)?"Syncing…":next[o.status]==="READY"?"Mark ready":next[o.status]==="SERVED"?"Mark served":next[o.status]==="PREPARING"?"Start preparing":"Accept order"}</button>}</div></article>)}</div>}
  {branchId&&access.permissions.includes("orders:read")&&role!=="KITCHEN"&&<StaffServiceRequests tenantId={tenantId} branchId={branchId} token={token} canManage={manage}/>}
  <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-[#788078]"><ShieldCheck size={16}/>This view and its actions follow your assigned role and branch permissions.</div>
  </div>
 </main>;
}
