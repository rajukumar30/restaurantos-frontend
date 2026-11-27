"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://restaurantos-backend-kz2r.onrender.com";

type Subscription = {
  id: string;
  tenantId: string;
  status: string;
  lifecycleStatus: string;
  freeAccessNow: boolean;
  endsOn: string | null;
  planName: string;
  restaurantName?: string;
};
type Envelope = { success: boolean; message?: string; data?: Subscription[] };

export default function SubscriptionHealth() {
  const [rows, setRows] = useState<Subscription[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const token = localStorage.getItem("restaurantos_access_token");
    if (!token) { setError("Sign in to view subscription health."); return; }
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(API + "/api/v1/platform/subscriptions", {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
          signal: controller.signal
        });
        const payload: Envelope = await response.json();
        if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
          throw new Error(response.status === 403 ? "You do not have permission to view subscriptions." : "Subscription data is unavailable.");
        }
        if (!controller.signal.aborted) setRows(payload.data);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Subscription data is unavailable.");
      }
    })();
    return () => controller.abort();
  }, []);

  const expiringRows = useMemo(() => {
    if (!rows) return [];
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return rows.filter(r => r.status === "ACTIVE" && (r.lifecycleStatus === "ACTIVE" || r.lifecycleStatus === "FREE_PERIOD") && !!r.endsOn && (() => {
      const end = Date.parse(r.endsOn + "T00:00:00Z");
      return Number.isFinite(end) && end >= today && end <= today + 7 * 86400000;
    })()).sort((a,b) => (a.endsOn??"").localeCompare(b.endsOn??""));
  }, [rows]);

  const summary = useMemo(() => {
    if (!rows) return null;
    const current = rows.filter(r => r.status === "ACTIVE");
    return {
      active: current.filter(r => r.lifecycleStatus === "ACTIVE" || r.lifecycleStatus === "FREE_PERIOD").length,
      free: current.filter(r => r.freeAccessNow).length,
      expired: current.filter(r => r.lifecycleStatus === "EXPIRED").length,
      expiring: expiringRows.length
    };
  }, [rows, expiringRows]);

  return <section className="mt-5 rounded-2xl border border-[#e8e5dd] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-extrabold">Subscription health</h2>
        <p className="mt-1 text-sm text-[#77796f]">Live subscription records; no estimated revenue.</p></div>
      <Link href="/admin/subscriptions" className="text-sm font-bold text-[#b85d3e]">Manage subscriptions →</Link>
    </div>
    {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>
      : !summary ? <p role="status" className="mt-4 text-sm text-[#77796f]">Loading subscriptions…</p>
      : <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([
          ["Active", summary.active],
          ["Currently free", summary.free],
          ["Expired", summary.expired],
          ["Expiring in 7 days", summary.expiring]
        ] as const).map(([label, value]) =>
          <div key={label} className="rounded-xl bg-[#f7f4ec] p-4">
            <p className="text-xs font-semibold text-[#77796f]">{label}</p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums">{value.toLocaleString("en-IN")}</p>
          </div>)}
      </div>}
    {summary && <div className="mt-5 border-t pt-4"><h3 className="text-sm font-extrabold">Subscriptions ending within 7 days</h3><p className="mt-1 text-xs text-[#77796f]">Review these subscriptions before access expires. This is a review queue, not an automatic renewal or payment collection.</p>{expiringRows.length===0?<p className="mt-3 text-sm text-[#77796f]">No active subscriptions ending in the next 7 days.</p>:<div className="mt-3 divide-y">{expiringRows.slice(0,10).map(r=><div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><Link href={"/admin/restaurants/"+encodeURIComponent(r.tenantId)} className="font-bold text-[#b85d3e]">{r.restaurantName||"Restaurant "+r.tenantId.slice(0,8)}</Link><p className="mt-1 text-xs text-[#77796f]">{r.planName} · Ends {r.endsOn}</p></div><Link href={"/admin/subscriptions?tenantId="+encodeURIComponent(r.tenantId)} className="rounded-lg border px-3 py-2 text-xs font-bold">Review subscription</Link></div>)}{expiringRows.length>10&&<p className="py-3 text-xs text-[#77796f]">Showing 10 of {expiringRows.length}. Open subscriptions for the full directory.</p>}</div>}</div>}
  </section>;
}
