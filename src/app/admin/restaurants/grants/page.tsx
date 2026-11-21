"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Restaurant={id:string;name:string};
type Feature={key:string;name:string;available:boolean};
type Grant={id:string;featureKey:string;expiresAt:string;revokedAt:string|null;startsAt:string};
type Envelope<T>={success:boolean;message?:string;data:T};
export default function GrantsPage(){
 const [restaurants,setRestaurants]=useState<Restaurant[]>([]);
 const [features,setFeatures]=useState<Feature[]>([]);
 const [tenant,setTenant]=useState("");
 const [key,setKey]=useState("");
 const [expiry,setExpiry]=useState("");
 const [grants,setGrants]=useState<Grant[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 async function request<T>(path:string,options?:RequestInit):Promise<T>{
  const token=localStorage.getItem("restaurantos_access_token");
  const r=await fetch(API+path,{...options,headers:{Authorization:"Bearer "+token,...options?.headers},cache:"no-store"});
  const p:Envelope<T>=await r.json();
  if(!r.ok||!p.success)throw Error(p.message||"Request failed");
  return p.data;
 }
 useEffect(()=>{let active=true;Promise.all([
  request<Restaurant[]>("/api/v1/platform/restaurants"),
  request<Feature[]>("/api/v1/platform/features")
 ]).then(([r,f])=>{if(active){setRestaurants(r);setFeatures(f);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 useEffect(()=>{if(!tenant){setGrants([]);return;}let active=true;
  request<Grant[]>("/api/v1/platform/restaurants/"+encodeURIComponent(tenant)+"/grants")
   .then(g=>{if(active)setGrants(g);}).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};
 },[tenant]);
 async function create(e:React.FormEvent){e.preventDefault();if(!tenant||!key||!expiry)return;
  setBusy(true);setError("");setNotice("");
  try{const date=new Date(expiry);if(!Number.isFinite(date.getTime())||date.getTime()<=Date.now())throw Error("Choose a future expiry");
   const g=await request<Grant[]>("/api/v1/platform/restaurants/"+encodeURIComponent(tenant)+"/grants",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({featureKey:key,expiresAt:date.toISOString()})
   });setGrants(g);setKey("");setExpiry("");setNotice("Complimentary feature grant created.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to create grant");}finally{setBusy(false);}
 }
 async function revoke(g:Grant){if(!window.confirm("Revoke this complimentary feature grant?"))return;
  setBusy(true);setError("");setNotice("");
  try{setGrants(await request<Grant[]>("/api/v1/platform/restaurants/"+encodeURIComponent(tenant)+"/grants/"+encodeURIComponent(g.id),{method:"DELETE"}));setNotice("Grant revoked.");}
  catch(e){setError(e instanceof Error?e.message:"Unable to revoke grant");}finally{setBusy(false);}
 }
 return <main className="px-4 py-6 sm:px-8 sm:py-10">
  <Link href="/admin/restaurants" className="text-sm font-bold text-[#b85d3e]">← Restaurants</Link>
  <h1 className="mt-4 text-2xl font-extrabold">Complimentary feature grants</h1>
  <p className="mt-2 text-sm text-[#77796f]">Grant an available feature outside the subscription plan until a specified date. All changes are audited.</p>
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
  {notice&&<p role="status" className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</p>}
  <form onSubmit={e=>void create(e)} className="mt-6 grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2">
   <label className="text-sm font-bold">Restaurant<select required value={tenant} onChange={e=>setTenant(e.target.value)} className="mt-2 w-full rounded-lg border p-3"><option value="">Choose restaurant</option>{restaurants.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
   <label className="text-sm font-bold">Feature<select required value={key} onChange={e=>setKey(e.target.value)} className="mt-2 w-full rounded-lg border p-3"><option value="">Choose feature</option>{features.filter(f=>f.available).map(f=><option key={f.key} value={f.key}>{f.name}</option>)}</select></label>
   <label className="text-sm font-bold">Expires at (local time)<input required type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} className="mt-2 w-full rounded-lg border p-3"/></label>
   <div className="flex items-end"><button disabled={busy||!tenant||!key||!expiry} className="rounded-xl bg-[#e56a42] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Saving…":"Grant feature"}</button></div>
  </form>
  <section className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-extrabold">Grant history</h2>
   {!tenant?<p className="mt-3 text-sm">Choose a restaurant.</p>:grants.length===0?<p className="mt-3 text-sm">No grants recorded.</p>:
    <div className="mt-3 divide-y">{grants.map(g=><div key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{g.featureKey}</p><p className="mt-1 text-xs text-[#77796f]">Expires {new Date(g.expiresAt).toLocaleString("en-IN")}</p><p className="text-xs">{g.revokedAt?"Revoked":new Date(g.expiresAt).getTime()<=Date.now()?"Expired":"Active"}</p></div>{!g.revokedAt&&new Date(g.expiresAt).getTime()>Date.now()&&<button disabled={busy} onClick={()=>void revoke(g)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Revoke</button>}</div>)}</div>}
  </section>
 </main>;
}
