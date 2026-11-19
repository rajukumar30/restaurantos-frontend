"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock3, RefreshCw, Utensils } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
type OrderStatus = { orderNumber: string; status: string; totalAmount: number; createdAt: string };
const stages = [
  { key: "NEW", label: "Order received", description: "The restaurant has received your order." },
  { key: "ACCEPTED", label: "Accepted", description: "The team has confirmed your order." },
  { key: "PREPARING", label: "Preparing", description: "The kitchen is preparing your food." },
  { key: "READY", label: "Ready", description: "Your order is ready to serve." },
  { key: "SERVED", label: "Served", description: "Your order has been served." },
];

export default function TrackOrderPage() {
  const { qrToken, orderId } = useParams<{ qrToken: string; orderId: string }>();
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!qrToken || !orderId) return;
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch(
          `${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(orderId)}`,
          { cache: "no-store" }
        );
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message ?? "Unable to load this order.");
        if (!cancelled) {
          setOrder(payload.data);
          setError("");
          setLastChecked(new Date());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to check your order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [qrToken, orderId, refreshKey]);

  const activeIndex = stages.findIndex(stage => stage.key === order?.status);
  const cancelled = order?.status === "CANCELLED";

  return <main className="min-h-screen bg-[#f7f4ec] px-4 py-10 sm:py-16">
    <div className="mx-auto max-w-lg">
      <div className="mb-8 flex items-center gap-3">
        <div className="brand-mark">r.</div>
        <div><div className="font-bold tracking-tight">restaurant<span className="text-[#E56A42]">os</span></div><div className="text-[10px] uppercase tracking-widest text-[#99998f]">Order tracking</div></div>
      </div>
      <section className="panel p-6 sm:p-8">
        <div className="eyebrow">Your order</div>
        <h1 className="mt-2 text-2xl font-bold">Track your food<span className="text-[#E56A42]">.</span></h1>
        {loading && !order ? <p className="mt-8 text-sm text-[#77796f]">Loading your order…</p> :
          !order ? <div className="mt-8"><p role="alert" className="text-sm text-[#a7442a]">{error || "Order not found."}</p><Link href={`/order/${encodeURIComponent(qrToken)}`} className="ghost-button mt-5 inline-block">Return to menu</Link></div> :
          <>
            <div className="mt-6 rounded-xl bg-[#f7f4ec] p-4">
              <div className="text-xs text-[#77796f]">Order number</div>
              <div className="mt-1 text-xl font-bold">{order.orderNumber}</div>
              <div className="mt-2 text-sm font-semibold">₹{Number(order.totalAmount).toFixed(2)}</div>
            </div>
            {cancelled ? <p role="status" className="mt-6 rounded-xl bg-[#fbede7] p-4 text-sm font-semibold text-[#a7442a]">This order has been cancelled. Please speak to the restaurant team.</p> :
              <ol aria-label="Order progress" className="mt-7 space-y-5">
                {stages.map((stage, index) => {
                  const complete = index <= activeIndex;
                  return <li key={stage.key} aria-current={index === activeIndex ? "step" : undefined} className="flex gap-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${complete ? "bg-[#eaf2e9] text-[#527a5b]" : "bg-[#efeee9] text-[#99998f]"}`}>
                      {complete ? <CheckCircle2 size={19} /> : <Clock3 size={18} />}
                    </div>
                    <div><div className={`text-sm font-bold ${complete ? "text-[#252922]" : "text-[#99998f]"}`}>{stage.label}</div><p className="mt-1 text-xs text-[#85867d]">{stage.description}</p></div>
                  </li>;
                })}
              </ol>}
            {error && <p role="alert" className="mt-5 text-xs text-[#a7442a]">{error} Showing the last known status.</p>}
            <div className="mt-7 flex items-center justify-between border-t border-[#e9e5dc] pt-5">
              <p className="text-xs text-[#99998f]">{lastChecked ? "Updated " + lastChecked.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "Waiting for update"} · Every 10 sec</p>
              <button onClick={() => setRefreshKey(key => key + 1)} className="ghost-button inline-flex items-center gap-2"><RefreshCw size={14} /> Refresh</button>
            </div>
          </>}
      </section>
      <Link href={`/order/${encodeURIComponent(qrToken)}`} className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[#77796f]"><Utensils size={15} /> Back to restaurant menu</Link>
      <p className="mt-5 text-center text-xs text-[#99998f]">Save this page to check your order again later. Anyone with this link can view its status.</p>
    </div>
  </main>;
}
