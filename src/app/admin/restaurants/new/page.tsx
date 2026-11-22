"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Building2, CheckCircle2, Store, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://restaurantos-backend-kz2r.onrender.com";

export default function NewRestaurantPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [form, setForm] = useState({ restaurantName:"", branchName:"Main branch", ownerName:"", ownerEmail:"", ownerPassword:"", ownerPhone:"", branchPhone:"", addressLine1:"", addressLine2:"", landmark:"", city:"", state:"", postalCode:"", country:"India" });
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{tenantId:string;branchId:string;slug:string;subdomain:string;restaurantUrl:string}|null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const submittingRef = useRef(false);
  const [pinLookup, setPinLookup] = useState<"idle"|"loading"|"found"|"not-found">("idle");
  const suggestedSlug = form.restaurantName.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const reservedSubdomains = ["www","admin","api","app","support","login","mail","status","docs"];
  const subdomainPreview = reservedSubdomains.includes(suggestedSlug) ? "restaurant-"+suggestedSlug : suggestedSlug;
  useEffect(() => {
    const pin = form.postalCode.trim();
    if (form.country.trim().toLowerCase() !== "india" || !/^[1-9][0-9]{5}$/.test(pin)) {
      setPinLookup("idle");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPinLookup("loading");
      try {
        const response = await fetch("https://api.postalpincode.in/pincode/"+encodeURIComponent(pin),{signal:controller.signal});
        if (!response.ok) throw new Error("Postal lookup unavailable");
        const records: {Status?:string;PostOffice?:Array<{District?:string;State?:string}>}[] = await response.json();
        const location = records[0]?.PostOffice?.[0];
        if (records[0]?.Status !== "Success" || !location?.District || !location?.State) throw new Error("PIN code not found");
        if (!controller.signal.aborted) {
          setForm(current => current.postalCode.trim()===pin
            ? {...current,city:location.District!,state:location.State!} : current);
          setPinLookup("found");
        }
      } catch {
        if (!controller.signal.aborted) setPinLookup("not-found");
      }
    },350);
    return () => {clearTimeout(timer);controller.abort();};
  },[form.postalCode,form.country]);

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
    // Synchronous guard: a rapid double-click must not create two restaurant workspaces.
    if (submittingRef.current || created) return;
    if (form.ownerPassword !== confirmPassword) { setError("Owner passwords do not match."); return; }
    if (form.restaurantName.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").length > 63) {
      setError("Use a shorter restaurant name for its URL (maximum 63 characters)."); return;
    }
    if (form.country.trim().toLowerCase() === "india" && !/^[1-9][0-9]{5}$/.test(form.postalCode.trim())) {
      setError("Enter a valid six-digit Indian PIN code."); return;
    }
    submittingRef.current = true;
    setError("");
    setCreated(null);
    setLoading(true);
    try {
      const {addressLine1,addressLine2,landmark,city,state,postalCode,country,...details}=form;
      const addressJson=JSON.stringify({line1:addressLine1.trim(),line2:addressLine2.trim(),landmark:landmark.trim(),city:city.trim(),state:state.trim(),postalCode:postalCode.trim(),country:country.trim()});
      const response = await fetch(`${API}/api/v1/platform/restaurants`, {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
        body:JSON.stringify({...details,restaurantName:details.restaurantName.trim(),branchName:details.branchName.trim(),ownerName:details.ownerName.trim(),ownerEmail:details.ownerEmail.trim().toLowerCase(),ownerPhone:details.ownerPhone.trim()||null,branchPhone:details.branchPhone.trim()||null,addressJson}),
      });
      const raw = await response.text();
      let payload: {success?:boolean;message?:string;data?:{tenantId:string;branchId:string;slug:string;subdomain:string;restaurantUrl:string}} | null = null;
      if (raw.trim()) {
        try { payload = JSON.parse(raw); } catch { /* Some upstream errors return HTML instead of JSON. */ }
      }
      if (!response.ok) {
        const reason = payload?.message ?? (response.status === 401 ? "Your session expired. Please sign in again." : response.status === 403 ? "Your account does not have platform administrator access." : response.status === 409 ? "This restaurant or owner email already exists." : response.status >= 500 ? "The server could not complete onboarding. Please check Render logs before retrying; the request may have reached the server." : "The server rejected the onboarding request.");
        throw new Error(`${reason} (HTTP ${response.status})`);
      }
      if (!payload?.success || !payload.data) throw new Error("The server returned an empty or unexpected response. Check Render logs and confirm whether the restaurant was created before retrying.");

      setCreated(payload.data);
      setConfirmPassword("");
      setForm({ restaurantName:"", branchName:"Main branch", ownerName:"", ownerEmail:"", ownerPassword:"", ownerPhone:"", branchPhone:"", addressLine1:"", addressLine2:"", landmark:"", city:"", state:"", postalCode:"", country:"India" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { submittingRef.current = false; setLoading(false); }
  }

  if (!authorized) return <main className="min-h-screen grid place-items-center text-sm text-[#77796f]">Checking administrator access…</main>;

  return <main className="min-h-screen bg-[#f7f4ec]">
    <div className="mx-auto max-w-4xl px-5 py-9 sm:px-8 sm:py-12">

      <div className="mb-8"><div className="eyebrow">Platform / Restaurants</div><h1 className="text-3xl sm:text-4xl font-bold tracking-[-.055em] mt-2">Onboard a restaurant<span className="text-[#E56A42]">.</span></h1><p className="text-sm text-[#77796f] mt-3">Create the workspace and owner login now. Configure features and billing after creation—PAN and GSTIN are not required to start.</p></div>
      {created && <div role="status" className="mb-6 rounded-2xl border border-[#cfe0ce] bg-[#edf5eb] p-4 text-sm text-[#315d39]"><div className="flex items-center gap-2 font-bold"><CheckCircle2 size={17}/> Restaurant workspace created</div><Link className="mt-3 inline-block rounded-lg bg-[#315d39] px-3 py-2 text-xs font-semibold text-white" href={"/admin/restaurants/service?tenantId="+created.tenantId}>Configure service workflow</Link><p className="mt-2 text-xs">Workspace slug: <strong>{created.slug}</strong><span className="block mt-1">Reserved subdomain: <strong>{created.subdomain}</strong></span></p><p className="text-xs mt-1">The owner can sign in at <strong>/login</strong> on the current RestaurantOS Vercel domain using the email and password you set.</p><p className="text-xs mt-1">The subdomain is reserved but is not a working URL until a custom domain and wildcard routing are configured. For now, use the current Vercel domain.</p></div>}
      {error && <div role="alert" className="mb-6 rounded-xl bg-[#fbede7] px-4 py-3 text-xs text-[#a7442a]">{error}</div>}
      <form onSubmit={submit} className="space-y-6">
        <section className="panel p-5 sm:p-7"><div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-xl bg-[#f5eee5] text-[#d56a45] grid place-items-center"><Store size={18}/></div><div><h2 className="font-bold">Restaurant details</h2><p className="text-xs text-[#99998f] mt-1">The tenant workspace shared by all branches.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Restaurant name" value={form.restaurantName} onChange={v=>update("restaurantName",v)} placeholder="e.g. The Green Table" required/>
            <Field label="First branch name" value={form.branchName} onChange={v=>update("branchName",v)} placeholder="e.g. Sector 62" required/>
            <Field label="Branch phone" value={form.branchPhone} onChange={v=>update("branchPhone",v)} placeholder="+91…"/>

          </div>
          <div className="mt-4 rounded-xl border border-[#eee2d0] bg-[#fff9ef] p-4 text-xs text-[#685e4f]">
            <strong>Restaurant subdomain preview</strong>
            <p className="mt-1 font-mono break-all">{subdomainPreview || "your-restaurant"}.restaurantos.com</p>
            <p className="mt-1">Preview only. The backend reserves an available subdomain when you create the restaurant; duplicates may receive a suffix. This URL will work only after you purchase and configure the domain.</p>
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
              {form.country.trim().toLowerCase()==="india" && <p role="status" className="sm:col-span-2 text-xs text-[#77796f]">{pinLookup==="loading"?"Looking up PIN code…":pinLookup==="found"?"State and district filled from PIN code. Verify the city and edit if needed.":pinLookup==="not-found"?"Could not find this PIN code. Enter city and state manually.":"Enter a six-digit PIN code to fill state and district automatically."}</p>}
            </div>
          </div>
        </section>
        <section className="panel p-5 sm:p-7"><div className="flex items-center gap-3 mb-6"><div className="h-10 w-10 rounded-xl bg-[#eaf0e9] text-[#527a5b] grid place-items-center"><UserRound size={18}/></div><div><h2 className="font-bold">Restaurant owner</h2><p className="text-xs text-[#99998f] mt-1">This person receives owner access to the first branch.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner full name" value={form.ownerName} onChange={v=>update("ownerName",v)} placeholder="Full name" required/>
            <Field label="Owner email" type="email" value={form.ownerEmail} onChange={v=>update("ownerEmail",v)} placeholder="owner@restaurant.com" required/>
            <Field label="Temporary password" type={showPassword?"text":"password"} value={form.ownerPassword} onChange={v=>update("ownerPassword",v)} placeholder="At least 12 characters" required minLength={12}/>
            <Field label="Confirm password" type={showPassword?"text":"password"} value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat the temporary password" required minLength={12}/>
            <Field label="Owner phone" value={form.ownerPhone} onChange={v=>update("ownerPhone",v)} placeholder="+91…"/>
          </div>
          <label className="mt-4 flex items-center gap-2 text-xs text-[#55584f]"><input type="checkbox" checked={showPassword} onChange={event=>setShowPassword(event.target.checked)}/> Show passwords</label>
          <p className="mt-3 text-xs text-[#77796f]">Use a unique temporary password and share it with the owner securely. PAN, GSTIN and FSSAI details can be collected separately when needed.</p>
        </section>
        <div className="flex justify-end"><button disabled={loading || !!created} className="primary-button !px-6 !py-3 disabled:opacity-60">{loading ? "Creating workspace…" : created ? "Restaurant created" : "Create restaurant workspace"}</button></div>
      </form>
      <p className="text-[11px] text-[#99998f] mt-7 flex items-center gap-2"><Building2 size={13}/> Restaurant data is stored in a separate tenant and branch scope.</p>
    </div>
  </main>;
}

function Field({label,value,onChange,placeholder,type="text",required=false,minLength}: {label:string;value:string;onChange:(value:string)=>void;placeholder:string;type?:string;required?:boolean;minLength?:number}) {
  return <label className="block"><span className="text-xs font-semibold text-[#55584f]">{label}{required ? " *" : ""}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} minLength={minLength} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#d68b6d]"/></label>;
}
