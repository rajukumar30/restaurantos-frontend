"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Restaurant = {id:string; name:string; slug:string; subdomain:string; status:string; createdAt:string};
const API=process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://restaurantos-backend-kz2r.onrender.com";
export default function RestaurantDirectory() {
  const router=useRouter();
  const [token,setToken]=useState("");
  const [search,setSearch]=useState("");
  const [submitted,setSubmitted]=useState("");
  const [page,setPage]=useState(0);
  const [rows,setRows]=useState<Restaurant[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    const t=localStorage.getItem("restaurantos_access_token");
    const raw=localStorage.getItem("restaurantos_user");
    try {
      if(!t||!raw){router.replace("/login");return;}
      if(!JSON.parse(raw).authorities?.includes("PLATFORM_ADMIN")){router.replace("/");return;}
      setToken(t);
    }catch{router.replace("/login");}
  },[router]);
  useEffect(()=>{
    if(!token)return;
    const controller=new AbortController();
    async function load(){
      setLoading(true);setError("");
      try{
        const params=new URLSearchParams({search:submitted,page:String(page)});
        const res=await fetch(API+"/api/v1/platform/restaurants?"+params,{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal});
        const data=await res.json();
        if(!res.ok||!data.success||!Array.isArray(data.data))throw new Error(data.message||"Unable to load restaurants");
        setRows(data.data);
      }catch(e){if(!controller.signal.aborted){setError(e instanceof Error?e.message:"Request failed");setRows([]);}}
      finally{if(!controller.signal.aborted)setLoading(false);}
    }
    void load();return()=>controller.abort();
  },[token,submitted,page]);
  return <main className="min-h-screen bg-[#f7f4ec] px-4 py-5 sm:px-8 sm:py-9 text-[#171916]"><div className="mx-auto max-w-5xl">
    
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-extrabold sm:text-3xl">Restaurants</h1><p className="mt-2 text-sm text-[#77796f]">Find and manage onboarded restaurants.</p></div><Link className="primary-button" href="/admin/restaurants/new">Add restaurant</Link></div>
    <form className="mt-7 flex gap-2" onSubmit={e=>{e.preventDefault();setPage(0);setSubmitted(search.trim());}}>
      <input aria-label="Search restaurants" maxLength={100} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or slug" className="min-w-0 flex-1 rounded-xl border border-[#e9e5dc] bg-white px-4 py-3 text-sm"/>
      <button className="primary-button" type="submit">Search</button>
    </form>
    {error&&<p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-5 overflow-hidden rounded-2xl border border-[#e9e5dc] bg-white">
      {loading?<p className="p-6 text-sm">Loading restaurants…</p>:rows.length===0?<p className="p-6 text-sm text-[#77796f]">No restaurants found.</p>:<div className="divide-y divide-[#e9e5dc]">{rows.map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"><div><Link href={"/admin/restaurants/"+encodeURIComponent(r.id)} className="font-bold hover:text-[#b85d3e]">{r.name}</Link><p className="mt-1 text-xs text-[#77796f]">{r.slug} · {r.subdomain} · {r.status}</p></div><div className="flex flex-wrap gap-3"><Link href={"/admin/restaurants/"+encodeURIComponent(r.id)} className="text-sm font-bold text-[#b85d3e]">View / Edit →</Link><Link href={"/admin/restaurants/features?tenantId="+encodeURIComponent(r.id)} className="text-sm font-bold text-[#b85d3e]">Features →</Link></div></div>)}</div>}
    </div>
    <div className="mt-5 flex items-center justify-between"><button type="button" disabled={page===0||loading} onClick={()=>setPage(p=>p-1)} className="rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-40">Previous</button><span className="text-sm text-[#77796f]">Page {page+1}</span><button type="button" disabled={loading||rows.length<25} onClick={()=>setPage(p=>p+1)} className="rounded-xl border bg-white px-4 py-2 text-sm disabled:opacity-40">Next</button></div>
  </div></main>;
}
