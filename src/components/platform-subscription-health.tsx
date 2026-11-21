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

  const summary = useMemo(() => {
    if (!rows) return null;
    const current = rows.filter(r => r.status === "ACTIVE");
    return {
      active: current.filter(r => r.lifecycleStatus === "ACTIVE").length,
      free: current.filter(r => r.freeAccessNow).length,
      expired: current.filter(r => r.lifecycleStatus === "EXPIRED").length,
      expiring: current.filter(r => {
        if (!r.endsOn || r.lifecycleStatus !== "ACTIVE") return false;
        const end = Date.parse(r.endsOn + "T00:00:00Z");
        const now = new Date();
        const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        return end >= today && end <= today + 7 * 86400000;
      }).length
    };
  }, [rows]);

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
  </section>;
}
