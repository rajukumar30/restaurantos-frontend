"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole, Settings2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://restaurantos-backend-kz2r.onrender.com";
type Feature = { key:string; name:string; category:string; description:string|null; available:boolean; enabled:boolean; overrideEnabled:boolean|null; dependencies:string[]; expiresAt:string|null };
type Envelope = { success:boolean; message:string; data:Feature[] };

export default function FeatureManagementPage() {
  const router = useRouter();
  const [token,setToken] = useState("");
  const [tenantId,setTenantId] = useState("");
  const [restaurants,setRestaurants] = useState<{id:string;name:string;slug:string}[]>([]);
  const [features,setFeatures] = useState<Feature[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [loading,setLoading] = useState(false);
  const [saving,setSaving] = useState("");
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [pending,setPending] = useState<Feature|null>(null);
  const [expiry,setExpiry] = useState("");

  useEffect(() => {
    const t=localStorage.getItem("restaurantos_access_token");
    const raw=localStorage.getItem("restaurantos_user");
    if (!t || !raw) { router.replace("/login"); return; }
    try {
      if (!JSON.parse(raw).authorities?.includes("PLATFORM_ADMIN")) { router.replace("/"); return; }
      setToken(t);
      setTenantId(new URLSearchParams(window.location.search).get("tenantId") ?? "");
      fetch(API+"/api/v1/platform/restaurants",{headers:{Authorization:"Bearer "+t}}).then(r=>r.json()).then(d=>{if(d.success&&Array.isArray(d.data))setRestaurants(d.data);}).catch(()=>{});
    } catch { router.replace("/login"); }
  },[router]);

  async function request(url:string, options?:RequestInit):Promise<Feature[]> {
    const response=await fetch(API+url,{...options,headers:{"Authorization":"Bearer "+token,...options?.headers},cache:"no-store"});
    let payload:Envelope|null=null;
    try { payload=await response.json(); } catch { /* server can return non-JSON errors */ }
    if (!response.ok || !payload?.success) throw new Error(payload?.message || "Request failed (HTTP "+response.status+")");
    return payload.data;
  }
  async function load() {
    if (!tenantId.trim() || !token) return;
    setLoading(true);setError("");setNotice("");setLoaded(false);
    try { setFeatures(await request("/api/v1/platform/restaurants/"+encodeURIComponent(tenantId.trim())+"/features"));setLoaded(true); }
    catch(e) {setFeatures([]);setError(e instanceof Error?e.message:"Could not load restaurant");}
    finally {setLoading(false);}
  }
  async function update(feature:Feature) {
    setPending(null);
    setSaving(feature.key);setError("");setNotice("");
    try {
      const updated=await request("/api/v1/platform/restaurants/"+encodeURIComponent(tenantId.trim())+"/features/"+encodeURIComponent(feature.key),{
        method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:!feature.enabled,expiresAt:expiry ? new Date(expiry).toISOString() : null})
      });
      setFeatures(updated);setExpiry("");setNotice(feature.name+" updated successfully.");
    } catch(e) {setError(e instanceof Error?e.message:"Could not update feature");}
    finally {setSaving("");}
  }
  const categories=Array.from(new Set(features.map(f=>f.category)));
  return <main className="min-h-screen bg-[#f7f4ec] px-4 py-5 sm:px-8 sm:py-9 text-[#171916]">
    <div className="mx-auto max-w-4xl">
      
      <div className="mt-5 flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f5eee5] text-[#b85d3e]"><Settings2 size={22}/></span><div><h1 className="text-2xl font-extrabold sm:text-3xl tracking-tight">Restaurant features</h1><p className="mt-2 text-sm text-[#77796f]">Control which capabilities are available to each restaurant.</p></div></div>
      <section className="panel mt-5 p-4 sm:p-5">
        <label htmlFor="restaurant-select" className="block text-sm font-bold">Choose a restaurant</label>
        <div className="mt-3 flex flex-wrap gap-2"><select id="restaurant-select" className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-3 text-sm" value={tenantId} onChange={e=>{setTenantId(e.target.value);setLoaded(false);setFeatures([]);}}>
          <option value="">Select restaurant</option>
          {tenantId&&!restaurants.some(r=>r.id===tenantId)&&<option value={tenantId}>Selected restaurant</option>}
          {restaurants.map(r=><option key={r.id} value={r.id}>{r.name} ({r.slug})</option>)}
        </select><button type="button" onClick={()=>void load()} disabled={!token||!tenantId||loading} className="primary-button disabled:opacity-50">{loading?"Loading…":"Manage features"}</button></div>
        <Link href="/admin/restaurants" className="mt-3 inline-block text-xs font-semibold text-[#b85d3e]">Browse all restaurants →</Link>
      </section>
      {pending&&<div role="dialog" aria-modal="true" aria-labelledby="feature-confirm-title" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><h2 id="feature-confirm-title" className="text-lg font-extrabold">Confirm restaurant feature change</h2><p className="mt-3 text-sm leading-6 text-[#555]">You are about to <strong>{pending.enabled?"disable":"enable"} {pending.name}</strong> for restaurant <strong className="break-all">{tenantId}</strong>. Disabling a live feature may interrupt restaurant operations.</p><label className="mt-4 block text-sm font-semibold">Override expiry (optional)<input type="datetime-local" value={expiry} onChange={e=>setExpiry(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm"/></label><p className="mt-2 text-xs text-[#77796f]">Leave blank for a permanent override. Expiry uses your local time.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>{setPending(null);setExpiry("");}} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" disabled={!!saving} onClick={()=>void update(pending)} className="rounded-xl bg-[#8c342c] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Confirm change</button></div></div></div>}
      {error&&<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {notice&&<p role="status" className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
      {loaded&&<div className="mt-5 space-y-5">
        <p className="text-xs text-[#77796f]">Changes save immediately. Unavailable integrations cannot be enabled. Feature dependencies are validated by the backend.</p>
        {categories.map(category=><section key={category} className="panel overflow-hidden"><h2 className="border-b border-[#e9e5dc] px-5 py-4 font-bold">{category}</h2><div className="divide-y divide-[#e9e5dc]">{features.filter(f=>f.category===category).map(f=><div key={f.key} className="flex items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><p className="text-sm font-bold">{f.name}</p><p className="mt-1 text-xs text-[#77796f]">{f.description}</p>{f.expiresAt&&<p className="mt-1 text-xs font-semibold text-amber-700">Override expires: {new Date(f.expiresAt).toLocaleString("en-IN")}</p>}{f.dependencies.length>0&&<p className="mt-1 text-[11px] text-[#77796f]">Requires: {f.dependencies.join(", ")}</p>}{!f.available&&<span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#a65a38]"><LockKeyhole size={12}/> Integration not configured</span>}</div><button type="button" role="switch" aria-label={f.name} aria-checked={f.enabled} onClick={()=>{setPending(f);setExpiry("");}} disabled={!f.available||!!saving} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${f.enabled?"bg-[#527a5b]":"bg-[#c6c7c0]"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${f.enabled?"left-6":"left-1"}`}/></button></div>)}</div></section>)}
        <Link href={"/admin/restaurants/service?tenantId="+encodeURIComponent(tenantId.trim())} className="inline-flex rounded-xl border border-[#e9e5dc] bg-white px-4 py-3 text-sm font-bold text-[#b85d3e]">Configure kitchen / waiter workflow</Link>
      </div>}
    </div>
  </main>;
}
