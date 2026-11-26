"use client";

import { useCallback, useEffect, useState } from "react";
import {type Branding,resolveBranding,brandStyle,safeImage} from "@/lib/guest-branding";
import {useGuestOrderEvents} from "@/lib/realtime/use-guest-order-events";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock3, RefreshCw, Utensils, Home, BookOpen, ReceiptText, ArrowLeft } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
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
  const [branding,setBranding]=useState<{restaurantName:string;logoUrl?:string;theme?:string;tableName?:string;branding?:Branding}|null>(null);
  const design=resolveBranding(branding);
  useEffect(()=>{fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}`).then(r=>r.json()).then(p=>{if(p.success)setBranding(p.data);}).catch(()=>{});},[qrToken]);

  const refresh = useCallback(async () => {
    if (!qrToken || !orderId) return;
    try {
      const response = await fetch(
        `${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(orderId)}`,
        {cache:"no-store"}
      );
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message ?? "Unable to load this order.");
      setOrder(payload.data);
      setError("");
      setLastChecked(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to check your order.");
    } finally {
      setLoading(false);
    }
  },[qrToken,orderId]);
  useEffect(()=>{void refresh();},[refresh,refreshKey]);
  const realtimeStatus=useGuestOrderEvents(qrToken,orderId,()=>{void refresh();});

  const activeIndex = stages.findIndex(stage => stage.key === order?.status);
  const cancelled = order?.status === "CANCELLED";

  return <main className="guest-theme min-h-screen pb-28" style={brandStyle(design)}><header className="guest-header px-5 py-4 text-[var(--guest-primary-link)]"><div className="mx-auto flex max-w-3xl items-center gap-3"><Link aria-label="Back to menu" href={`/order/${encodeURIComponent(qrToken)}`}><ArrowLeft size={21}/></Link>{safeImage(design.logoUrl)?<img src={safeImage(design.logoUrl)} alt="Restaurant logo" className="h-10 w-10 rounded-full object-cover"/>:<Utensils size={20}/>}<div><div className="font-bold">{branding?.restaurantName||"Restaurant"}</div><div className="text-xs opacity-75">{branding?.tableName||"Your table"} · Order tracking</div></div></div></header><div className="mx-auto max-w-lg px-4 py-8">
    <div className="mx-auto max-w-lg">
      <section className="panel p-6 sm:p-8">
        <div className="eyebrow">Your order</div>
        <h1 className="mt-2 text-2xl font-bold">Track your food<span style={{color:"var(--guest-link)"}}>.</span></h1>
        {loading && !order ? <p className="mt-8 text-sm text-[var(--guest-muted)]">Loading your order…</p> :
          !order ? <div className="mt-8"><p role="alert" className="text-sm text-[var(--guest-danger)]">{error || "Order not found."}</p><Link href={`/order/${encodeURIComponent(qrToken)}`} className="ghost-button mt-5 inline-block">Return to menu</Link></div> :
          <>
            <div className="mt-6 rounded-xl bg-[var(--guest-soft)] p-4">
              <div className="text-xs text-[var(--guest-muted)]">Order number</div>
              <div className="mt-1 text-xl font-bold">{order.orderNumber}</div>
              <div className="mt-2 text-sm font-semibold">₹{Number(order.totalAmount).toFixed(2)}</div>
            </div>
            {cancelled ? <p role="status" className="mt-6 rounded-xl bg-[var(--guest-error-surface)] p-4 text-sm font-semibold text-[var(--guest-danger)]">This order has been cancelled. Please speak to the restaurant team.</p> :
              <ol aria-label="Order progress" className="mt-7 space-y-5">
                {stages.map((stage, index) => {
                  const complete = index <= activeIndex;
                  return <li key={stage.key} aria-current={index === activeIndex ? "step" : undefined} className="flex gap-3">
                    <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${complete ? "bg-[var(--guest-success-surface)] text-[var(--guest-success)]" : "bg-[var(--guest-soft)] text-[var(--guest-muted)]"}`}>
                      {complete ? <CheckCircle2 size={19} /> : <Clock3 size={18} />}
                    </div>
                    <div><div className={`text-sm font-bold ${complete ? "text-[var(--guest-text)]" : "text-[var(--guest-muted)]"}`}>{stage.label}</div><p className="mt-1 text-xs text-[var(--guest-muted)]">{stage.description}</p></div>
                  </li>;
                })}
              </ol>}
            {error && <p role="alert" className="mt-5 text-xs text-[var(--guest-danger)]">{error} Showing the last known status.</p>}
            <div className="mt-7 flex items-center justify-between border-t border-[var(--guest-border)] pt-5">
              <p className="text-xs text-[var(--guest-muted)]">{lastChecked ? "Updated " + lastChecked.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "Waiting for update"} · {realtimeStatus==="connected"?"Live":realtimeStatus==="connecting"?"Connecting":"Offline · use Refresh"}</p>
              <button onClick={() => setRefreshKey(key => key + 1)} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold"><RefreshCw size={14} /> Refresh</button>
            </div>
          </>}
      </section>
      <Link href={`/order/${encodeURIComponent(qrToken)}`} className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold text-[var(--guest-muted)]"><Utensils size={15} /> Back to restaurant menu</Link>
      <p className="mt-5 text-center text-xs text-[var(--guest-muted)]">This order is saved in your browser history. Keep your order link private.</p>
    </div></div><nav aria-label="Guest navigation" className="fixed inset-x-0 bottom-0 border-t border-[var(--guest-border)] bg-[var(--guest-surface)] px-4 py-3"><div className="mx-auto grid max-w-lg grid-cols-3 gap-2">{[{label:"Home",icon:<Home size={19}/>,href:`/order/${encodeURIComponent(qrToken)}`},{label:"Menu",icon:<BookOpen size={19}/>,href:`/order/${encodeURIComponent(qrToken)}#guest-menu`},{label:"Orders",icon:<ReceiptText size={19}/>,href:`/order/${encodeURIComponent(qrToken)}?view=orders`}].map(n=><Link key={n.label} href={n.href} className="flex flex-col items-center gap-1 text-xs font-semibold text-[var(--guest-muted)]">{n.icon}{n.label}</Link>)}</div></nav>
  </main>;
}
