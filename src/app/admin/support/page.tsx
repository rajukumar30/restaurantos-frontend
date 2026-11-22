"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {Headphones,Search,ShieldCheck} from "lucide-react";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Restaurant={id:string;name:string;slug:string;status:string;subdomain?:string};
export default function PlatformSupport(){
 const [search,setSearch]=useState("");const [query,setQuery]=useState("");
 const [page,setPage]=useState(0);const [rows,setRows]=useState<Restaurant[]>([]);
 const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{
  const token=localStorage.getItem("restaurantos_access_token");
  if(!token){setError("Please sign in again.");setLoading(false);return;}
  const controller=new AbortController();setLoading(true);setError("");
  const params=new URLSearchParams({search:query,page:String(page)});
  fetch(API+"/api/v1/platform/restaurants?"+params,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal})
   .then(async response=>{const data=await response.json();if(!response.ok||!data.success||!Array.isArray(data.data))throw Error(data.message||"Unable to load restaurants");return data.data as Restaurant[];})
   .then(data=>{if(!controller.signal.aborted)setRows(data);})
   .catch(e=>{if(!controller.signal.aborted){setRows([]);setError(e instanceof Error?e.message:"Request failed");}})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[query,page]);
 return <main className="px-4 py-6 sm:px-8 sm:py-10">
  <div className="flex items-start gap-3"><span className="rounded-xl bg-[#fff0e8] p-3 text-[#b85d3e]"><Headphones size={24}/></span><div><p className="text-xs font-bold uppercase tracking-widest text-[#c15d3c]">Platform operations</p><h1 className="mt-1 text-3xl font-extrabold">Support center</h1><p className="mt-2 text-sm text-[#77796f]">Find a restaurant and open the appropriate administration tool. No impersonation or account modifications.</p></div></div>
  <section className="mt-6 rounded-2xl border bg-white p-5">
   <form className="flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();setPage(0);setQuery(search.trim());}}><input aria-label="Find restaurant" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)} placeholder="Restaurant name or slug" className="min-w-0 flex-1 rounded-xl border px-4 py-3 text-sm"/><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#e56a42] px-4 py-3 text-sm font-bold text-white"><Search size={16}/> Find</button></form>
   {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   {loading?<p className="mt-5 text-sm">Loading restaurants…</p>:!error&&rows.length===0?<p className="mt-5 text-sm text-[#77796f]">No matching restaurants.</p>:<div className="mt-5 divide-y">{rows.map(r=><article key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h2 className="font-bold">{r.name}</h2><p className="mt-1 text-xs text-[#77796f]">{r.slug} · {r.status}</p></div><div className="flex flex-wrap gap-2 text-xs font-bold text-[#b85d3e]"><Link className="rounded-lg border px-3 py-2" href={"/admin/restaurants/"+encodeURIComponent(r.id)}>Restaurant</Link><Link className="rounded-lg border px-3 py-2" href={"/admin/subscriptions?tenantId="+encodeURIComponent(r.id)}>Subscription</Link><Link className="rounded-lg border px-3 py-2" href={"/admin/users?tenantId="+encodeURIComponent(r.id)}>Users</Link><Link className="rounded-lg border px-3 py-2" href={"/admin/audit?tenantId="+encodeURIComponent(r.id)}>Audit</Link></div></article>)}</div>}
   <div className="mt-4 flex items-center justify-between border-t pt-4"><button type="button" disabled={loading||page===0} onClick={()=>setPage(p=>p-1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-xs">Page {page+1}</span><button type="button" disabled={loading||rows.length<25} onClick={()=>setPage(p=>p+1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Next</button></div>
  </section>
  <p className="mt-4 flex items-start gap-2 text-xs text-[#77796f]"><ShieldCheck size={16}/> Read-only support navigation. Future ticketing and account actions require dedicated permissions and audit logging.</p>
 </main>;
}
