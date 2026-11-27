"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Feature={key:string;name:string;category:string;platformAvailable:boolean;planIncluded:boolean;restaurantEnabled:boolean;effectiveEnabled:boolean;reason:string};
type Snapshot={tenantId:string;planName:string|null;subscriptionStatus:string;accessEligible:boolean;features:Feature[]};
type Membership={tenantId:string;tenantName:string};

export default function OwnerFeaturesPage(){
 const router=useRouter();
 const [token,setToken]=useState("");
 const [memberships,setMemberships]=useState<Membership[]>([]);
 const [tenantId,setTenantId]=useState("");
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  const t=localStorage.getItem("restaurantos_access_token"),raw=localStorage.getItem("restaurantos_user");
  if(!t||!raw){router.replace("/login?next=%2Fowner%2Ffeatures");return;}
  try{
   const user=JSON.parse(raw);
   const list:Membership[]=Array.isArray(user.memberships)?user.memberships.filter((m:Membership)=>m.tenantId):[];
   if(!JSON.stringify(user.memberships??[]).toUpperCase().includes("OWNER")&&!user.authorities?.includes("PLATFORM_ADMIN")){
    router.replace("/");return;
   }
   setToken(t);setMemberships(list);setTenantId(list[0]?.tenantId??"");
  }catch{router.replace("/login");}
 },[router]);
 useEffect(()=>{
  if(!token||!tenantId)return;
  const controller=new AbortController();
  setLoading(true);setError("");setSnapshot(null);
  fetch(API+"/api/v1/tenants/"+encodeURIComponent(tenantId)+"/entitlements",{
   headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal
  }).then(async r=>{
   const payload=await r.json();
   if(!r.ok||!payload.success||!payload.data)throw new Error(payload.message||"Unable to load plan features");
   return payload.data as Snapshot;
  }).then(data=>{if(!controller.signal.aborted)setSnapshot(data);})
   .catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Unable to load features");})
   .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[token,tenantId]);
 const features=snapshot?.features??[];
 return <main className="mx-auto max-w-5xl px-4 py-8 text-[#20241f]">
  <div className="mb-6"><p className="text-xs font-bold uppercase tracking-wider text-[#bd6341]">Restaurant subscription</p>
   <h1 className="mt-2 text-2xl font-extrabold">Your plan & features</h1>
   <p className="mt-2 text-sm text-[#77796f]">See which RestaurantOS features are available for your restaurant. Feature access is enforced by the server.</p>
  </div>
  {memberships.length>1&&<label className="mb-5 block text-sm font-semibold">Restaurant
   <select value={tenantId} onChange={e=>setTenantId(e.target.value)} className="mt-2 block w-full max-w-md rounded-xl border bg-white p-3">
    {memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}
   </select></label>}
  {loading&&<p role="status" className="rounded-xl bg-white p-5">Loading subscription features…</p>}
  {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</p>}
  {snapshot&&<><section className="rounded-2xl border bg-white p-5">
   <p className="text-sm text-[#77796f]">Current plan</p>
   <p className="mt-1 text-xl font-bold">{snapshot.planName??"No subscription assigned"}</p>
   <p className="mt-2 text-sm">Subscription status: <strong>{snapshot.subscriptionStatus.replaceAll("_"," ")}</strong></p>
   {!snapshot.accessEligible&&<p className="mt-2 text-sm text-amber-700">Your subscription is not currently eligible. Active complimentary grants may still be available.</p>}
  </section>
  <div className="mt-6 grid gap-3 sm:grid-cols-2">
   {features.map(f=><div key={f.key} className="rounded-2xl border bg-white p-4">
    <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{f.name}</p><p className="mt-1 text-xs text-[#77796f]">{f.category}</p></div>
    <span className={f.effectiveEnabled?"rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800":"rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600"}>{f.effectiveEnabled?"Available":"Unavailable"}</span></div>
    {!f.effectiveEnabled&&<p className="mt-3 text-xs text-[#77796f]">{f.reason.replaceAll("_"," ").toLowerCase()}</p>}
   </div>)}
  </div>
  {features.length===0&&<p className="mt-5 text-sm">No features have been configured yet.</p>}
  </>}
  <Link href="/owner/" className="mt-8 inline-block text-sm font-semibold text-[#bd6341]">Back to overview</Link>
 </main>;
}
