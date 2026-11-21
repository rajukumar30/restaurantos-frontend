"use client";
import {useEffect,useState} from "react";
import {ShieldCheck,History} from "lucide-react";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Event={id:string;actorName:string;restaurantName:string;action:string;featureKey:string|null;oldValue:boolean|null;newValue:boolean|null;createdAt:string};
type Restaurant={id:string;name:string};
export default function AuditPage(){
 const [restaurants,setRestaurants]=useState<Restaurant[]>([]);
 const [tenantId,setTenantId]=useState("");
 const [page,setPage]=useState(0);
 const [events,setEvents]=useState<Event[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  const token=localStorage.getItem("restaurantos_access_token");
  if(!token)return;
  const controller=new AbortController();
  fetch(API+"/api/v1/platform/restaurants",{headers:{Authorization:"Bearer "+token},signal:controller.signal}).then(r=>r.json()).then(p=>{if(!controller.signal.aborted&&p.success&&Array.isArray(p.data))setRestaurants(p.data);}).catch(()=>{});
  return()=>controller.abort();
 },[]);
 useEffect(()=>{
  const token=localStorage.getItem("restaurantos_access_token");
  if(!token){setLoading(false);setError("Please sign in.");return;}
  const controller=new AbortController();setLoading(true);setError("");
  const query=new URLSearchParams({page:String(page)});
  if(tenantId)query.set("tenantId",tenantId);
  fetch(API+"/api/v1/platform/audit?"+query,{headers:{Authorization:"Bearer "+token},signal:controller.signal,cache:"no-store"})
   .then(async r=>{const p=await r.json();if(!r.ok||!p.success||!Array.isArray(p.data))throw Error(p.message||"Could not load audit history");return p.data as Event[];})
   .then(d=>{if(!controller.signal.aborted)setEvents(d);})
   .catch(e=>{if(!controller.signal.aborted){setError(e.message);setEvents([]);}})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[tenantId,page]);
 return <main className="px-4 py-5 sm:px-8 sm:py-10">
  <div className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-[#c15d3c]">Platform security</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Audit logs</h1><p className="mt-2 text-sm text-[#77796f]">Review administrative changes across restaurants. This history is read-only.</p></div>
  <section className="rounded-2xl border border-[#e8e5dd] bg-white p-4 sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><ShieldCheck size={20} className="text-[#c15d3c]"/><h2 className="font-bold">Administrative activity</h2></div><select aria-label="Filter by restaurant" value={tenantId} onChange={e=>{setTenantId(e.target.value);setPage(0);}} className="max-w-full rounded-xl border bg-white px-3 py-2 text-sm"><option value="">All restaurants</option>{restaurants.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
   {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
   {loading?<p role="status" className="mt-6 text-sm text-[#77796f]">Loading audit history…</p>:!error&&events.length===0?<p className="mt-6 text-sm text-[#77796f]">No audit events found for this selection.</p>:<div className="mt-5 divide-y divide-[#eee9e0]">{events.map(e=><article key={e.id} className="flex gap-3 py-4"><span className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#fff1e9] text-[#c15d3c]"><History size={17}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><p className="break-words text-sm font-bold">{e.action.replaceAll("_"," ")}</p><time className="text-xs text-[#858a80]">{new Date(e.createdAt).toLocaleString("en-IN")}</time></div><p className="mt-1 text-xs text-[#77796f]">{e.actorName} · {e.restaurantName}</p>{e.featureKey&&<p className="mt-1 text-xs text-[#77796f]">Feature: {e.featureKey.replaceAll("_"," ")} · {String(e.oldValue)} → {String(e.newValue)}</p>}</div></article>)}</div>}
   <div className="mt-5 flex items-center justify-between gap-2 border-t pt-4"><button type="button" disabled={page===0||loading} onClick={()=>setPage(p=>p-1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-xs text-[#77796f]">Page {page+1}</span><button type="button" disabled={loading||events.length<25} onClick={()=>setPage(p=>p+1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Next</button></div>
  </section>
 </main>;
}
