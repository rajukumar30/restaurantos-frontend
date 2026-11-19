"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, LockKeyhole, Mail, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (!response.ok) throw new Error(payload?.message ?? ("Login failed (HTTP " + response.status + ")."));
      if (!payload?.success || !payload.data) throw new Error("Login server returned an empty or invalid response. Please retry.");
      localStorage.setItem("restaurantos_access_token", payload.data.accessToken);
      localStorage.setItem("restaurantos_user", JSON.stringify({
        userId: payload.data.userId,
        name: payload.data.name,
        email: payload.data.email,
        authorities: payload.data.authorities,
        memberships: payload.data.memberships ?? [],
      }));
      const roles=JSON.stringify(payload.data.memberships??[]).toUpperCase();
      const next=new URLSearchParams(window.location.search).get("next");
      const kitchenOnly=roles.includes("KITCHEN")&&!roles.includes("MANAGER")&&!roles.includes("OWNER");
      const destination=(payload.data.authorities??[]).includes("PLATFORM_ADMIN")?"/admin/":roles.includes("OWNER")?"/owner/":(payload.data.memberships??[]).length?(kitchenOnly?"/staff/kitchen":"/staff/"):"/login";
      const safeNext=next&&next.startsWith("/")&&!next.startsWith("//")&&!next.includes("\\")&&((destination==="/admin/"&&next.startsWith("/admin/"))||(destination==="/owner/"&&next.startsWith("/owner/"))||((destination==="/staff/"||destination==="/staff/kitchen")&&next.startsWith("/staff/")&&(!kitchenOnly||next==="/staff/kitchen")))?next:destination;
      router.replace(safeNext);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-screen grid lg:grid-cols-[1.05fr_.95fr] bg-[#f7f4ec]">
    <section className="hidden lg:flex flex-col justify-between bg-[#171916] text-[#f7f4ec] p-12 xl:p-16">
      <div className="flex items-center gap-3"><div className="brand-mark">r.</div><div className="text-xl font-bold tracking-tight">restaurant<span className="text-[#E56A42]">os</span></div></div>
      <div className="max-w-lg"><div className="text-xs uppercase tracking-[.2em] text-[#a5aa9f] mb-5">The restaurant workspace</div><h1 className="text-5xl xl:text-6xl font-bold tracking-[-.06em] leading-[1.05]">A calmer way to run your restaurant<span className="text-[#E56A42]">.</span></h1><p className="text-[#b9bcb2] leading-7 mt-6 max-w-md">Orders, tables, kitchen and your business insights — together in one thoughtful workspace.</p></div>
      <p className="text-xs text-[#777b70]">RestaurantOS · Built for the rhythm of restaurants.</p>
    </section>
    <section className="flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-[#77796f] hover:text-[#171916] mb-12"><ArrowLeft size={15}/> Back to overview</Link>
        <div className="lg:hidden flex items-center gap-3 mb-10"><div className="brand-mark">r.</div><div className="text-lg font-bold">restaurant<span className="text-[#E56A42]">os</span></div></div>
        <div className="h-12 w-12 rounded-2xl bg-[#f4e8dc] text-[#d56a45] grid place-items-center mb-6"><Utensils size={21}/></div>
        <div className="eyebrow">Welcome back</div><h2 className="text-3xl font-bold tracking-[-.05em] mt-2">Sign in to your workspace</h2><p className="text-sm text-[#77796f] mt-3 mb-8">Use the account details provided by your RestaurantOS administrator.</p>
        <form onSubmit={submit} className="space-y-5">
          <label className="block"><span className="text-xs font-semibold text-[#55584f]">Email address</span><span className="mt-2 flex items-center gap-3 rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4"><Mail size={16} className="text-[#99998f]"/><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@restaurant.com" className="w-full bg-transparent py-3.5 text-sm outline-none"/></span></label>
          <label className="block"><span className="text-xs font-semibold text-[#55584f]">Password</span><span className="mt-2 flex items-center gap-3 rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4"><LockKeyhole size={16} className="text-[#99998f]"/><input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className="w-full bg-transparent py-3.5 text-sm outline-none"/></span></label>
          {error && <p role="alert" className="rounded-xl bg-[#fbede7] px-4 py-3 text-xs text-[#a7442a]">{error}</p>}
          <button disabled={loading} className="primary-button w-full !py-3.5 disabled:opacity-60">{loading ? "Signing in…" : "Sign in to RestaurantOS"}</button>
        </form>
        <p className="text-[11px] text-[#99998f] mt-8 leading-5">Need an account? Ask your platform administrator or restaurant owner to invite you.</p>
      </div>
    </section>
  </main>;
}
