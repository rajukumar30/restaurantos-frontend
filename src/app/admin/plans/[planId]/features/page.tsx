"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://restaurantos-backend-kz2r.onrender.com";
type Feature = { key: string; name: string; category: string; available: boolean; included: boolean; dependencies: string[] };
type Plan = { id: string; name: string; status: string };
type Envelope<T> = { success: boolean; message?: string; data: T };

export default function PlanFeaturesPage() {
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("restaurantos_access_token");
    if (!token) { setError("Sign in to manage plans."); setLoading(false); return; }
    async function get<T>(path: string): Promise<T> {
      const response = await fetch(API + path, { headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: controller.signal });
      const payload: Envelope<T> = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load plan configuration");
      return payload.data;
    }
    Promise.all([
      get<Plan[]>("/api/v1/platform/plans"),
      get<Feature[]>("/api/v1/platform/plans/" + encodeURIComponent(planId) + "/features")
    ]).then(([plans, f]) => { if (!controller.signal.aborted) { const p = plans.find(item => item.id === planId); if (!p) throw new Error("Plan not found"); setPlan(p); setFeatures(f); } })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to load plan"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [planId]);

  async function toggle(feature: Feature) {
    if (!plan || plan.status !== "DRAFT" || saving) return;
    setError(""); setNotice(""); setSaving(feature.key);
    try {
      const token = localStorage.getItem("restaurantos_access_token");
      const response = await fetch(API + "/api/v1/platform/plans/" + encodeURIComponent(planId) + "/features/" + encodeURIComponent(feature.key), {
        method: "PUT",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ included: !feature.included })
      });
      const payload: Envelope<Feature[]> = await response.json();
      if (!response.ok || !payload.success || !Array.isArray(payload.data)) throw new Error(payload.message || "Unable to update plan feature");
      setFeatures(payload.data);
      setNotice(feature.name + " updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update feature");
    } finally { setSaving(""); }
  }

  const categories = Array.from(new Set(features.map(f => f.category)));
  return <main className="px-4 py-6 sm:px-8 sm:py-10">
    <Link href="/admin/plans" className="text-sm font-bold text-[#b85d3e]">← Subscription plans</Link>
    <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">Plan features</h1>
    <p className="mt-2 text-sm text-[#77796f]">{plan?.name ?? "Loading plan"} · {plan?.status ?? "…"} · Feature changes are permitted only for draft plans.</p>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-700">{notice}</p>}
    {loading ? <p className="mt-6 text-sm">Loading features…</p> : categories.map(category =>
      <section key={category} className="mt-6 rounded-2xl border border-[#e8e5dd] bg-white p-5">
        <h2 className="text-lg font-extrabold">{category}</h2>
        <div className="mt-4 divide-y">
          {features.filter(f => f.category === category).map(f =>
            <div key={f.key} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-semibold">{f.name}</p>
                <p className="mt-1 text-xs text-[#77796f]">{f.key}{f.dependencies.length ? " · Requires: " + f.dependencies.join(", ") : ""}</p>
                {!f.available && <p className="mt-1 text-xs font-semibold text-amber-700">Not available on the platform</p>}
              </div>
              <button type="button" role="switch" aria-checked={f.included} aria-label={f.name + " included in plan"}
                disabled={plan?.status !== "DRAFT" || !!saving || (!f.available && !f.included)}
                onClick={() => void toggle(f)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${f.included ? "bg-green-100 text-green-800" : "bg-[#f2f0ea] text-[#666b62]"}`}>
                {saving === f.key ? "Saving…" : f.included ? "Included" : "Excluded"}
              </button>
            </div>)}
        </div>
      </section>)}
    {!loading && !error && features.length === 0 && <p className="mt-6 text-sm">No features are configured.</p>}
  </main>;
}
