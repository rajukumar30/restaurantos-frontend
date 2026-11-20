"use client";
import {useEffect,useState} from "react";
import {ShieldCheck,Users} from "lucide-react";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Member={id:string;name:string;email:string;phone:string|null;accountStatus:string;adminStatus:string;roles:string;addedAt:string};
export default function PlatformTeamPage(){
 const [members,setMembers]=useState<Member[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{const controller=new AbortController();const token=localStorage.getItem("restaurantos_access_token");
 fetch(API+"/api/v1/platform/team",{headers:{Authorization:"Bearer "+token},signal:controller.signal,cache:"no-store"})
 .then(async r=>{const p=await r.json();if(!r.ok||!p.success||!Array.isArray(p.data))throw Error(p.message||"Unable to load team");return p.data as Member[];})
 .then(data=>{if(!controller.signal.aborted)setMembers(data);})
 .catch(e=>{if(!controller.signal.aborted)setError(e.message);})
 .finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[]);
 return <main className="px-4 py-5 sm:px-8 sm:py-10"><p className="text-xs font-bold uppercase tracking-widest text-[#c15d3c]">Platform administration</p><h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Platform Team & Access</h1><p className="mt-2 text-sm text-[#77796f]">RestaurantOS administrators only. Restaurant owners and staff are managed separately.</p>
 <section className="mt-6 rounded-2xl border border-[#e8e5dd] bg-white p-4 sm:p-6"><div className="flex items-center gap-2"><Users size={20} className="text-[#c15d3c]"/><h2 className="font-bold">Administrator accounts</h2></div>
 {loading?<p role="status" className="mt-5 text-sm">Loading platform team…</p>:error?<p role="alert" className="mt-5 text-sm text-red-700">{error}</p>:members.length===0?<p className="mt-5 text-sm text-[#77796f]">No platform administrators found.</p>:<div className="mt-4 divide-y">{members.map(m=><article key={m.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0"><h3 className="font-bold">{m.name}</h3><p className="mt-1 break-all text-xs text-[#77796f]">{m.email}{m.phone?" · "+m.phone:""}</p><p className="mt-2 text-sm text-[#55594f]">{m.roles}</p></div><div className="flex gap-2 text-xs"><span className="rounded-full bg-[#edf5ed] px-2.5 py-1 font-bold text-[#42704d]">{m.adminStatus}</span><span className="rounded-full bg-[#f5f4ef] px-2.5 py-1 font-semibold text-[#77796f]">{m.accountStatus} account</span></div></article>)}</div>}</section>
 <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#77796f]"><ShieldCheck size={16} className="shrink-0"/> This first release is read-only. Administrator invitations, permission changes, and account suspension require audited access-management workflows.</p></main>;
}
