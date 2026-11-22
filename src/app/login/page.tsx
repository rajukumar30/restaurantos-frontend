"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, Mail, Utensils, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import {membershipRoles,staffRole,roleHome} from "../staff/role-routes";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://restaurantos-backend-kz2r.onrender.com";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword,setShowPassword] = useState(false);

  // Best-effort warm-up for the free Render instance while credentials are entered.
  useEffect(() => {
    const controller = new AbortController();
    fetch(API + "/actuator/health", { mode: "no-cors", signal: controller.signal, cache: "no-store" }).catch(() => {});
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    localStorage.removeItem("restaurantos_access_token");
    localStorage.removeItem("restaurantos_user");
    try {
      const response = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const raw = await response.text();
      let payload = null;
      if (raw.trim()) {
        try { payload = JSON.parse(raw); } catch { /* Upstream can return HTML. */ }
      }
      if (!response.ok) {
        const message=payload?.message||payload?.error||"";
        throw new Error(response.status===403 ? "Account disabled or access denied. Contact your restaurant administrator." : (message||"Login failed (HTTP "+response.status+")."));
      }
      if (!payload?.success || !payload.data) throw new Error("Login server returned an empty or invalid response. Please retry.");
      if(!(payload.data.authorities??[]).includes("PLATFORM_ADMIN")&&!(payload.data.memberships??[]).length)
        throw new Error("Account disabled or access denied. Contact your restaurant administrator.");
      localStorage.setItem("restaurantos_access_token", payload.data.accessToken);
      localStorage.setItem("restaurantos_user", JSON.stringify({
        userId: payload.data.userId,
        name: payload.data.name,
        email: payload.data.email,
        authorities: payload.data.authorities,
        memberships: payload.data.memberships ?? [],
      }));
      const roles=membershipRoles(payload.data.memberships??[]);
      const roleKeys=roles.map(r=>r.toUpperCase());
      const next=new URLSearchParams(window.location.search).get("next");
      const destination=(payload.data.authorities??[]).includes("PLATFORM_ADMIN")?"/admin/":roleKeys.includes("OWNER")?"/owner/":(payload.data.memberships??[]).length?roleHome(staffRole(roles)):"/login";
      const staffDestination=destination.startsWith("/staff/");
      const allowedNext=next&&next.startsWith("/")&&!next.startsWith("//")&&!next.includes("\\\\")&&(
       (destination==="/admin/"&&next.startsWith("/admin/"))||
       (destination==="/owner/"&&next.startsWith("/owner/"))||
       (staffDestination&&(next===destination||next==="/staff/"||next==="/staff/dashboard"||
         (staffRole(roles)==="MANAGER"&&["/staff/kitchen","/staff/tables","/staff/billing"].includes(next))||
         (staffRole(roles)==="WAITER"&&next==="/staff/tables")||
         (staffRole(roles)==="CASHIER"&&next==="/staff/billing")))
      );
      const safeNext=allowedNext&&next?next:destination;
      router.replace(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-screen bg-[#f7f4ec] lg:grid lg:grid-cols-[1fr_1fr]">
    <section className="hidden lg:flex flex-col justify-between bg-[#171916] text-[#f7f4ec] p-12 xl:p-16">
      <div className="flex items-center gap-3"><div className="brand-mark">r.</div><div className="text-xl font-bold">restaurant<span className="text-[#E56A42]">os</span></div></div>
      <div className="max-w-lg"><div className="text-xs uppercase tracking-[.2em] text-[#a5aa9f] mb-5">One connected workspace</div><h1 className="text-5xl xl:text-6xl font-bold tracking-[-.06em] leading-[1.05]">Run every service with confidence<span className="text-[#E56A42]">.</span></h1><p className="text-[#b9bcb2] leading-7 mt-6 max-w-md">Orders, kitchen, tables and insights — everything your restaurant team needs, together.</p></div>
      <p className="text-xs text-[#a5aa9f]">RestaurantOS · Restaurant operations, simplified.</p>
    </section>
    <section className="flex min-h-screen lg:min-h-0 flex-col px-5 py-6 sm:px-10 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-end gap-3 mb-8 lg:mb-14">
          
          <div className="lg:hidden flex items-center gap-2"><div className="brand-mark !h-9 !w-9 !rounded-xl">r.</div><span className="text-base font-bold">restaurant<span className="text-[#E56A42]">os</span></span></div>
        </div>
        <div className="rounded-[28px] border border-[#e8e1d5] bg-white p-6 shadow-[0_16px_50px_rgba(40,36,26,0.06)] sm:p-9">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8e9df] text-[#d56a45]"><Utensils size={23}/></div>
          <div className="text-xs font-bold uppercase tracking-[.16em] text-[#c15d3c]">Welcome back</div>
          <h1 className="mt-2 text-[28px] leading-tight sm:text-3xl font-extrabold tracking-[-.045em] text-[#171916]">Sign in to RestaurantOS</h1>
          <p className="mt-3 mb-7 text-sm leading-6 text-[#77796f]">Access your restaurant workspace securely.</p>
          <form onSubmit={submit} className="space-y-5">
            <label className="block"><span className="text-sm font-semibold text-[#42463e]">Email address</span><span className="mt-2 flex items-center gap-3 rounded-xl border border-[#dedbd3] bg-[#fdfcf9] px-4 focus-within:border-[#d56a45] focus-within:ring-2 focus-within:ring-[#f7e2d8]"><Mail size={18} className="shrink-0 text-[#878b80]"/><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@restaurant.com" className="min-w-0 w-full bg-transparent py-3.5 text-base outline-none"/></span></label>
            <label className="block"><span className="text-sm font-semibold text-[#42463e]">Password</span><span className="mt-2 flex items-center gap-3 rounded-xl border border-[#dedbd3] bg-[#fdfcf9] px-4 focus-within:border-[#d56a45] focus-within:ring-2 focus-within:ring-[#f7e2d8]"><LockKeyhole size={18} className="shrink-0 text-[#878b80]"/><input type={showPassword?"text":"password"} required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className="min-w-0 w-full bg-transparent py-3.5 text-base outline-none"/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)} className="shrink-0 p-1 text-[#77796f] hover:text-[#171916]">{showPassword?<EyeOff size={19}/>:<Eye size={19}/>}</button></span></label>
            {error && <p role="alert" className="rounded-xl bg-[#fbede7] px-4 py-3 text-sm text-[#a7442a]">{error}</p>}
            <button disabled={loading} className="w-full rounded-xl bg-[#e66b43] px-5 py-3.5 text-base font-bold text-white transition hover:bg-[#ce5833] disabled:cursor-wait disabled:opacity-65">{loading?"Signing in…":"Sign in"}</button>
          </form>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-[#77796f]"><ShieldCheck size={15}/> Secure access for owners and staff</p>
        </div>
        <p className="mt-6 text-center text-xs leading-5 text-[#898c82]">Need access? Contact your restaurant owner or platform administrator.</p>
      </div>
    </section>
  </main>;
}
