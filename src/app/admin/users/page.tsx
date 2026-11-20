"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Users,Search,ShieldCheck} from "lucide-react";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Restaurant={id:string;name:string};
type Member={membershipId:string;userId:string;name:string;email:string;phone:string|null;accountStatus:string;membershipStatus:string;tenantId:string;restaurantName:string;roles:string;joinedAt:string};
export default function UsersPage(){
 const [restaurants,setRestaurants]=useState<Restaurant[]>([]);
 const [tenantId,setTenantId]=useState("");
 const [search,setSearch]=useState("");
 const [term,setTerm]=useState("");
 const [page,setPage]=useState(0);
 const [rows,setRows]=useState<Member[]>([]);
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
  if(!token){setError("Please sign in again.");setLoading(false);return;}
  const controller=new AbortController();setLoading(true);setError("");
  const query=new URLSearchParams({page:String(page),search:term});
  if(tenantId)query.set("tenantId",tenantId);
  fetch(API+"/api/v1/platform/users?"+query,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal})
   .then(async r=>{const p=await r.json();if(!r.ok||!p.success||!Array.isArray(p.data))throw Error(p.message||"Unable to load users");return p.data as Member[];})
   .then(d=>{if(!controller.signal.aborted)setRows(d);})
   .catch(e=>{if(!controller.signal.aborted){setRows([]);setError(e.message);}})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[tenantId,term,page]);
 return <main className="px-4 py-5 sm:px-8 sm:py-10">
  <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#c15d3c]">Restaurant support</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Restaurant account lookup</h1><p className="mt-2 text-sm text-[#77796f]">Support-only lookup of restaurant memberships, assigned roles and account status. This page cannot change staff access.</p></div>
  <section className="rounded-2xl border border-[#e8e5dd] bg-white p-4 shadow-sm sm:p-6">
   <div className="mb-5 flex items-center gap-2"><Users size={20} className="text-[#c15d3c]"/><h2 className="font-bold">Restaurant users</h2></div>
   <form onSubmit={e=>{e.preventDefault();setPage(0);setTerm(search.trim());}} className="flex flex-col gap-3 sm:flex-row">
    <select aria-label="Filter by restaurant" value={tenantId} onChange={e=>{setTenantId(e.target.value);setPage(0);}} className="min-w-0 rounded-xl border bg-white px-3 py-3 text-sm sm:max-w-[240px]"><option value="">All restaurants</option>{restaurants.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
    <input aria-label="Search users" maxLength={100} placeholder="Search name or email" value={search} onChange={e=>setSearch(e.target.value)} className="min-w-0 flex-1 rounded-xl border px-3 py-3 text-sm"/>
    <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e56a42] px-5 py-3 text-sm font-bold text-white"><Search size={16}/> Search</button>
   </form>
   {error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
   {loading?<p role="status" className="mt-6 text-sm text-[#77796f]">Loading user memberships…</p>:!error&&rows.length===0?<p className="mt-6 text-sm text-[#77796f]">No users match these filters.</p>:<div className="mt-5 divide-y divide-[#eee9e0]">{rows.map(m=><article key={m.membershipId} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0 flex-1"><h3 className="break-words font-bold">{m.name}</h3><p className="mt-1 break-all text-xs text-[#77796f]">{m.email}{m.phone?" · "+m.phone:""}</p><p className="mt-2 text-sm"><Link href={"/admin/restaurants/"+encodeURIComponent(m.tenantId)} className="font-semibold text-[#b85d3e]">{m.restaurantName}</Link> · {m.roles}</p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#edf5ed] px-2.5 py-1 text-xs font-bold text-[#42704d]">{m.membershipStatus} membership</span><span className="rounded-full bg-[#f5f4ef] px-2.5 py-1 text-xs font-bold text-[#77796f]">{m.accountStatus} account</span></div></article>)}</div>}
   <div className="mt-5 flex items-center justify-between border-t pt-4"><button type="button" disabled={loading||page===0} onClick={()=>setPage(p=>p-1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-xs text-[#77796f]">Page {page+1}</span><button type="button" disabled={loading||rows.length<25} onClick={()=>setPage(p=>p+1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Next</button></div>
  </section>
  <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#77796f]"><ShieldCheck size={16} className="shrink-0"/> A user can belong to more than one restaurant. Account-level changes are intentionally disabled until tenant-scoped permission and audit controls are complete.</p>
 </main>;
}
