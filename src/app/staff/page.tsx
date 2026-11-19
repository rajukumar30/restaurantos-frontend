"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, LogOut, Plus, Search, ShieldCheck, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type Membership = { tenantId: string; tenantName: string; roles: string };
type Branch = { id: string; name: string; branchCode: string; address: string; phone?: string };
type Staff = { userId: string; name: string; email: string; phone?: string; accountStatus: string; roles?: string; branches?: string };

export default function StaffPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", phone:"", temporaryPassword:"", roleKey:"WAITER" });

  useEffect(() => {
    const accessToken = localStorage.getItem("restaurantos_access_token") ?? "";
    const rawUser = localStorage.getItem("restaurantos_user");
    if (!accessToken || !rawUser) { router.replace("/login"); return; }
    try {
      const user = JSON.parse(rawUser);
      const tenantMemberships: Membership[] = user.memberships ?? [];
      if (!tenantMemberships.length) { router.replace("/login"); return; }
      setToken(accessToken);
      setMemberships(tenantMemberships);
      setTenantId(tenantMemberships[0].tenantId);
    } catch { router.replace("/login"); }
  }, [router]);

  useEffect(() => {
    if (!token || !tenantId) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const branchResponse = await fetch(`${API}/api/v1/tenants/${tenantId}/branches`, { headers });
        const branchPayload = await branchResponse.json();
        if (!branchResponse.ok || !branchPayload.success) throw new Error(branchPayload.message ?? "Unable to load branches.");
        const firstBranchId = branchPayload.data[0]?.id ?? "";
        const staffUrl = firstBranchId ? `${API}/api/v1/tenants/${tenantId}/staff?branchId=${firstBranchId}` : `${API}/api/v1/tenants/${tenantId}/staff`;
        const staffResponse = await fetch(staffUrl, { headers });
        const staffPayload = await staffResponse.json();
        if (!staffResponse.ok || !staffPayload.success) throw new Error(staffPayload.message ?? "Unable to load staff.");
        if (!cancelled) {
          setBranches(branchPayload.data);
          setStaff(staffPayload.data);
          setBranchId(current => current && branchPayload.data.some((b: Branch) => b.id === current) ? current : firstBranchId);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load workspace.");
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [token, tenantId]);

  const filtered = useMemo(() => staff.filter(person =>
    [person.name, person.email, person.roles, person.branches].some(value => value?.toLowerCase().includes(search.toLowerCase()))
  ), [staff, search]);

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId) { setError("No active branch is available for this account."); return; }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/v1/tenants/${tenantId}/staff`, {
        method:"POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body:JSON.stringify({ ...form, branchId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message ?? "Could not create staff account.");
      setForm({ name:"", email:"", phone:"", temporaryPassword:"", roleKey:"WAITER" });
      setShowForm(false);
      const refreshed = await fetch(`${API}/api/v1/tenants/${tenantId}/staff?branchId=${branchId}`, { headers:{ Authorization:`Bearer ${token}` } });
      const refreshedPayload = await refreshed.json();
      if (refreshed.ok && refreshedPayload.success) setStaff(refreshedPayload.data);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create staff account."); }
    finally { setSaving(false); }
  }

  function logout() {
    localStorage.removeItem("restaurantos_access_token");
    localStorage.removeItem("restaurantos_user");
    router.push("/login");
  }

  const currentMembership = memberships.find(m => m.tenantId === tenantId);

  return <main className="min-h-screen bg-[#f7f4ec]">
    <header className="flex items-center justify-between border-b border-[#e9e5dc] bg-[#fffefa] px-5 py-4 sm:px-9">
      <div className="flex items-center gap-3"><div className="brand-mark">r.</div><div><div className="font-bold tracking-tight">restaurant<span className="text-[#E56A42]">os</span></div><div className="text-[9px] uppercase tracking-[.16em] text-[#99998f]">Restaurant workspace</div></div></div>
      <div className="flex items-center gap-2"><Link href="/" className="ghost-button hidden sm:inline-flex items-center gap-2"><ArrowLeft size={14}/> Dashboard</Link><button onClick={logout} className="ghost-button flex items-center gap-2"><LogOut size={14}/> Sign out</button></div>
    </header>
    <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div><div className="eyebrow">Workspace / People</div><h1 className="text-3xl sm:text-4xl font-bold tracking-[-.055em] mt-2">Your team<span className="text-[#E56A42]">.</span></h1><p className="text-sm text-[#77796f] mt-3">Manage restaurant staff and their access to daily operations.</p></div>
        <button onClick={()=>setShowForm(value=>!value)} className="primary-button inline-flex items-center justify-center gap-2"><Plus size={15}/>{showForm ? "Close form" : "Add team member"}</button>
      </div>

      <section className="grid gap-3 sm:grid-cols-3 mb-6">
        <div className="panel p-5"><div className="flex items-center justify-between text-xs text-[#77796f]"><span>Team members</span><Users size={17} className="text-[#d56a45]"/></div><div className="text-3xl font-bold tracking-tight mt-3">{staff.length}</div><div className="text-[11px] text-[#99998f] mt-1">In this restaurant</div></div>
        <div className="panel p-5"><div className="flex items-center justify-between text-xs text-[#77796f]"><span>Active branches</span><Building2 size={17} className="text-[#527a5b]"/></div><div className="text-3xl font-bold tracking-tight mt-3">{branches.length}</div><div className="text-[11px] text-[#99998f] mt-1">Available to your account</div></div>
        <div className="panel p-5"><div className="flex items-center justify-between text-xs text-[#77796f]"><span>Your access</span><ShieldCheck size={17} className="text-[#c08a34]"/></div><div className="text-lg font-bold mt-4">{currentMembership?.roles || "Team member"}</div><div className="text-[11px] text-[#99998f] mt-1">Role in this workspace</div></div>
      </section>

      {memberships.length > 1 && <div className="mb-5 max-w-sm"><label className="text-xs font-semibold text-[#55584f]">Restaurant workspace</label><select value={tenantId} onChange={e=>setTenantId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm">{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select></div>}

      {showForm && <form onSubmit={invite} className="panel p-5 sm:p-7 mb-6">
        <div className="mb-5"><h2 className="font-bold">Create staff account</h2><p className="text-xs text-[#99998f] mt-1">Assign one role and one branch. The staff member can sign in with these credentials.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="Staff member name" required/>
          <Field label="Email address" type="email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} placeholder="staff@example.com" required/>
          <Field label="Temporary password" type="password" value={form.temporaryPassword} onChange={v=>setForm(p=>({...p,temporaryPassword:v}))} placeholder="At least 12 characters" required minLength={12}/>
          <Field label="Phone (optional)" value={form.phone} onChange={v=>setForm(p=>({...p,phone:v}))} placeholder="+91…"/>
          <label className="block"><span className="text-xs font-semibold text-[#55584f]">Branch</span><select required value={branchId} onChange={e=>setBranchId(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label className="block"><span className="text-xs font-semibold text-[#55584f]">Role</span><select value={form.roleKey} onChange={e=>setForm(p=>({...p,roleKey:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm"><option value="MANAGER">Branch manager</option><option value="KITCHEN">Kitchen staff</option><option value="CASHIER">Cashier</option><option value="WAITER">Waiter</option><option value="STAFF">General staff</option></select></label>
        </div>
        <div className="mt-5 flex justify-end"><button disabled={saving || !branches.length} className="primary-button disabled:opacity-60">{saving ? "Creating account…" : "Create staff account"}</button></div>
      </form>}

      {error && <div role="alert" className="mb-5 rounded-xl bg-[#fbede7] px-4 py-3 text-xs text-[#a7442a]">{error}</div>}
      <section className="panel p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5"><div><h2 className="font-bold">Team directory</h2><p className="text-xs text-[#99998f] mt-1">People with access to this restaurant.</p></div><div className="flex items-center gap-2 rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-3"><Search size={15} className="text-[#99998f]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search team" className="w-full sm:w-48 bg-transparent py-2.5 text-xs outline-none"/></div></div>
        {loading ? <p className="py-10 text-center text-sm text-[#99998f]">Loading your team…</p> : filtered.length === 0 ? <div className="py-12 text-center"><div className="mx-auto h-12 w-12 rounded-2xl bg-[#f5eee5] text-[#d56a45] grid place-items-center"><Users size={20}/></div><h3 className="font-bold mt-4">No team members found</h3><p className="text-xs text-[#99998f] mt-2">Add your first staff member to start assigning roles.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead><tr className="border-b border-[#eeeae2] text-[10px] uppercase tracking-wider text-[#99998f]"><th className="pb-3 font-semibold">Team member</th><th className="pb-3 font-semibold">Role</th><th className="pb-3 font-semibold">Branch</th><th className="pb-3 font-semibold">Status</th></tr></thead><tbody>{filtered.map(person=><tr key={person.userId} className="border-b border-[#f0ede6] last:border-0"><td className="py-4"><div className="font-bold">{person.name}</div><div className="text-[10px] text-[#99998f] mt-1">{person.email}</div></td><td className="py-4">{person.roles || "—"}</td><td className="py-4">{person.branches || "—"}</td><td className="py-4"><span className="rounded-full bg-[#eaf2e9] px-2.5 py-1 text-[10px] font-bold text-[#527a5b]">{person.accountStatus}</span></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  </main>;
}

function Field({label,value,onChange,placeholder,type="text",required=false,minLength}: {label:string;value:string;onChange:(value:string)=>void;placeholder:string;type?:string;required?:boolean;minLength?:number}) {
  return <label className="block"><span className="text-xs font-semibold text-[#55584f]">{label}{required ? " *" : ""}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} minLength={minLength} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#d68b6d]"/></label>;
}
