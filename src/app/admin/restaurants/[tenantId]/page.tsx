"use client";
import {useEffect,useState} from "react";
import {useParams} from "next/navigation";
import Link from "next/link";
import {ArrowLeft,Settings2,Save,CreditCard,ChefHat,ShieldCheck,CheckCircle2,XCircle} from "lucide-react";
import BranchEditor from "@/components/platform-branch-editor";
type Branch={id:string;name:string;branchCode:string;phone:string|null;status:string;timezone:string;address:string};
type Owner={id:string;name:string;email:string;phone:string|null;status:string};
type Profile={restaurant:Restaurant;branches:Branch[];owners:Owner[]};
type Entitlements={planId:string|null;planName:string|null;subscriptionStatus:string;accessEligible:boolean;features:{key:string;name?:string;category?:string;effectiveEnabled:boolean;reason?:string;planIncluded?:boolean}[]};
type Restaurant={id:string;name:string;slug:string;subdomain:string;status:string;createdAt:string};
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
export default function RestaurantDetails(){
 const params=useParams();const id=String(params.tenantId??"");
 const [entitlements,setEntitlements]=useState<Entitlements|null>(null);
 const [featureFilter,setFeatureFilter]=useState<"ALL"|"ENABLED"|"DISABLED">("ALL");const [entitlementError,setEntitlementError]=useState("");
 const [data,setData]=useState<Restaurant|null>(null);const [profile,setProfile]=useState<Profile|null>(null);const [name,setName]=useState("");const [status,setStatus]=useState("ACTIVE");
 const [editing,setEditing]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 useEffect(()=>{if(!id)return;const controller=new AbortController();const token=localStorage.getItem("restaurantos_access_token");
 fetch(API+"/api/v1/platform/restaurants/"+encodeURIComponent(id)+"/profile",{headers:{Authorization:"Bearer "+token},signal:controller.signal}).then(async r=>{const p=await r.json();if(!r.ok||!p.success)throw Error(p.message||"Unable to load restaurant");return p.data as Profile;}).then(d=>{if(!controller.signal.aborted){setProfile(d);setData(d.restaurant);setName(d.restaurant.name);setStatus(d.restaurant.status);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});return()=>controller.abort();},[id]);
 useEffect(()=>{
  if(!id)return;
  const controller=new AbortController();
  const token=localStorage.getItem("restaurantos_access_token");
  fetch(API+"/api/v1/platform/restaurants/"+encodeURIComponent(id)+"/entitlements",{
   headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal
  }).then(async r=>{const p=await r.json();if(!r.ok||!p.success||!p.data)throw Error(p.message||"Unable to load subscription");return p.data as Entitlements;})
   .then(v=>{if(!controller.signal.aborted)setEntitlements(v);})
   .catch(e=>{if(!controller.signal.aborted)setEntitlementError(e instanceof Error?e.message:"Unable to load subscription");});
  return()=>controller.abort();
 },[id]);
 async function save(){if(!data||busy)return;if(!name.trim()){setError("Restaurant name is required");return;}
 if(status!==data.status&&!window.confirm(status==="INACTIVE"?"Mark this restaurant inactive? Confirm only after reviewing the impact on restaurant access.":"Reactivate this restaurant?"))return;
 setBusy(true);setError("");setMessage("");
 try{const token=localStorage.getItem("restaurantos_access_token");const r=await fetch(API+"/api/v1/platform/restaurants/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({name:name.trim(),status})});const p=await r.json();if(!r.ok||!p.success)throw Error(p.message||"Update failed");setData(p.data);setName(p.data.name);setStatus(p.data.status);setEditing(false);setMessage("Restaurant details updated.");}catch(e){setError(e instanceof Error?e.message:"Update failed");}finally{setBusy(false);}
 }
 return <main className="px-4 py-5 sm:px-8 sm:py-9"><Link href="/admin/restaurants" className="inline-flex items-center gap-2 text-sm font-semibold text-[#b85d3e]"><ArrowLeft size={16}/> All restaurants</Link><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#c15d3c]">Restaurant profile</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{data?.name??"Restaurant details"}</h1></div>{data&&<span className={`rounded-full px-3 py-1 text-xs font-bold ${data.status==="ACTIVE"?"bg-green-50 text-green-700":"bg-slate-100 text-slate-700"}`}>{data.status}</span>}</div>
 {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{message&&<p role="status" className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">{message}</p>}
 {!data&&!error&&<p className="mt-5">Loading restaurant…</p>}
 {data&&<><section className="mt-5 rounded-2xl border border-[#e8e5dd] bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Basic information</h2><button type="button" onClick={()=>{setEditing(v=>!v);setName(data.name);setStatus(data.status);setError("");}} className="text-sm font-bold text-[#b85d3e]">{editing?"Cancel":"Edit"}</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><label className="text-xs font-semibold text-[#77796f]">Restaurant name</label>{editing?<input aria-label="Restaurant name" maxLength={150} value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/>:<p className="mt-1 font-semibold">{data.name}</p>}</div><div><label className="text-xs font-semibold text-[#77796f]">Status</label>{editing?<select aria-label="Restaurant status" value={status} onChange={e=>setStatus(e.target.value)} className="mt-2 w-full rounded-xl border bg-white p-3"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>:<p className="mt-1 font-semibold">{data.status}</p>}</div><div><p className="text-xs font-semibold text-[#77796f]">Restaurant slug</p><p className="mt-1 break-all font-semibold">{data.slug}</p></div><div><p className="text-xs font-semibold text-[#77796f]">Subdomain</p><p className="mt-1 break-all font-semibold">{data.subdomain}</p></div><div><p className="text-xs font-semibold text-[#77796f]">Created</p><p className="mt-1 font-semibold">{new Date(data.createdAt).toLocaleDateString("en-IN")}</p></div></div>{editing&&<button disabled={busy} type="button" onClick={()=>void save()} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#e56a42] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Save size={16}/>{busy?"Saving…":"Save changes"}</button>}</section>
 {profile&&<div className="mt-4 grid gap-4 lg:grid-cols-2">
  <section className="rounded-2xl border border-[#e8e5dd] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold">Restaurant owner</h2>{profile.owners.length===0?<p className="mt-3 text-sm text-[#77796f]">No owner role found for this restaurant.</p>:profile.owners.map(owner=><div key={owner.id} className="mt-4 space-y-2 border-t pt-4 text-sm"><p><span className="text-[#77796f]">Name:</span> <strong>{owner.name}</strong></p><p><span className="text-[#77796f]">Email:</span> {owner.email}</p><p><span className="text-[#77796f]">Phone:</span> {owner.phone||"Not provided"}</p><p><span className="text-[#77796f]">Account:</span> {owner.status}</p></div>)}</section>
  <section className="rounded-2xl border border-[#e8e5dd] bg-white p-4 sm:p-6"><h2 className="text-lg font-extrabold">Branches & onboarding addresses</h2>{profile.branches.length===0?<p className="mt-3 text-sm text-[#77796f]">No branches found.</p>:profile.branches.map(branch=><BranchEditor key={branch.id} tenantId={id} branch={branch} onSaved={updated=>setProfile(current=>current?{...current,branches:current.branches.map(b=>b.id===updated.id?updated:b)}:current)}/>)}</section>
 </div>}
 <section className="mt-4 rounded-2xl border border-[#e8e5dd] bg-white p-4 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="inline-flex items-center gap-2 text-lg font-extrabold"><CreditCard size={19}/> Subscription details</h2>
  <Link href={"/admin/subscriptions?tenantId="+encodeURIComponent(id)} className="text-sm font-bold text-[#b85d3e]">{entitlements?.planId?"Manage subscription →":"Assign plan →"}</Link></div>
  {entitlementError?<p role="alert" className="mt-3 text-sm text-red-700">{entitlementError}</p>:!entitlements?<p className="mt-3 text-sm text-[#77796f]">Loading subscription…</p>:<div className="mt-4 grid gap-4 sm:grid-cols-3">
   <div><p className="text-xs text-[#77796f]">Assigned plan</p><p className="mt-1 font-bold">{entitlements.planName||"No plan assigned"}</p></div>
   <div><p className="text-xs text-[#77796f]">Subscription status</p><p className="mt-1 font-bold">{entitlements.subscriptionStatus.replaceAll("_"," ")}</p></div>
   <div><p className="text-xs text-[#77796f]">Available features</p><p className="mt-1 font-bold">{entitlements.features.filter(f=>f.effectiveEnabled).length} / {entitlements.features.length}</p></div>
   {!entitlements.accessEligible&&<p className="text-sm font-semibold text-amber-700 sm:col-span-3">No active plan: restaurant features are unavailable until a Free or paid plan is assigned.</p>}
  </div>}
 </section>
 <section className="mt-4 rounded-2xl border border-[#e8e5dd] bg-white p-4 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="inline-flex items-center gap-2 text-lg font-extrabold"><ShieldCheck size={19}/> Feature access overview</h2><p className="mt-1 text-xs text-[#77796f]">Effective access reflects plan inclusion, restaurant overrides and dependencies.</p></div><Link href={"/admin/restaurants/features?tenantId="+encodeURIComponent(id)} className="text-sm font-bold text-[#b85d3e]">Manage features →</Link></div>
  {!entitlements?<p className="mt-4 text-sm text-[#77796f]">Loading effective features…</p>:<>
   <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={()=>setFeatureFilter("ALL")} className={`rounded-lg border px-3 py-2 text-xs font-bold ${featureFilter==="ALL"?"border-[#e56a42] bg-orange-50":""}`}>All ({entitlements.features.length})</button><button type="button" onClick={()=>setFeatureFilter("ENABLED")} className={`rounded-lg border px-3 py-2 text-xs font-bold ${featureFilter==="ENABLED"?"border-[#e56a42] bg-orange-50":""}`}>Enabled ({entitlements.features.filter(f=>f.effectiveEnabled).length})</button><button type="button" onClick={()=>setFeatureFilter("DISABLED")} className={`rounded-lg border px-3 py-2 text-xs font-bold ${featureFilter==="DISABLED"?"border-[#e56a42] bg-orange-50":""}`}>Unavailable ({entitlements.features.filter(f=>!f.effectiveEnabled).length})</button></div>
   <div className="mt-3 grid gap-2 sm:grid-cols-2">{entitlements.features.filter(f=>featureFilter==="ALL"||(featureFilter==="ENABLED"?f.effectiveEnabled:!f.effectiveEnabled)).map(f=><div key={f.key} className="flex items-start gap-2 rounded-xl border p-3 text-sm">{f.effectiveEnabled?<CheckCircle2 size={17} className="mt-0.5 shrink-0 text-green-700"/>:<XCircle size={17} className="mt-0.5 shrink-0 text-slate-400"/>}<div className="min-w-0"><p className="font-semibold">{f.name||f.key.replaceAll("_"," ")}</p><p className="mt-1 text-xs text-[#77796f]">{f.effectiveEnabled?"Available":(f.reason||"Unavailable").replaceAll("_"," ").toLowerCase()}</p></div></div>)}</div>
  </>}
 </section>
 <div className="mt-4 grid gap-3 sm:grid-cols-2"><Link href={"/admin/restaurants/service?tenantId="+encodeURIComponent(id)} className="flex items-center justify-between rounded-2xl border border-[#e8e5dd] bg-white p-5 text-sm font-bold text-[#b85d3e]"><span className="inline-flex items-center gap-2"><ChefHat size={18}/> Kitchen & waiter workflow</span><span>→</span></Link><Link href={"/admin/subscriptions?tenantId="+encodeURIComponent(id)} className="flex items-center justify-between rounded-2xl border border-[#e8e5dd] bg-white p-5 text-sm font-bold text-[#b85d3e]"><span className="inline-flex items-center gap-2"><CreditCard size={18}/> Subscription management</span><span>→</span></Link></div><p className="mt-4 text-xs leading-5 text-[#77796f]">Restaurant IDs are internal. You can navigate directly from the restaurant list without entering an ID.</p></>}
 </main>;
}
