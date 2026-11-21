"use client";
import {useState} from "react";
type Branch={id:string;name:string;branchCode:string;phone:string|null;status:string;timezone:string;address:string};
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
export default function BranchEditor({tenantId,branch,onSaved}:{tenantId:string;branch:Branch;onSaved:(b:Branch)=>void}){
 const [editing,setEditing]=useState(false);const [name,setName]=useState(branch.name);const [phone,setPhone]=useState(branch.phone??"");const [status,setStatus]=useState(branch.status);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 let address:Record<string,string>={};try{address=JSON.parse(branch.address||"{}");}catch{}
 async function save(){
  if(!name.trim()){setError("Branch name is required");return;}
  if(status!==branch.status&&!window.confirm(status==="INACTIVE"?"Deactivate this branch? This may affect its operations.":"Reactivate this branch?"))return;
  setBusy(true);setError("");
  try{
   const token=localStorage.getItem("restaurantos_access_token");
   const response=await fetch(API+"/api/v1/platform/restaurants/"+encodeURIComponent(tenantId)+"/branches/"+encodeURIComponent(branch.id),{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({name:name.trim(),phone:phone.trim(),status})});
   const payload=await response.json();if(!response.ok||!payload.success)throw Error(payload.message||"Update failed");
   onSaved(payload.data);setEditing(false);
  }catch(e){setError(e instanceof Error?e.message:"Update failed");}finally{setBusy(false);}
 }
 return <div className="mt-4 space-y-3 border-t pt-4 text-sm">
  <div className="flex items-center justify-between gap-2"><strong>{branch.name}</strong><button type="button" onClick={()=>{setEditing(!editing);setName(branch.name);setPhone(branch.phone??"");setStatus(branch.status);setError("");}} className="font-bold text-[#b85d3e]">{editing?"Cancel":"Edit branch"}</button></div>
  {editing?<div className="space-y-3"><label className="block text-xs font-semibold">Branch name<input maxLength={150} value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="block text-xs font-semibold">Contact number<input maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} className="mt-1 w-full rounded-lg border p-2 text-sm"/></label><label className="block text-xs font-semibold">Status<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>{error&&<p role="alert" className="text-xs text-red-700">{error}</p>}<button type="button" disabled={busy} onClick={()=>void save()} className="rounded-lg bg-[#e56a42] px-4 py-2 font-bold text-white disabled:opacity-50">{busy?"Saving…":"Save branch"}</button></div>:<><p><span className="text-[#77796f]">Status:</span> {branch.status}</p><p><span className="text-[#77796f]">Code:</span> {branch.branchCode}</p><p><span className="text-[#77796f]">Phone:</span> {branch.phone||"Not provided"}</p></>}
  <p><span className="text-[#77796f]">Address:</span> {[address.line1,address.line2,address.landmark,address.city,address.state,address.postalCode,address.country].filter(Boolean).join(", ")||"Not provided"}</p>
  <p><span className="text-[#77796f]">Timezone:</span> {branch.timezone}</p>
 </div>;
}
