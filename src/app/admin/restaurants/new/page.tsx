"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Building2, CheckCircle2, LogOut, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function NewRestaurantPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [form, setForm] = useState({ restaurantName:"", branchName:"Main branch", ownerName:"", ownerEmail:"", ownerPassword:"", ownerPhone:"", branchPhone:"", addressLine1:"", addressLine2:"", landmark:"", city:"", state:"", postalCode:"", country:"India" });
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{tenantId:string;branchId:string;slug:string;subdomain:string;restaurantUrl:string}|null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem("restaurantos_access_token") ?? "";
    const user = localStorage.getItem("restaurantos_user");
    if (!accessToken || !user) { router.replace("/login"); return; }
    try {
      const parsed = JSON.parse(user);
      if (!parsed.authorities?.includes("PLATFORM_ADMIN")) { router.replace("/"); return; }
      setToken(accessToken);
      setAuthorized(true);
    } catch { router.replace("/login"); }
  }, [router]);

  function update(key: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreated(null);
    setLoading(true);
    try {
      const {addressLine1,addressLine2,landmark,city,state,postalCode,country,...details}=form;
      const addressJson=JSON.stringify({line1:addressLine1.trim(),line2:addressLine2.trim(),landmark:landmark.trim(),city:city.trim(),state:state.trim(),postalCode:postalCode.trim(),country:country.trim()});
      const response = await fetch(`${API}/api/v1/platform/restaurants`, {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body:JSON.stringify({...details,addressJson}),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message ?? "Could not create restaurant.");
      setCreated(payload.data);
      setForm({ restaurantName:"", branchName:"Main branch", ownerName:"", ownerEmail:"", ownerPassword:"", ownerPhone:"", branchPhone:"", addressLine1:"", addressLine2:"", landmark:"", city:"", state:"", postalCode:"", country:"India" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  }

  function logout() {
    localStorage.removeItem("restaurantos_access_token");
    localStorage.removeItem("restaurantos_user");
    router.push("/login");
  }

  if (!authorized) return <main className="min-h-screen grid place-items-center text-sm text-[#77796f]">Checking administrator access…</main>;

  return <main className="min-h-screen bg-[#f7f4ec]">
    <header className="flex items-center justify-between border-b border-[#e9e5dc] bg-[#fffefa] px-5 py-4 sm:px-9">
      <div className="flex items-center gap-3"><div className="brand-mark">r.</div><div><div className="font-bold tracking-tight">restaurant<span className="text-[#E56A42]">os</span></div><div className="text-[9px] uppercase tracking-[.16em] text-[#99998f]">Platform administration</div></div></div>
      <button onClick={logout} className="ghost-button flex items-center gap-2"><LogOut size={14}/> Sign out</button>
    </header>
    <div className="mx-auto max-w-4xl px-5 py-9 sm:px-8 sm:py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-xs text-[#77796f] mb-8"><ArrowLeft size={14}/> Dashboard overview</Link>
      <div className="mb-8"><div className="eyebrow">Platform / Restaurants</div><h1 className="text-3xl sm:text-4xl font-bold tracking-[-.055em] mt-2">Onboard a restaurant<span className="text-[#E56A42]">.</span></h1><p className="text-sm text-[#77796f] mt-3">Create a restaurant workspace, its first branch and the owner account in one step.</p></div>
      {created && <div role="status" className="mb-6 rounded-2xl border border-[#cfe0ce] bg-[#edf5eb] p-4 text-sm text-[#315d39]"><div className="flex items-center gap-2 font-bold"><CheckCircle2 size={17}/> Restaurant workspace created</div><p className="mt-2 text-xs">Workspace slug: <strong>{created.slug}</strong></p><p className="text-xs mt-1">The owner can sign in at <strong>/login</strong> on the current RestaurantOS Vercel domain using the email and password you set.</p><p className="text-xs mt-1">Restaurant-specific subdomains will be activated later, after a custom domain is configured.</p></div>}
      {error && <div role="alert" className="mb-6 rounded-xl bg-[#fbede7] px-4 py-3 text-xs text-[#a7442a]">{error}</div>}
      <form onSubmit={submit} className="space-y-6">
        <section className="panel p-5 sm:p-7"><div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-xl bg-[#f5eee5] text-[#d56a45] grid place-items-center"><Store size={18}/></div><div><h2 className="font-bold">Restaurant details</h2><p className="text-xs text-[#99998f] mt-1">The tenant workspace shared by all branches.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Restaurant name" value={form.restaurantName} onChange={v=>update("restaurantName",v)} placeholder="e.g. The Green Table" required/>
            <Field label="First branch name" value={form.branchName} onChange={v=>update("branchName",v)} placeholder="e.g. Sector 62" required/>
            <Field label="Branch phone" value={form.branchPhone} onChange={v=>update("branchPhone",v)} placeholder="+91…"/>

          </div>
          <div className="mt-7 border-t border-[#eeeae2] pt-6">
            <h3 className="font-semibold text-sm mb-1">Branch address</h3>
            <p className="text-xs text-[#99998f] mb-5">Enter the address normally. RestaurantOS will format it automatically.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Street address / Building" value={form.addressLine1} onChange={v=>update("addressLine1",v)} placeholder="Building number, street or road" required/></div>
              <Field label="Area / Locality" value={form.addressLine2} onChange={v=>update("addressLine2",v)} placeholder="Sector, neighborhood or locality"/>
              <Field label="Landmark" value={form.landmark} onChange={v=>update("landmark",v)} placeholder="Near a known landmark"/>
              <Field label="City" value={form.city} onChange={v=>update("city",v)} placeholder="e.g. Bengaluru" required/>
              <Field label="State / Province" value={form.state} onChange={v=>update("state",v)} placeholder="e.g. Karnataka" required/>
              <Field label="PIN / Postal code" value={form.postalCode} onChange={v=>update("postalCode",v)} placeholder="e.g. 560001" required/>
              <Field label="Country" value={form.country} onChange={v=>update("country",v)} placeholder="e.g. India" required/>
            </div>
          </div>
        </section>
        <section className="panel p-5 sm:p-7"><div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-xl bg-[#eaf0e9] text-[#527a5b] grid place-items-center"><UserRound size={18}/></div><div><h2 className="font-bold">Restaurant owner</h2><p className="text-xs text-[#99998f] mt-1">This person receives owner access to the first branch.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner full name" value={form.ownerName} onChange={v=>update("ownerName",v)} placeholder="Full name" required/>
            <Field label="Owner email" type="email" value={form.ownerEmail} onChange={v=>update("ownerEmail",v)} placeholder="owner@restaurant.com" required/>
            <Field label="Temporary password" type="password" value={form.ownerPassword} onChange={v=>update("ownerPassword",v)} placeholder="At least 12 characters" required minLength={12}/>
            <Field label="Owner phone" value={form.ownerPhone} onChange={v=>update("ownerPhone",v)} placeholder="+91…"/>
          </div>
        </section>
        <div className="flex justify-end"><button disabled={loading} className="primary-button !px-6 !py-3 disabled:opacity-60">{loading ? "Creating workspace…" : "Create restaurant workspace"}</button></div>
      </form>
      <p className="text-[11px] text-[#99998f] mt-7 flex items-center gap-2"><Building2 size={13}/> Restaurant data is stored in a separate tenant and branch scope.</p>
    </div>
  </main>;
}

function Field({label,value,onChange,placeholder,type="text",required=false,minLength}: {label:string;value:string;onChange:(value:string)=>void;placeholder:string;type?:string;required?:boolean;minLength?:number}) {
  return <label className="block"><span className="text-xs font-semibold text-[#55584f]">{label}{required ? " *" : ""}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} minLength={minLength} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#d68b6d]"/></label>;
}
