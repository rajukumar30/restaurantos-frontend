"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, LogOut, Pencil, Plus, Search, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
type Membership = { tenantId: string; tenantName: string; roles: string };
type Branch = { id: string; name: string; branchCode: string; address: string; phone?: string };
type Staff = { userId: string; name: string; email: string; phone?: string; accountStatus: string; roles?: string; branches?: string };

export default function StaffPage() {
 const ownerRoute=usePathname().startsWith("/owner");
  const router = useRouter();
  const [token,setToken] = useState("");
  const [memberships,setMemberships] = useState<Membership[]>([]);
  const [tenantId,setTenantId] = useState("");
  const [branches,setBranches] = useState<Branch[]>([]);
  const [branchId,setBranchId] = useState("");
  const [staff,setStaff] = useState<Staff[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [search,setSearch] = useState("");
  const [showForm,setShowForm] = useState(false);
  const [saving,setSaving] = useState(false);
  const [editing,setEditing] = useState<Staff|null>(null);
  const [editForm,setEditForm] = useState({name:"",phone:"",roleKey:"WAITER",accountStatus:"ACTIVE"});
  const [form,setForm] = useState({name:"",email:"",phone:"",temporaryPassword:"",roleKey:"WAITER"});

  useEffect(() => {
    const accessToken = localStorage.getItem("restaurantos_access_token") ?? "";
    const rawUser = localStorage.getItem("restaurantos_user");
    if(!accessToken || !rawUser){router.replace("/login");return;}
    try {
      const user = JSON.parse(rawUser);
      const available:Membership[] = user.memberships ?? [];
      if(!available.length){router.replace("/login");return;}
      setToken(accessToken);setMemberships(available);setTenantId(available[0].tenantId);
    } catch {router.replace("/login");}
  },[router]);

  useEffect(() => {
    if(!token || !tenantId)return;
    let cancelled=false;
    async function loadBranches(){
      setLoading(true);setError("");setStaff([]);setBranches([]);setBranchId("");
      try{
        const response=await fetch(`${API}/api/v1/tenants/${tenantId}/branches`,{headers:{Authorization:`Bearer ${token}`}});
        const payload=await response.json();
        if(!response.ok || !payload.success)throw new Error(payload.message??"Unable to load branches.");
        if(!cancelled){
          const available:Branch[]=payload.data??[];
          setBranches(available);
          setBranchId(available[0]?.id??"");
        }
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to load your workspace.");}
      finally{if(!cancelled)setLoading(false);}
    }
    loadBranches();return()=>{cancelled=true;};
  },[token,tenantId]);

  useEffect(() => {
    if(!token || !tenantId || !branchId)return;
    let cancelled=false;
    async function loadStaff(){
      setLoading(true);setError("");
      try{
        const response=await fetch(`${API}/api/v1/tenants/${tenantId}/staff?branchId=${encodeURIComponent(branchId)}`,{
          headers:{Authorization:`Bearer ${token}`}
        });
        const payload=await response.json();
        if(!response.ok || !payload.success)throw new Error(payload.message??"Unable to load staff.");
        if(!cancelled)setStaff(payload.data??[]);
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to load staff.");}
      finally{if(!cancelled)setLoading(false);}
    }
    loadStaff();return()=>{cancelled=true;};
  },[token,tenantId,branchId]);

  const filtered=useMemo(()=>staff.filter(person=>[person.name,person.email,person.roles,person.branches].some(v=>v?.toLowerCase().includes(search.toLowerCase()))),[staff,search]);

  async function invite(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!branchId){setError("No branch is available for this account.");return;}
    setSaving(true);setError("");
    try{
      const response=await fetch(`${API}/api/v1/tenants/${tenantId}/staff`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({...form,branchId})});
      const payload=await response.json();
      if(!response.ok||!payload.success)throw new Error(payload.message??"Could not create staff account.");
      setShowForm(false);setForm({name:"",email:"",phone:"",temporaryPassword:"",roleKey:"WAITER"});
      const refreshed=await fetch(`${API}/api/v1/tenants/${tenantId}/staff?branchId=${branchId}`,{headers:{Authorization:`Bearer ${token}`}});
      const data=await refreshed.json();if(refreshed.ok&&data.success)setStaff(data.data);
    }catch(e){setError(e instanceof Error?e.message:"Unable to create staff account.");}
    finally{setSaving(false);}
  }

  async function saveEmployee(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!editing)return;
    setSaving(true);setError("");
    try{
      const response=await fetch(`${API}/api/v1/tenants/${tenantId}/staff/${encodeURIComponent(editing.userId)}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({...editForm,branchId})});
      const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Employee update is not supported by the server yet.");
      const refreshed=await fetch(`${API}/api/v1/tenants/${tenantId}/staff?branchId=${encodeURIComponent(branchId)}`,{headers:{Authorization:`Bearer ${token}`}});
      const data=await refreshed.json();if(refreshed.ok&&data.success)setStaff(data.data);
      setEditing(null);
    }catch(e){setError(e instanceof Error?e.message:"Unable to update employee.");}finally{setSaving(false);}
  }
  function logout(){localStorage.removeItem("restaurantos_access_token");localStorage.removeItem("restaurantos_user");router.push("/login");}
  const current=memberships.find(m=>m.tenantId===tenantId);
  return <main className="min-h-screen bg-[#f7f4ec]">
    <header className="flex items-center justify-between border-b border-[#e9e5dc] bg-[#fffefa] px-5 py-4 sm:px-9"><div className="flex items-center gap-3"><div className="brand-mark">r.</div><div><div className="font-bold tracking-tight">restaurant<span className="text-[#E56A42]">os</span></div><div className="text-[9px] uppercase tracking-[.16em] text-[#99998f]">Restaurant workspace</div></div></div><div className="flex items-center gap-2"><Link href={ownerRoute?"/owner/":"/"} className="ghost-button hidden sm:inline-flex items-center gap-2"><ArrowLeft size={14}/> Dashboard</Link><button onClick={logout} className="ghost-button flex items-center gap-2"><LogOut size={14}/> Sign out</button></div></header>
    <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-8"><div><div className="eyebrow">Workspace / People</div><h1 className="text-3xl sm:text-4xl font-bold tracking-[-.055em] mt-2">Your team<span className="text-[#E56A42]">.</span></h1><p className="text-sm text-[#77796f] mt-3">Manage restaurant staff and their access to daily operations.</p></div><button onClick={()=>setShowForm(v=>!v)} className="primary-button inline-flex items-center justify-center gap-2"><Plus size={15}/>{showForm?"Close form":"Add team member"}</button></div>
      <section className="grid gap-3 sm:grid-cols-3 mb-6"><div className="panel p-5"><div className="flex items-center justify-between text-xs text-[#77796f]"><span>Team members</span><Users size={17}/></div><div className="text-3xl font-bold mt-3">{staff.length}</div></div><div className="panel p-5"><div className="flex items-center justify-between text-xs text-[#77796f]"><span>Active branches</span><Building2 size={17}/></div><div className="text-3xl font-bold mt-3">{branches.length}</div></div><div className="panel p-5"><div className="flex items-center justify-between text-xs text-[#77796f]"><span>Your access</span><ShieldCheck size={17}/></div><div className="text-lg font-bold mt-4">{current?.roles||"Team member"}</div></div></section>
      <div className="mb-5 grid max-w-2xl gap-4 sm:grid-cols-2">
        {memberships.length>1&&<label className="block"><span className="text-xs font-semibold">Restaurant workspace</span><select value={tenantId} onChange={e=>setTenantId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm">{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select></label>}
        <label className="block"><span className="text-xs font-semibold">Selected branch</span><select value={branchId} onChange={e=>setBranchId(e.target.value)} disabled={!branches.length} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm disabled:opacity-60">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </div>
      {editing&&<form onSubmit={saveEmployee} className="panel mb-6 p-5 sm:p-7"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Edit employee</h2><p className="mt-1 text-xs text-[#77796f]">{editing.email}</p></div><button type="button" onClick={()=>setEditing(null)} className="ghost-button">Cancel</button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Full name" value={editForm.name} onChange={v=>setEditForm(p=>({...p,name:v}))} placeholder="Full name" required/><Field label="Phone" value={editForm.phone} onChange={v=>setEditForm(p=>({...p,phone:v}))} placeholder="Phone number"/><label className="block"><span className="text-xs font-semibold">Employee role</span><select value={editForm.roleKey} onChange={e=>setEditForm(p=>({...p,roleKey:e.target.value}))} className="mt-2 w-full rounded-xl border p-3 text-sm"><option value="MANAGER">Manager</option><option value="KITCHEN">Kitchen</option><option value="CASHIER">Cashier</option><option value="WAITER">Waiter</option><option value="STAFF">Staff</option></select></label><label className="block"><span className="text-xs font-semibold">Account status</span><select value={editForm.accountStatus} onChange={e=>setEditForm(p=>({...p,accountStatus:e.target.value}))} className="mt-2 w-full rounded-xl border p-3 text-sm"><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></label></div><p className="mt-3 text-xs text-[#77796f]">Changes require owner authorization and server-side tenant validation.</p><button disabled={saving} className="primary-button mt-5 disabled:opacity-50">{saving?"Saving…":"Save employee changes"}</button></form>}
      {showForm&&<form onSubmit={invite} className="panel p-5 sm:p-7 mb-6"><div className="mb-5"><h2 className="font-bold">Create staff account</h2><p className="text-xs text-[#99998f] mt-1">Give a team member branch access and a role.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Full name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="Full name" required/>
        <Field label="Email address" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} placeholder="staff@example.com" type="email" required/>
        <Field label="Temporary password (12+ chars)" value={form.temporaryPassword} onChange={v=>setForm(p=>({...p,temporaryPassword:v}))} placeholder="Set a temporary password" type="password" required minLength={12}/>
        <Field label="Phone (optional)" value={form.phone} onChange={v=>setForm(p=>({...p,phone:v}))} placeholder="+91…"/>
        <label className="block"><span className="text-xs font-semibold text-[#55584f]">Branch</span><select value={branchId} required onChange={e=>setBranchId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="block"><span className="text-xs font-semibold text-[#55584f]">Role</span><select value={form.roleKey} onChange={e=>setForm(p=>({...p,roleKey:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm"><option value="MANAGER">Branch manager</option><option value="KITCHEN">Kitchen staff</option><option value="CASHIER">Cashier</option><option value="WAITER">Waiter</option><option value="STAFF">General staff</option></select></label>
      </div><div className="mt-5 flex justify-end"><button disabled={saving||!branches.length} className="primary-button disabled:opacity-60">{saving?"Creating account…":"Create staff account"}</button></div></form>}
      {error&&<div role="alert" className="mb-5 rounded-xl bg-[#fbede7] px-4 py-3 text-xs text-[#a7442a]">{error}</div>}
      <section className="panel p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5"><div><h2 className="font-bold">Team directory</h2><p className="text-xs text-[#99998f] mt-1">People with access to this restaurant.</p></div><div className="flex items-center gap-2 rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-3"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search team" className="w-full sm:w-48 bg-transparent py-2.5 text-xs outline-none"/></div></div>
        {loading?<p className="py-10 text-center text-sm text-[#99998f]">Loading your team…</p>:filtered.length===0?<div className="py-12 text-center"><div className="mx-auto h-12 w-12 rounded-2xl bg-[#f5eee5] text-[#d56a45] grid place-items-center"><Users size={20}/></div><h3 className="font-bold mt-4">No team members found</h3><p className="text-xs text-[#99998f] mt-2">Add your first staff member to start assigning roles.</p></div>:<div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-[#eeeae2] text-[10px] uppercase tracking-wider text-[#99998f]"><th className="pb-3 font-semibold">Team member</th><th className="pb-3 font-semibold">Role</th><th className="pb-3 font-semibold">Branch</th><th className="pb-3 font-semibold">Status</th><th className="pb-3 font-semibold">Actions</th></tr></thead><tbody>{filtered.map(p=><tr key={p.userId} className="border-b border-[#f0ede6] last:border-0"><td className="py-4"><div className="font-bold">{p.name}</div><div className="text-[10px] text-[#99998f] mt-1">{p.email}</div></td><td className="py-4">{p.roles||"—"}</td><td className="py-4">{p.branches||"—"}</td><td className="py-4"><span className="rounded-full bg-[#eaf2e9] px-2.5 py-1 text-[10px] font-bold text-[#527a5b]">{p.accountStatus}</span></td><td className="py-4"><button type="button" className="ghost-button inline-flex items-center gap-1" onClick={()=>{setEditing(p);setEditForm({name:p.name,phone:p.phone??"",roleKey:(p.roles??"WAITER").toUpperCase().split(",")[0].trim().replace("ROLE_",""),accountStatus:p.accountStatus??"ACTIVE"});setShowForm(false);}}><Pencil size={13}/>Edit</button></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </main>;
}

function Field({label,value,onChange,placeholder,type="text",required=false,minLength}: {label:string;value:string;onChange:(v:string)=>void;placeholder:string;type?:string;required?:boolean;minLength?:number}) {
 return <label className="block"><span className="text-xs font-semibold text-[#55584f]">{label}{required?" *":""}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} minLength={minLength} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#d68b6d]"/></label>;
}