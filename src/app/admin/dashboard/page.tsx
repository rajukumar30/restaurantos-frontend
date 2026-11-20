"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, ChefHat, LayoutDashboard, LogOut, Settings2, ShieldCheck, Sparkles } from "lucide-react";

const sections = [
  { title: "All restaurants", description: "Search restaurants and open their feature settings.", href: "/admin/restaurants", icon: Building2, available: true },
  { title: "Onboard restaurant", description: "Create a tenant, first branch and owner account.", href: "/admin/restaurants/new", icon: Building2, available: true },
  { title: "Service workflow", description: "Configure kitchen-managed or waiter-confirmed service per branch.", href: "/admin/restaurants/service", icon: ChefHat, available: true },
  { title: "Restaurant feature management", description: "Assign feature entitlements, dependencies and restaurant overrides.", href: "/admin/restaurants/features", icon: Settings2, available: true },
] as const;

export default function PlatformDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("restaurantos_access_token");
    const raw = localStorage.getItem("restaurantos_user");
    if (!token || !raw) { router.replace("/login?next=%2Fadmin%2Fdashboard"); return; }
    try {
      const user = JSON.parse(raw) as { authorities?: string[] };
      if (!user.authorities?.includes("PLATFORM_ADMIN")) { router.replace("/"); return; }
      setAuthorized(true);
    } catch { router.replace("/login"); }
  }, [router]);

  function signOut() {
    localStorage.removeItem("restaurantos_access_token");
    localStorage.removeItem("restaurantos_user");
    router.replace("/login");
  }

  if (!authorized) return <main className="grid min-h-screen place-items-center text-sm text-[#77796f]">Checking platform administrator access…</main>;

  return (
    <main className="min-h-screen bg-[#f7f4ec] text-[#171916]">
      <header className="border-b border-[#e9e5dc] bg-[#fffefa]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <span className="brand-mark">r.</span>
            <span><span className="block text-base font-extrabold tracking-tight">restaurant<span className="text-[#e56a42]">os</span></span><span className="block text-[10px] font-semibold uppercase tracking-[.15em] text-[#77796f]">Platform administration</span></span>
          </Link>
          <button type="button" onClick={signOut} className="ghost-button flex items-center gap-2"><LogOut size={15} /> Sign out</button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-9 sm:py-12">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">RestaurantOS / Platform</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Platform dashboard<span className="text-[#e56a42]">.</span></h1>
            <p className="mt-3 max-w-xl text-sm text-[#77796f]">Manage restaurant onboarding and operational settings from one place.</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e7d9] bg-[#eff6ee] px-3 py-2 text-xs font-semibold text-[#416c48]"><ShieldCheck size={15} /> Platform admin</span>
        </div>

        <section className="mb-7 rounded-2xl border border-[#e9e5dc] bg-[#fffefa] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <LayoutDashboard className="mt-1 shrink-0 text-[#e56a42]" size={20} />
            <div>
              <h2 className="font-bold">Administration workspace</h2>
              <p className="mt-2 text-sm leading-relaxed text-[#77796f]">Restaurant statistics and subscription metrics will appear after the secured reporting APIs are connected. No sample numbers are shown as live data.</p>
            </div>
          </div>
        </section>

        <h2 className="mb-4 text-lg font-bold">Restaurant management</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sections.map(({ title, description, href, icon: Icon, available }) => (
            <div key={title} className="flex min-h-[205px] flex-col rounded-2xl border border-[#e9e5dc] bg-[#fffefa] p-5">
              <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-[#f5eee5] text-[#c86645]"><Icon size={21} /></span>
              <h3 className="text-base font-bold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[#77796f]">{description}</p>
              {available ? <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#b85d3e]">Open module <ArrowRight size={15} /></Link> : <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#77796f]"><Sparkles size={15} /> In development</span>}
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-[#77796f]">Administrative access and feature permissions must also be enforced by the backend. This page does not modify restaurant configurations.</p>
      </div>
    </main>
  );
}
