"use client";

import Link from "next/link";
import { Metrics, OrderChart, usePlatformOverview } from "@/components/platform-overview";
const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
export default function PlatformAnalytics(){
  const {data,error,loading}=usePlatformOverview();
  return <main className="px-5 py-8 sm:px-8 sm:py-10"><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#c15d3c]">Reports & insights</p><h1 className="mt-2 text-3xl font-extrabold">Analytics & Reports</h1><p className="mt-2 text-sm text-[#77796f]">Live platform usage and restaurant activity. All dates in UTC.</p></div>
    {loading&&<p role="status" className="rounded-xl bg-white p-5 text-sm">Loading analytics…</p>}
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>}
    {data&&<><Metrics data={data}/><div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]"><OrderChart data={data}/><section className="rounded-2xl border border-[#e8e5dd] bg-white p-6"><h2 className="text-lg font-extrabold">Restaurant order value</h2><p className="mt-2 text-xs text-[#77796f]">Gross order value · last 30 days</p><p className="mt-6 break-words text-3xl font-extrabold">{money(data.grossOrderValueLast30Days)}</p><p className="mt-4 text-sm leading-6 text-[#77796f]">This measures food orders placed at restaurants. It does not represent revenue earned by RestaurantOS.</p></section></div></>}
    <section className="mt-5 rounded-2xl border border-[#e8e5dd] bg-white p-6"><h2 className="text-lg font-extrabold">Subscription business analytics</h2><p className="mt-2 text-sm leading-6 text-[#77796f]">MRR, ARR, churn, trials and renewals will become available when subscription plans and billing records are implemented. We do not show estimated or fabricated revenue.</p><Link href="/admin/restaurants" className="mt-4 inline-block text-sm font-bold text-[#b85d3e]">Browse restaurants →</Link></section>
  </main>;
}
