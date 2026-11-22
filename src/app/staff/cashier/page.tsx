"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {Wallet,ReceiptText,ClipboardList,RefreshCw,CheckCircle2,Clock3} from "lucide-react";
import {useOrderEvents} from "@/lib/realtime/use-order-events";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Branch={id:string;name:string};
type Bill={id:string;orderNumber:string;tableName:string;status:string;totalAmount:number;paidAmount:number;createdAt:string};
async function read(response:Response){
 const raw=await response.text();let data;
 try{data=JSON.parse(raw);}catch{throw Error("Invalid server response ("+response.status+")");}
 if(!response.ok||!data?.success)throw Error(data?.message||"Request failed ("+response.status+")");
 return data.data;
}
const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(n);
export default function CashierOverview(){
 const router=useRouter();
 const [token,setToken]=useState(""),[tenant,setTenant]=useState(""),[branch,setBranch]=useState("");
 const [branches,setBranches]=useState<Branch[]>([]),[bills,setBills]=useState<Bill[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{
  const t=localStorage.getItem("restaurantos_access_token"),raw=localStorage.getItem("restaurantos_user");
  if(!t||!raw){router.replace("/login?next=%2Fstaff%2Fcashier");return;}
  try{const membership=JSON.parse(raw).memberships?.[0];if(!membership?.tenantId)throw Error("No restaurant");setToken(t);setTenant(membership.tenantId);}
  catch{router.replace("/login");}
 },[router]);
 useEffect(()=>{
  if(!token||!tenant)return;let active=true;
  (async()=>{try{const data:Branch[]=await read(await fetch(API+"/api/v1/tenants/"+tenant+"/staff-operations/branches",{headers:{Authorization:"Bearer "+token}}));if(active){setBranches(data);setBranch(data[0]?.id||"");if(!data.length)setLoading(false);}}
  catch(e){if(active){setError(e instanceof Error?e.message:"Unable to load branches");setLoading(false);}}})();
  return()=>{active=false;};
 },[token,tenant]);
 const load=useCallback(async()=>{
  if(!token||!tenant||!branch)return;
  try{const data:Bill[]=await read(await fetch(API+"/api/v1/tenants/"+tenant+"/staff-operations/billing/orders?branchId="+branch,{headers:{Authorization:"Bearer "+token},cache:"no-store"}));setBills(data);setError("");}
  catch(e){setError(e instanceof Error?e.message:"Unable to load billing overview");}
  finally{setLoading(false);}
 },[token,tenant,branch]);
 useEffect(()=>{if(!branch)return;setLoading(true);void load();},[branch,load]);
 const realtime=useOrderEvents(token,tenant,branch,load,"billing");
 const metrics=useMemo(()=>{
  const due=bills.reduce((sum,b)=>sum+Math.max(0,Number(b.totalAmount)-Number(b.paidAmount)),0);
  const recorded=bills.reduce((sum,b)=>sum+Number(b.paidAmount),0);
  return {due,recorded,pending:bills.filter(b=>Number(b.totalAmount)>Number(b.paidAmount)).length,settled:bills.filter(b=>Number(b.totalAmount)<=Number(b.paidAmount)).length};
 },[bills]);
 return <main className="mx-auto max-w-7xl px-5 py-8 sm:px-9">
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
   <div><p className="text-xs font-bold uppercase tracking-widest text-[#d36a45]">RestaurantOS / Cashier</p><h1 className="mt-2 text-3xl font-extrabold">Cashier overview</h1><p className="mt-2 text-sm text-[#788078]">Live billing snapshot for the selected branch · {realtime==="connected"?"Live updates":realtime==="connecting"?"Connecting…":"Offline · refresh manually"}</p></div>
   <button onClick={()=>void load()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm"><RefreshCw size={16}/>Refresh</button>
  </div>
  <label className="mb-6 block text-sm">Branch <select value={branch} onChange={e=>setBranch(e.target.value)} className="ml-2 rounded-lg border bg-white p-2">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
  {error&&<p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
   {[{label:"Outstanding balance",value:money(metrics.due),icon:Wallet},{label:"Recorded payments",value:money(metrics.recorded),icon:ReceiptText},{label:"Pending bills",value:String(metrics.pending),icon:Clock3},{label:"Fully paid orders",value:String(metrics.settled),icon:CheckCircle2}].map(m=><div key={m.label} className="rounded-2xl border bg-white p-5"><m.icon size={20} className="text-[#d36a45]"/><p className="mt-3 text-sm text-[#788078]">{m.label}</p><p className="mt-1 text-2xl font-bold">{loading?"…":m.value}</p></div>)}
  </div>
  <p className="mt-3 text-xs text-[#788078]">Figures reflect the latest 100 ready/served orders returned by the billing API, not full-day accounting totals.</p>
  <div className="mt-8 grid gap-4 md:grid-cols-2">
   <Link href="/staff/billing" className="rounded-2xl border bg-white p-6 transition hover:border-[#e7764c]"><Wallet className="text-[#d36a45]"/><h2 className="mt-3 text-lg font-bold">Billing & payments</h2><p className="mt-2 text-sm text-[#788078]">Review itemized bills, record counter payments and open eligible PDF receipts.</p></Link>
   <Link href="/staff/operations/cashier-orders" className="rounded-2xl border bg-white p-6 transition hover:border-[#e7764c]"><ClipboardList className="text-[#d36a45]"/><h2 className="mt-3 text-lg font-bold">Billing queue</h2><p className="mt-2 text-sm text-[#788078]">Review ready and served orders waiting for checkout.</p></Link>
  </div>
  <section className="mt-8 rounded-2xl border bg-white p-5"><h2 className="text-lg font-bold">Recent bills</h2>
   {loading?<p className="mt-4 text-sm">Loading…</p>:bills.length===0?<p className="mt-4 text-sm text-[#788078]">No ready or served orders found.</p>:<div className="mt-4 divide-y">{bills.slice(0,8).map(b=><div key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold">#{b.orderNumber} · {b.tableName}</p><p className="text-xs text-[#788078]">{b.status}</p></div><div className="text-right"><p className="font-semibold">{money(Math.max(0,Number(b.totalAmount)-Number(b.paidAmount)))} due</p><Link href="/staff/billing" className="text-xs font-semibold text-[#b65b37]">Open billing</Link></div></div>)}</div>}
  </section>
 </main>;
}
