"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {type Branding,resolveBranding,brandStyle} from "@/lib/guest-branding";
import {GuestBrandHeader} from "@/components/guest-branding";
import GuestBottomNav,{guestViewHref} from "@/components/guest-bottom-nav";
import {orderProgress} from "@/lib/guest-order-progress";
import {useGuestOrderEvents} from "@/lib/realtime/use-guest-order-events";
import Link from "next/link";
import {useParams} from "next/navigation";
import {ArrowLeft,ArrowRight,Check,Clock3,RefreshCw,ShoppingBag,ChefHat,HandPlatter,CircleAlert} from "lucide-react";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
type OrderStatus={orderNumber:string;status:string;totalAmount:number;createdAt:string};
type MenuBranding={restaurantName:string;logoUrl?:string;theme?:string;tableName?:string;branding?:Branding};
const headlines:Record<string,string>={NEW:"We've received your order",ACCEPTED:"Your order is confirmed",PREPARING:"Your food is being prepared",READY:"Your food is ready",SERVED:"Enjoy your meal!",CANCELLED:"Order cancelled"};
const summaries:Record<string,string>={NEW:"The restaurant will confirm your order shortly.",ACCEPTED:"The kitchen will start preparing your food.",PREPARING:"Our kitchen is working on your order.",READY:"The restaurant team will serve your food.",SERVED:"Your food has been served. Thank you for dining with us.",CANCELLED:"Please speak to the restaurant team if you need assistance."};
export default function TrackOrderPage(){
 const {qrToken,orderId}=useParams<{qrToken:string;orderId:string}>();
 const [order,setOrder]=useState<OrderStatus|null>(null),[branding,setBranding]=useState<MenuBranding|null>(null);
 const [loading,setLoading]=useState(true),[refreshing,setRefreshing]=useState(false),[error,setError]=useState(""),[lastChecked,setLastChecked]=useState<Date|null>(null);
 const refreshRef=useRef<()=>void>(()=>{});
 const refresh=useCallback(()=>refreshRef.current(),[]);
 const design=resolveBranding(branding);
 useEffect(()=>{
  const controller=new AbortController();setBranding(null);
  fetch(API+"/api/v1/public/qr/"+encodeURIComponent(qrToken),{signal:controller.signal,cache:"no-store"}).then(r=>r.json()).then(p=>{if(!controller.signal.aborted&&p.success)setBranding(p.data);}).catch(()=>{});
  return()=>controller.abort();
 },[qrToken]);
 useEffect(()=>{
  let active=true,inFlight=false,queued=false;const controller=new AbortController();
  setOrder(null);setError("");setLoading(true);setLastChecked(null);setRefreshing(false);
  async function load(){
   if(!active)return;if(inFlight){queued=true;return;}inFlight=true;setRefreshing(true);
   try{
    const r=await fetch(API+"/api/v1/public/qr/"+encodeURIComponent(qrToken)+"/orders/"+encodeURIComponent(orderId),{cache:"no-store",signal:controller.signal});
    const p=await r.json();if(!r.ok||!p.success)throw Error(p.message||"Unable to load this order.");
    if(active){setOrder(p.data);setError("");setLastChecked(new Date());}
   }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to check your order.");}
   finally{inFlight=false;if(active){setLoading(false);setRefreshing(false);if(queued){queued=false;void load();}}}
  }
  refreshRef.current=()=>void load();void load();
  return()=>{active=false;controller.abort();refreshRef.current=()=>{};};
 },[qrToken,orderId]);
 const live=useGuestOrderEvents(qrToken,orderId,refresh);
 const progress=orderProgress(order?.status||"");
 const Icon=progress.cancelled?CircleAlert:order?.status==="SERVED"||order?.status==="READY"?HandPlatter:order?.status==="PREPARING"?ChefHat:ShoppingBag;
 const connected=live==="connected"&&!error;
 return <main className="guest-theme min-h-screen pb-28" style={brandStyle(design)}>
  <header className="guest-header"><div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6"><Link aria-label="Back to orders" href={guestViewHref(qrToken,"orders")} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border"><ArrowLeft size={19}/></Link><div className="min-w-0 flex-1"><GuestBrandHeader branding={design}/></div>{branding?.tableName&&<span className="shrink-0 rounded-full bg-[var(--guest-tint)] px-3 py-1.5 text-[11px] font-semibold text-[var(--guest-primary-link)]">{branding.tableName}</span>}</div></header>
  <div className="mx-auto max-w-lg px-4 py-6">
   <div className="mb-5 flex items-end justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--guest-link)]">Your order</p><h1 className="mt-1 text-2xl font-bold">Track your order</h1></div><span className="inline-flex items-center gap-1.5 rounded-full border bg-[var(--guest-surface)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--guest-muted)]"><span className={"h-2 w-2 rounded-full "+(connected?"bg-[var(--guest-success)]":"bg-[var(--guest-muted)]")}/>{connected?"Live":live==="connecting"?"Connecting":"Offline"}</span></div>
   {loading&&!order?<section className="panel p-6 text-sm text-[var(--guest-muted)]">Loading your order…</section>:!order?<section className="panel p-6"><p role="alert" className="text-sm text-[var(--guest-danger)]">{error||"Order not found."}</p><button onClick={refresh} disabled={refreshing} className="ghost-button mt-4 inline-flex items-center gap-2"><RefreshCw size={15}/>{refreshing?"Checking…":"Try again"}</button></section>:<>
    <section className="overflow-hidden rounded-[var(--guest-radius)] shadow-sm" style={{background:"var(--guest-primary)",color:"var(--guest-primary-text)"}}>
      <div className="flex items-start gap-3 p-5" role="status" aria-live="polite"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-current"><Icon size={22}/></div><div className="min-w-0"><h2 className="text-lg font-bold">{headlines[order.status]||"Order status: "+order.status}</h2><p className="mt-1 text-sm leading-5">{summaries[order.status]||"Check with the restaurant team for more information."}</p></div></div>
      <div className="flex items-center justify-between gap-4 border-t border-current px-5 py-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider">Order number</p><p className="mt-1 break-all text-sm font-bold">{order.orderNumber}</p></div><div className="shrink-0 text-right"><p className="text-[10px] font-semibold uppercase tracking-wider">Total</p><p className="mt-1 text-lg font-bold tabular-nums">₹{Number(order.totalAmount).toFixed(2)}</p></div></div>
    </section>
    {progress.known&&!progress.cancelled&&<section className="panel mt-4 p-5"><h2 className="mb-5 text-base font-bold">Order progress</h2><ol aria-label="Order progress">{progress.stages.map((stage,i)=>{
      const current=stage.state==="current",done=stage.state==="complete";
      return <li key={stage.key} aria-current={current?"step":undefined} className={"relative flex gap-3 "+(i<progress.stages.length-1?"pb-5":"")}>
       {i<progress.stages.length-1&&<div aria-hidden="true" className="absolute bottom-0 left-[16px] top-8 w-[2px]" style={{background:done?"var(--guest-success)":"var(--guest-border)"}}/>}
       <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full" style={current?{background:"var(--guest-accent)",color:"var(--guest-accent-text)"}:done?{background:"var(--guest-success-surface)",color:"var(--guest-success)"}:{background:"var(--guest-soft)",color:"var(--guest-muted)"}}>{done?<Check size={17}/>:current&&stage.key==="SERVED"?<Check size={17}/>:current?<span className="h-2.5 w-2.5 rounded-full bg-current"/>:<Clock3 size={16}/>}</span>
       <div className="min-w-0 flex-1 pt-0.5"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className={"text-sm font-bold "+(current?"text-[var(--guest-link)]":done?"text-[var(--guest-text)]":"text-[var(--guest-muted)]")}>{stage.label}</p>{current&&<span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold text-[var(--guest-link)]">{stage.key==="SERVED"?"Finished":"Current"}</span>}</div><p className="mt-1 text-xs leading-5 text-[var(--guest-muted)]">{stage.description}</p></div>
      </li>;
    })}</ol></section>}
    {progress.cancelled&&<p role="status" className="mt-4 rounded-xl bg-[var(--guest-error-surface)] p-4 text-sm font-semibold text-[var(--guest-danger)]">This order was cancelled. Please contact the restaurant team.</p>}
    {error&&<p role="alert" className="mt-4 rounded-xl bg-[var(--guest-error-surface)] p-3 text-xs text-[var(--guest-danger)]">{error} Showing the last known status.</p>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--guest-muted)]">{lastChecked?"Updated "+lastChecked.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"}):"Waiting for update"}{!connected?" · Refresh for latest status":""}</p><button type="button" disabled={refreshing} onClick={refresh} className="ghost-button inline-flex items-center gap-2 disabled:opacity-60"><RefreshCw size={14} className={refreshing?"animate-spin":""}/>{refreshing?"Checking…":"Refresh"}</button></div>
    <Link href={guestViewHref(qrToken,"menu")} className="guest-cta mt-5 flex w-full justify-center">Back to menu <ArrowRight size={16}/></Link>
    <p className="mt-4 text-center text-[11px] leading-5 text-[var(--guest-muted)]">Keep your order link private.</p>
   </>}
  </div><GuestBottomNav qrToken={qrToken} active="orders"/>
 </main>;
}
