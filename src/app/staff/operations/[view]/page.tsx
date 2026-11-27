"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {useOrderEvents} from "@/lib/realtime/use-order-events";
import {useOptimisticStatus} from "@/lib/use-optimistic-status";
import {useStaffBootstrap} from "../../bootstrap-context";
import {workspaceFetch} from "@/lib/workspace-fetch";
import {RefreshCw,Search,Clock3} from "lucide-react";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
type Order={id:string;orderNumber:string;tableName:string;status:string;itemsSummary:string;itemCount:number;totalAmount:number;createdAt:string};
type Branch={id:string;name:string};
type Access={roles:string[];permissions:string[]};
const views:Record<string,{title:string;description:string;statuses:string[];permission:string}>={
 "kitchen-incoming":{title:"Incoming orders",description:"Accept new tickets and begin preparation",statuses:["NEW","ACCEPTED"],permission:"kitchen:operate"},
 "kitchen-preparing":{title:"Preparing orders",description:"Track food preparation and mark dishes ready",statuses:["PREPARING"],permission:"kitchen:operate"},
 "kitchen-history":{title:"Kitchen history",description:"Recently completed and served kitchen tickets",statuses:["READY","SERVED","CANCELLED"],permission:"kitchen:operate"},
 "waiter-orders":{title:"Active orders",description:"Track orders from all tables and serve ready dishes",statuses:["NEW","ACCEPTED","PREPARING","READY"],permission:"orders:manage"},
 "waiter-history":{title:"Order history",description:"Recently served and cancelled orders",statuses:["SERVED","CANCELLED"],permission:"orders:manage"},
 "manager-orders":{title:"Live orders",description:"Monitor orders across all preparation stages",statuses:["NEW","ACCEPTED","PREPARING","READY","SERVED"],permission:"orders:manage"},
 "cashier-orders":{title:"Billing queue",description:"Track ready and served orders for checkout",statuses:["READY","SERVED"],permission:"payments:read"}
};
async function parse(r:Response){const text=await r.text();let p;try{p=JSON.parse(text);}catch{throw Error("Unexpected server response ("+r.status+")");}if(!r.ok||!p?.success)throw Error(p?.message||"Request failed ("+r.status+")");return p.data;}
export default function StaffOperations(){
 const {view}=useParams<{view:string}>(),router=useRouter();const config=views[view];const bootstrap=useStaffBootstrap();
 const [token,setToken]=useState(""),[tenant,setTenant]=useState(""),[branches,setBranches]=useState<Branch[]>([]),[branch,setBranch]=useState("");
 const [access,setAccess]=useState<Access>({roles:[],permissions:[]}),[confirmedOrders,setOrders]=useState<Order[]>([]);
 const [search,setSearch]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 useEffect(()=>{if(!config){router.replace("/staff");return;}const t=localStorage.getItem("restaurantos_access_token"),raw=localStorage.getItem("restaurantos_user");if(!t||!raw){router.replace("/login");return;}try{const membership=JSON.parse(raw).memberships?.[0];if(!membership?.tenantId)throw Error("No restaurant membership");setToken(t);setTenant(membership.tenantId);}catch{router.replace("/login");}},[config,router]);
 useEffect(()=>{if(!token||!tenant)return;if(bootstrap?.token===token&&bootstrap.tenantId===tenant){setBranches(bootstrap.branches);setBranch(old=>bootstrap.branches.some(b=>b.id===old)?old:bootstrap.branches[0]?.id||"");if(!bootstrap.branches.length)setLoading(false);return;}let live=true;(async()=>{try{const data=await parse(await workspaceFetch(API+"/api/v1/tenants/"+tenant+"/staff-operations/branches",{headers:{Authorization:"Bearer "+token}}));if(live){setBranches(data);setBranch(data[0]?.id||"");if(!data.length)setLoading(false);}}catch(e){if(live){setError(e instanceof Error?e.message:"Cannot load branches");setLoading(false);}}})();return()=>{live=false;};},[token,tenant,bootstrap]);
 const scope=JSON.stringify([token,tenant,branch]),scopeRef=useRef(scope),version=useRef(0);
 const {rows:orders,pending:busy,run}=useOptimisticStatus(scope,confirmedOrders);
 useEffect(()=>{scopeRef.current=scope;setOrders([]);setAccess({roles:[],permissions:[]});return()=>{scopeRef.current="";version.current++;};},[scope]);
 const load=useCallback(async(resourceId?:string)=>{if(!branch||scopeRef.current!==scope)return;const current=++version.current;try{const headers={Authorization:"Bearer "+token};const [a,o]=await Promise.all([resourceId?Promise.resolve(null):fetch(API+"/api/v1/tenants/"+tenant+"/staff-operations/access?branchId="+branch,{headers}),fetch(API+"/api/v1/tenants/"+tenant+"/orders?branchId="+branch+"&live="+(!view.endsWith("history")),{headers,cache:"no-store"})]);const permissions=a?await parse(a):null,rows=await parse(o);if(scopeRef.current===scope&&version.current===current){if(permissions)setAccess(permissions);setOrders(rows);setError("");}}catch(e){if(scopeRef.current===scope&&version.current===current){setOrders([]);setAccess({roles:[],permissions:[]});setError(e instanceof Error?e.message:"Could not load orders");}}finally{if(scopeRef.current===scope&&version.current===current)setLoading(false);}},[branch,tenant,token,scope,view]);
 useEffect(()=>{if(!branch)return;setLoading(true);void load();},[branch,load]);
 const realtimeStatus=useOrderEvents(token,tenant,branch,load);
 const roles=access.roles.map(r=>r.toUpperCase()),manager=roles.includes("MANAGER")||roles.includes("OWNER");
 const authorized=Boolean(config&&access.permissions.includes(config.permission)&&(
 view.startsWith("kitchen-")?(manager||roles.includes("KITCHEN")):
 view.startsWith("waiter-")?(manager||roles.includes("WAITER")):
 view.startsWith("manager-")?manager:
 view.startsWith("cashier-")?(manager||roles.includes("CASHIER")):false));
 const visible=useMemo(()=>orders.filter(o=>config?.statuses.includes(o.status)&&(o.orderNumber+" "+o.tableName+" "+o.itemsSummary).toLowerCase().includes(search.toLowerCase())),[orders,config,search]);
 const next:Record<string,string>={NEW:"ACCEPTED",ACCEPTED:"PREPARING",PREPARING:"READY",READY:"SERVED"};
 const kitchen=view.startsWith("kitchen-");
 const canAdvance=(o:Order)=>authorized&&(kitchen?["NEW","ACCEPTED","PREPARING"].includes(o.status):view==="waiter-orders"&&o.status==="READY");
 async function advance(o:Order){
  const status=next[o.status];if(!status||!canAdvance(o)||busy.has(o.id))return;
  const endpoint=kitchen?"/staff-operations/kitchen/orders/":"/orders/";
  await run(o,status,async signal=>parse(await fetch(API+"/api/v1/tenants/"+tenant+endpoint+o.id+"/status",{method:"PATCH",signal,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({branchId:branch,status})})),
   confirmed=>{version.current++;setOrders(rows=>rows.map(row=>row.id===o.id&&row.status===o.status?{...row,status:confirmed}:row));},
   ()=>{void load("mutation");},e=>setError("Order #"+o.orderNumber+": "+(e instanceof Error?e.message:"Update not confirmed")+". Checking server status."));
 }
 if(!config)return null;
 return <main className="mx-auto max-w-7xl px-5 py-8 sm:px-9"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#d36a45]">RestaurantOS / Operations</p><h1 className="mt-2 text-3xl font-extrabold">{config.title}</h1><p className="mt-2 text-sm text-[#788078]">{config.description} · {realtimeStatus==="connected"?"Live updates":realtimeStatus==="connecting"?"Connecting":"Offline · use Refresh"}</p></div><button onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm"><RefreshCw size={16}/>Refresh</button></div><div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4"><label className="text-sm">Branch <select className="ml-2 rounded-lg border p-2" value={branch} onChange={e=>setBranch(e.target.value)}>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2"><Search size={16} className="text-[#788078]"/><input className="min-w-0 flex-1 text-sm outline-none" placeholder="Search order, table or item" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>{busy.size>0&&<p role="status" className="mb-3 text-xs font-medium text-amber-700">{busy.size} update{busy.size===1?"":"s"} syncing · continue with other tickets</p>}{error&&<p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{loading?<div className="rounded-2xl border bg-white p-8">Loading orders…</div>:!authorized?<div className="rounded-2xl border bg-white p-8">You do not have permission to view this page.</div>:<><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">{visible.length} orders</h2><p className="text-xs text-[#788078]">{view.endsWith("history")?"Showing up to 100 recent orders":"All active orders plus recent history"}</p></div>{visible.length===0?<div className="rounded-2xl border bg-white p-8 text-center text-[#788078]">No matching orders found.</div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(o=><article key={o.id} className="rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><div><p className="font-bold">#{o.orderNumber}</p><p className="mt-1 text-sm text-[#788078]">{o.tableName}</p></div><span className="h-fit rounded-full bg-[#f5e6db] px-3 py-1 text-xs font-bold text-[#a65d38]">{o.status}</span></div><p className="mt-4 min-h-12 text-sm leading-6">{o.itemsSummary||o.itemCount+" items"}</p><div className="mt-4 flex items-center justify-between gap-2 border-t pt-4"><span className="flex items-center gap-1 text-xs text-[#788078]"><Clock3 size={13}/>{new Date(o.createdAt).toLocaleString()}</span>{canAdvance(o)&&<button disabled={busy.has(o.id)} onClick={()=>void advance(o)} className="rounded-xl bg-[#e7764c] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy.has(o.id)?"Syncing…":statusLabel(next[o.status])}</button>}</div></article>)}</div>}</>}</main>;
}
function statusLabel(status:string){return status==="ACCEPTED"?"Accept":status==="PREPARING"?"Start preparing":status==="READY"?"Mark ready":"Mark served";}
