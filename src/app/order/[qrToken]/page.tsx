"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {useGuestOrderEvents} from "@/lib/realtime/use-guest-order-events";
import { Minus, Plus, ShoppingBag, Utensils, Search, Clock3, List, UserRound, X, Check } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GuestService from "@/components/guest-service";
import {type Branding,resolveBranding,brandStyle} from "@/lib/guest-branding";
import {GuestPageHeader,GuestBrandHero,GuestBrandDetails} from "@/components/guest-branding";
import {GuestMenuDishCard,GuestFeaturedDishCard} from "@/components/guest-dish-card";
import GuestBottomNav from "@/components/guest-bottom-nav";
import {type GuestView,guestViewFromUrl,guestViewHref,guestTrackingHref,trackingOrderFromUrl} from "@/lib/guest-routes";
import GuestOrderTracking,{type OrderStatus} from "@/components/guest-order-tracking";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
type Item={id:string;name:string;description?:string;price:number;dietaryType:string;prepTimeMinutes:number;imageUrl?:string|null};
type Category={id:string;name:string;items:Item[]};
type Menu={tableId:string;tableName:string;branchName:string;restaurantName:string;categories:Category[];slogan?:string;logoUrl?:string;bannerUrl?:string;theme?:string;branding?:Branding};

export default function GuestOrderPage(){
  const params=useParams<{qrToken:string}>();
  return <GuestWorkspace key={params.qrToken} qrToken={params.qrToken}/>;
}
function GuestWorkspace({qrToken}:{qrToken:string}){
  const [menu,setMenu]=useState<Menu|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [cart,setCart]=useState<Record<string,number>>({});
  const [selectedDish,setSelectedDish]=useState<Item|null>(null);
  const [search,setSearch]=useState("");
  const [activeCategory,setActiveCategory]=useState("all");
  const [categoryOpen,setCategoryOpen]=useState(false);
  const [authOpen,setAuthOpen]=useState(false);
  const [authPhone,setAuthPhone]=useState("");
  const [authName,setAuthName]=useState("");
  const [profileName,setProfileName]=useState("");
  const [authError,setAuthError]=useState("");
  const [showCart,setShowCart]=useState(false);
  const [orderNotes,setOrderNotes]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const submittingRef=useRef(false);
  const [orderError,setOrderError]=useState("");
  const [receipt,setReceipt]=useState<{orderId:string;orderNumber:string;totalAmount:number;tableName:string;status:string}|null>(null);
  const [trackingError,setTrackingError]=useState("");
  const [ordersOpen,setOrdersOpen]=useState(false);
  const [guestPage,setGuestPage]=useState<GuestView>("home");
  const [trackingId,setTrackingId]=useState<string|null>(null);
  const [guestOrders,setGuestOrders]=useState<{orderId:string;orderNumber:string;totalAmount:number;tableName:string;status:string;createdAt:string}[]>([]);
  const [historyPhone,setHistoryPhone]=useState("");
  const [historyChallenge,setHistoryChallenge]=useState("");
  const [historyCode,setHistoryCode]=useState("");
  const [historyToken,setHistoryToken]=useState("");
  const [historyError,setHistoryError]=useState("");
  const [historyBusy,setHistoryBusy]=useState(false);
  const [verifiedOrders,setVerifiedOrders]=useState<typeof guestOrders>([]);
  const lastOrdersRefresh=useRef(0);
  useEffect(()=>{try{const s=JSON.parse(localStorage.getItem("restaurantos_verified_"+qrToken)||"null");if(s&&s.expiresAt>Date.now()){setHistoryToken(s.token);setHistoryPhone(s.phone);setAuthPhone(s.phone);}}catch{/* ignore */}},[qrToken]);
  useEffect(()=>{if(!historyToken)return;let cancelled=false;
    fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/customer/orders`,{headers:{Authorization:"Bearer "+historyToken},cache:"no-store"})
    .then(async r=>{if(!r.ok)throw new Error("Verification expired. Please verify again.");return r.json();})
    .then(p=>{if(!cancelled){setVerifiedOrders(p.data.map((o:typeof guestOrders[number])=>({...o,totalAmount:Number(o.totalAmount)})));const name=p.data.find((o:{customerName?:string})=>o.customerName?.trim())?.customerName;if(name){setProfileName(name);setAuthName(name);try{localStorage.setItem("restaurantos_guest_profile_"+qrToken,JSON.stringify({name,phone:historyPhone}));}catch{/* storage unavailable */}}}})
    .catch(e=>{if(!cancelled){setHistoryError(e.message);setHistoryToken("");setVerifiedOrders([]);localStorage.removeItem("restaurantos_verified_"+qrToken);}});
    return()=>{cancelled=true;};
  },[historyToken,qrToken]);
  async function requestHistoryOtp(){setHistoryError("");if(!/^[6-9][0-9]{9}$/.test(historyPhone)){setHistoryError("Enter a valid mobile number.");return;}
    setHistoryBusy(true);try{const r=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/customer/otp/request`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:"+91"+historyPhone})});const raw=await r.text();let p: {message?:string;data?:{challengeId:string};detail?:string;error?:string}={};try{p=JSON.parse(raw);}catch{/* non-JSON backend response */}if(!r.ok)throw new Error(p.detail||p.message||p.error||`OTP service returned HTTP ${r.status}. Check Render backend deployment and DEMO_OTP_ENABLED.`);if(!p.data?.challengeId)throw new Error("OTP service returned an invalid response. Check Render backend deployment.");setHistoryChallenge(p.data.challengeId);}catch(e){setHistoryError(e instanceof TypeError?"Cannot connect to the OTP backend. Check Render status and CORS settings.":e instanceof Error?e.message:"Unable to request code");}finally{setHistoryBusy(false);}
  }
  async function verifyHistoryOtp(){setHistoryError("");setHistoryBusy(true);try{const r=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/customer/otp/verify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({challengeId:historyChallenge,code:historyCode})});const p=await r.json();if(!r.ok)throw new Error(p.message||"Verification failed");setHistoryToken(p.data.accessToken);setAuthPhone(historyPhone);localStorage.setItem("restaurantos_verified_"+qrToken,JSON.stringify({token:p.data.accessToken,phone:historyPhone,expiresAt:new Date(p.data.expiresAt).getTime()}));setHistoryChallenge("");setHistoryCode("");}catch(e){setHistoryError(e instanceof Error?e.message:"Verification failed");}finally{setHistoryBusy(false);}
  }
  const visibleOrders=Array.from(new Map([...guestOrders,...verifiedOrders].map(o=>[o.orderId,o])).values()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));


  useEffect(()=>{
    if(!qrToken)return;let cancelled=false;
    async function load(){
      setLoading(true);setError("");
      try{
        const response=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}`,{cache:"no-store"});
        const payload=await response.json();
        if(!response.ok||!payload.success)throw new Error(payload.message??"This table QR code is not available.");
        if(!cancelled)setMenu(payload.data);
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to load this restaurant menu.");}
      finally{if(!cancelled)setLoading(false);}
    }
    load();return()=>{cancelled=true;};
  },[qrToken]);

  const receiptOrderId=receipt?.orderId??"";
  const refreshReceiptStatus=useCallback(async()=>{
    if(!receiptOrderId||!qrToken)return;
    try{
      const response=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(receiptOrderId)}`,{cache:"no-store"});
      if(!response.ok)throw new Error("Status updates are temporarily unavailable.");
      const payload=await response.json();
      if(!payload.success)throw new Error(payload.message??"Unable to check order status.");
      setReceipt(current=>current&&current.orderId===receiptOrderId?{...current,status:payload.data.status}:current);
      setTrackingError("");
    }catch(e){setTrackingError(e instanceof Error?e.message:"Unable to check order status.");}
  },[receiptOrderId,qrToken]);
  useEffect(()=>{void refreshReceiptStatus();},[refreshReceiptStatus]);
  useGuestOrderEvents(qrToken,receiptOrderId,()=>{void refreshReceiptStatus();});

  const items=useMemo(()=>menu?.categories.flatMap(category=>category.items)??[],[menu]);
  const cartItems=items.filter(item=>(cart[item.id]??0)>0);
  const count=cartItems.reduce((sum,item)=>sum+(cart[item.id]??0),0);
  const total=cartItems.reduce((sum,item)=>sum+item.price*(cart[item.id]??0),0);
  function change(itemId:string,delta:number){setCart(current=>({...current,[itemId]:Math.min(20,Math.max(0,(current[itemId]??0)+delta))}));}

  useEffect(()=>{const read=()=>{const page=guestViewFromUrl(window.location.search,window.location.hash);const tracking=trackingOrderFromUrl(window.location.search);setTrackingId(tracking);setGuestPage(page);setOrdersOpen(page==="orders"&&!tracking);setCategoryOpen(false);setReceipt(null);setShowCart(false);setAuthOpen(false);setSelectedDish(null);};read();window.addEventListener("popstate",read);return()=>window.removeEventListener("popstate",read);},[qrToken]);
  useEffect(()=>{try{const saved=localStorage.getItem("restaurantos_guest_orders_"+qrToken);if(saved)setGuestOrders(JSON.parse(saved));}catch{/* ignore */}},[qrToken]);
  useEffect(()=>{
    if(!ordersOpen||!qrToken||guestOrders.length===0||Date.now()-lastOrdersRefresh.current<30000)return;
    let cancelled=false;const controller=new AbortController();
    async function refreshSavedOrders(){
      const candidates=guestOrders.slice(0,20);const updated:typeof guestOrders=[];
      for(let i=0;i<candidates.length&&!cancelled;i+=4){updated.push(...await Promise.all(candidates.slice(i,i+4).map(async order=>{
        try{
          const response=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(order.orderId)}`,{cache:"no-store",signal:controller.signal});
          if(!response.ok)return order;
          const payload=await response.json();
          return payload.success?{...order,status:payload.data.status}:order;
        }catch{return order;}
      })));}
      if(cancelled)return;lastOrdersRefresh.current=Date.now();
      setGuestOrders(current=>{
        const byId=new Map(updated.map(o=>[o.orderId,o.status]));
        const merged=current.map(o=>byId.has(o.orderId)?{...o,status:byId.get(o.orderId)!}:o);
        try{localStorage.setItem("restaurantos_guest_orders_"+qrToken,JSON.stringify(merged));}catch{/* storage unavailable */}
        return merged;
      });
    }
    refreshSavedOrders();return()=>{cancelled=true;controller.abort();};
  },[ordersOpen,qrToken]);
  useEffect(()=>{
    try{
      const saved=sessionStorage.getItem("restaurantos_guest_visit_"+qrToken);
      if(saved){const data=JSON.parse(saved);const now=Date.now();
        if(data.startedAt&&data.lastActivity&&now-data.lastActivity<4*60*60*1000&&now-data.startedAt<8*60*60*1000){
          if(typeof data.name==="string"){setAuthName(data.name);setProfileName(data.name);}
          if(typeof data.phone==="string")setAuthPhone(data.phone);
          return;
        }
        sessionStorage.removeItem("restaurantos_guest_visit_"+qrToken);
      }
    }catch{/* storage unavailable */}
    try{const saved=localStorage.getItem("restaurantos_guest_profile_"+qrToken);
      if(saved){const data=JSON.parse(saved);if(typeof data.name==="string"){setProfileName(data.name);setAuthName(data.name);}if(typeof data.phone==="string")setAuthPhone(data.phone);}
    }catch{/* storage unavailable */}
  },[qrToken]);
  const VISIT_MAX_MS=8*60*60*1000;
  function saveVisit(name:string,phone:string){
    try{const key="restaurantos_guest_visit_"+qrToken;const now=Date.now();const old=JSON.parse(sessionStorage.getItem(key)||"null");const startedAt=old?.phone===phone&&old?.startedAt&&now-old.startedAt<VISIT_MAX_MS?old.startedAt:now;sessionStorage.setItem(key,JSON.stringify({name,phone,startedAt,lastActivity:now}));}catch{/* storage unavailable */}
  }
  function saveGuestDetails(){
    const name=authName.trim();const phone=historyToken?historyPhone:authPhone;
    if(name.length<2){setAuthError("Please enter your full name.");return;}
    if(!/^[6-9][0-9]{9}$/.test(phone)){setAuthError("Enter a valid 10-digit Indian mobile number.");return;}
    saveVisit(name,phone);setProfileName(name);setAuthName(name);setAuthPhone(phone);
    try{localStorage.setItem("restaurantos_guest_profile_"+qrToken,JSON.stringify({name,phone}));}catch{/* storage unavailable */}
    setAuthError("");setAuthOpen(false);if(count>0)setShowCart(true);
  }
  async function placeOrder(){
    if(!menu||!count||submittingRef.current)return;
    const orderName=(profileName||authName).trim();
    const orderPhone=historyToken?historyPhone:authPhone;
    if(orderName.length<2||!/^[6-9][0-9]{9}$/.test(orderPhone)){setShowCart(false);setAuthName(orderName);setAuthPhone(orderPhone);setAuthError(orderName.length<2?"Please enter your name once to complete your profile.":"Enter a valid mobile number.");setAuthOpen(true);return;}
    submittingRef.current=true;setSubmitting(true);setOrderError("");
    try{
      const body=JSON.stringify({customerName:orderName,customerPhone:"+91"+orderPhone,notes:orderNotes.trim()||null,items:cartItems.map(item=>({menuItemId:item.id,quantity:cart[item.id]}))});
      // Reuse the same key after a timeout, so retrying cannot create a second order.
      const pendingKey="restaurantos_pending_order_"+qrToken;
      let idempotencyKey=crypto.randomUUID();
      try{
        const pending=JSON.parse(sessionStorage.getItem(pendingKey)||"null");
        if(pending?.body===body && typeof pending.key==="string")idempotencyKey=pending.key;
        sessionStorage.setItem(pendingKey,JSON.stringify({body,key:idempotencyKey}));
      }catch{/* storage may be unavailable */}
      const response=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders`,{method:"POST",headers:{"Content-Type":"application/json","Idempotency-Key":idempotencyKey},body});
      const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Could not place your order.");
      const placed={orderId:payload.data.orderId,orderNumber:payload.data.orderNumber,totalAmount:Number(payload.data.totalAmount),tableName:payload.data.tableName,status:payload.data.status,createdAt:new Date().toISOString()};
      try{sessionStorage.removeItem("restaurantos_pending_order_"+qrToken);}catch{/* storage unavailable */}
      saveVisit(orderName,orderPhone);setProfileName(orderName);setAuthName(orderName);setAuthPhone(orderPhone);
      try{localStorage.setItem("restaurantos_guest_profile_"+qrToken,JSON.stringify({name:orderName,phone:orderPhone}));}catch{/* storage unavailable */}
      setReceipt(placed);setGuestOrders(current=>{const updated=[placed,...current.filter(o=>o.orderId!==placed.orderId)].slice(0,50);try{localStorage.setItem("restaurantos_guest_orders_"+qrToken,JSON.stringify(updated));}catch{/* storage unavailable */}return updated;});setTrackingError("");setCart({});setShowCart(false);setOrderNotes("");
    }catch(e){setOrderError(e instanceof Error?e.message:"Unable to place your order.");}
    finally{submittingRef.current=false;setSubmitting(false);}
  }

  function signOutGuest(){setHistoryToken("");setVerifiedOrders([]);setHistoryChallenge("");setHistoryCode("");setHistoryError("");localStorage.removeItem("restaurantos_verified_"+qrToken);}
  function navigateGuest(page:GuestView){setTrackingId(null);setGuestPage(page);setOrdersOpen(page==="orders");setCategoryOpen(false);if(page==="menu")setActiveCategory("all");const href=guestViewHref(qrToken,page).replace(/^\/order\//,window.location.pathname.startsWith("/guest/order/")?"/guest/order/":"/order/");if(window.location.pathname+window.location.search!==href)window.history.replaceState(window.history.state,"",href);window.scrollTo({top:0,behavior:"instant"});}
  function openTracking(event:MouseEvent<HTMLAnchorElement>,orderId:string){
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();setTrackingId(orderId);setGuestPage("orders");setOrdersOpen(false);setReceipt(null);setShowCart(false);setAuthOpen(false);setSelectedDish(null);setCategoryOpen(false);
    const href=guestTrackingHref(qrToken,orderId).replace(/^\/order\//,window.location.pathname.startsWith("/guest/order/")?"/guest/order/":"/order/");if(window.location.pathname+window.location.search!==href)window.history.pushState(window.history.state,"",href);window.scrollTo({top:0,behavior:"instant"});
  }
  const syncTrackedOrder=useCallback((id:string,status:OrderStatus)=>{
    setGuestOrders(current=>{if(!current.some(o=>o.orderId===id&&o.status!==status.status))return current;const next=current.map(o=>o.orderId===id?{...o,status:status.status}:o);try{localStorage.setItem("restaurantos_guest_orders_"+qrToken,JSON.stringify(next));}catch{/* storage unavailable */}return next;});
    setVerifiedOrders(current=>current.some(o=>o.orderId===id&&o.status!==status.status)?current.map(o=>o.orderId===id?{...o,status:status.status}:o):current);
  },[qrToken]);
  const branding=resolveBranding(menu);
  const jump=(id:string)=>{setActiveCategory(id);setGuestPage("menu");setCategoryOpen(false);document.getElementById("guest-menu")?.scrollIntoView({behavior:"smooth"});};
  if(!menu)return <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-800"><div className="mx-auto max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 text-center"><p role={error?"alert":"status"} className="text-sm font-medium">{error||"Loading restaurant…"}</p>{error&&<p className="mt-2 text-xs text-neutral-600">Please scan the table QR code again or ask a staff member for help.</p>}</div></main>;
  return <main className="guest-theme min-h-screen pb-36" style={brandStyle(branding)}>
    <GuestPageHeader branding={branding} tableName={menu?.tableName}/>
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-8 sm:py-8">
      {trackingId?<GuestOrderTracking key={qrToken+":"+trackingId} qrToken={qrToken} orderId={trackingId} onNavigate={navigateGuest} onStatus={status=>syncTrackedOrder(trackingId,status)}/>:<>
      {loading?<div className="panel py-20 text-center text-sm text-[var(--guest-muted)]">Loading restaurant menu…</div>:error?<div className="panel px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-[var(--guest-radius)] bg-[var(--guest-error-surface)] text-[var(--guest-danger)]"><Utensils size={22}/></div><h1 className="mt-4 text-xl font-bold">Menu unavailable</h1><p className="mt-2 text-sm text-[var(--guest-muted)]">{error}</p><p className="mt-5 text-xs text-[var(--guest-muted)]">Please ask a staff member for help or scan the table QR code again.</p></div>:menu&&guestPage==="menu"&&<>
        <GuestBrandHero branding={branding} tableName={menu.tableName} compact/>
        <div id="guest-menu"/><label className="mb-4 flex items-center gap-3 rounded-[var(--guest-radius)] border border-[var(--guest-border)] bg-[var(--guest-surface)] px-4 py-3"><Search size={19} className="text-[var(--guest-muted)]"/><input aria-label="Search dishes" value={search} onChange={e=>setSearch(e.target.value)} placeholder="What are you craving?" className="w-full bg-transparent text-sm outline-none"/></label>
        <div className="mb-7 flex gap-2 overflow-x-auto pb-2"><button onClick={()=>setActiveCategory("all")} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold ${activeCategory==="all"?"bg-[var(--guest-accent)] text-[var(--guest-accent-text)]":"border bg-[var(--guest-surface)]"}`}>All dishes</button>{menu.categories.filter(c=>c.items.length>0).map(c=><button key={c.id} onClick={()=>setActiveCategory(c.id)} className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold ${activeCategory===c.id?"bg-[var(--guest-accent)] text-[var(--guest-accent-text)]":"border bg-[var(--guest-surface)]"}`}>{c.name}</button>)}</div>
        {menu.categories.filter(category=>(activeCategory==="all"||category.id===activeCategory)&&category.items.some(item=>!search||[item.name,item.description||""].join(" ").toLowerCase().includes(search.toLowerCase()))).map(category=><section key={category.id} className="mb-9"><div className="mb-4 flex items-center gap-3"><h2 className="min-w-0 text-lg font-bold tracking-tight text-[var(--guest-text)]">{category.name}</h2><span className="h-px flex-1 bg-[var(--guest-border)]"/><span className="text-[11px] font-semibold text-[var(--guest-muted)]">{category.items.length} items</span></div><div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-6">{category.items.filter(item=>!search||[item.name,item.description||""].join(" ").toLowerCase().includes(search.toLowerCase())).map(item=><GuestMenuDishCard key={item.id} item={item} quantity={cart[item.id]??0} onOpen={()=>setSelectedDish(item)} onChange={delta=>change(item.id,delta)}/>)}</div></section>)}
        {items.length===0&&<div className="panel py-12 text-center text-sm text-[var(--guest-muted)]">No items are currently available at this branch.</div>}
      </>}
      {menu&&guestPage==="home"&&<section className="mx-auto max-w-xl"><GuestBrandHero branding={branding} tableName={menu.tableName} onExplore={()=>navigateGuest("menu")}/>{branding.showFeatured&&<><div className="mt-7 flex items-end justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--guest-link)]">From our kitchen</p><h2 className="mt-1 text-xl font-bold">Explore the menu</h2></div><button onClick={()=>navigateGuest("menu")} className="text-xs font-bold text-[var(--guest-link)]">See all dishes →</button></div><div className="mt-4 grid grid-cols-2 gap-3">{items.slice(0,4).map(item=><GuestFeaturedDishCard key={item.id} item={item} quantity={cart[item.id]??0} onOpen={()=>setSelectedDish(item)} onChange={delta=>change(item.id,delta)}/>)}</div></>}<GuestBrandDetails branding={branding}/><div className="mt-8 rounded-[var(--guest-radius)] bg-[var(--guest-tint)] p-5"><h2 className="text-base font-extrabold text-[var(--guest-text)]">Ordering made easy</h2><p className="mt-2 text-sm leading-6 text-[var(--guest-muted)]">Explore dishes, add your favourites, and track every order right here from your table.</p><button onClick={()=>navigateGuest("menu")} className="mt-4 rounded-xl bg-[var(--guest-accent)] px-5 py-3 text-sm font-bold text-[var(--guest-accent-text)]">Browse menu</button></div></section>}
      {menu&&guestPage==="service"&&<GuestService qrToken={qrToken} tableName={menu.tableName} tableId={menu.tableId}/>}
      {menu&&guestPage==="orders"&&<section className="mx-auto max-w-xl"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-[var(--guest-link)]">{menu.restaurantName}</p><h1 className="mt-2 text-3xl font-black">My orders</h1><p className="mt-2 text-sm text-[var(--guest-muted)]">Track your orders and revisit your past meals.</p></div>{visibleOrders.length===0?<div className="rounded-[var(--guest-radius)] border bg-[var(--guest-surface)] p-8 text-center"><p>No orders found yet.</p><button className="mt-4 font-bold" style={{color:"var(--guest-link)"}} onClick={()=>navigateGuest("home")}>Explore the menu</button></div>:<div className="space-y-3">{visibleOrders.map(order=><Link key={order.orderId} href={guestTrackingHref(qrToken,order.orderId)} prefetch={false} onClick={event=>openTracking(event,order.orderId)} className="block rounded-[var(--guest-radius)] border bg-[var(--guest-surface)] p-5"><div className="flex items-center justify-between gap-3"><strong>{order.orderNumber}</strong><span className="text-xs font-bold" style={{color:"var(--guest-link)"}}>{order.status}</span></div><p className="mt-2 text-sm text-[var(--guest-muted)]">{order.tableName} · ₹{Number(order.totalAmount).toFixed(2)} · {new Date(order.createdAt).toLocaleDateString("en-IN")}</p><p className="mt-3 text-sm font-bold" style={{color:"var(--guest-link)"}}>Track order →</p></Link>)}</div>}<div className="mt-6 rounded-[var(--guest-radius)] border bg-[var(--guest-surface)] p-5"><h2 className="font-bold">Order history across devices</h2>{historyToken?<div className="mt-3 flex items-center gap-2 text-sm text-[var(--guest-success)]"><Check size={18}/><span>Phone verified · Your order history is synced</span></div>:<><p className="mt-2 text-sm text-[var(--guest-muted)]">Verify your number to retrieve your restaurant order history.</p><label className="mt-4 block text-sm font-semibold">Mobile number<input type="tel" inputMode="numeric" value={historyPhone} onChange={e=>setHistoryPhone(e.target.value.replace(/\D/g,"").slice(0,10))} className="mt-2 w-full rounded-xl border p-3" placeholder="10-digit mobile number"/></label>{historyChallenge?<><p className="mt-3 text-sm">Demo OTP: 123456 (valid for 5 minutes)</p><input aria-label="OTP code" value={historyCode} onChange={e=>setHistoryCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" maxLength={6} placeholder="6-digit OTP" className="mt-2 w-full rounded-xl border p-3"/><button disabled={historyBusy} onClick={()=>void verifyHistoryOtp()} style={{backgroundColor:"var(--guest-accent)",color:"var(--guest-accent-text)"}} className="mt-3 w-full rounded-xl p-3 font-bold text-white">Verify and view orders</button></>:<button disabled={historyBusy} onClick={()=>void requestHistoryOtp()} style={{backgroundColor:"var(--guest-accent)",color:"var(--guest-accent-text)"}} className="mt-3 w-full rounded-xl p-3 font-bold text-white">Get demo OTP</button>}</>}{historyError&&<p role="alert" className="mt-3 text-sm text-[var(--guest-danger)]">{historyError}</p>}</div></section>}
      {menu&&guestPage==="account"&&<section className="mx-auto max-w-xl"><p className="text-xs font-bold uppercase tracking-widest text-[var(--guest-link)]">{menu.restaurantName}</p><h1 className="mt-2 text-3xl font-black">My account</h1><div className="mt-6 overflow-hidden rounded-[var(--guest-radius)] border border-[var(--guest-border)] bg-[var(--guest-surface)] shadow-sm"><div className="h-20" style={{background:"linear-gradient(120deg,var(--guest-primary),var(--guest-accent))"}}/><div className="p-6"><div className="mb-6 flex items-center gap-4"><div className="-mt-10 grid h-16 w-16 shrink-0 place-items-center rounded-[var(--guest-radius)] border-4 border-[var(--guest-surface)] bg-[var(--guest-tint)] shadow-sm"><UserRound size={28}/></div><div><h2 className="text-xl font-extrabold">{profileName||authName||"Guest customer"}</h2><p className="text-sm text-[var(--guest-muted)]">{historyToken?"Phone verified":"Guest checkout profile"}</p></div></div>{historyToken?<><p className="text-sm">Verified mobile: <strong>+91 {historyPhone}</strong></p><button onClick={()=>navigateGuest("orders")} className="mt-5 w-full rounded-xl border p-3 font-bold">View my orders</button><button onClick={signOutGuest} className="mt-3 w-full rounded-xl border p-3 font-bold text-[var(--guest-danger)]">Sign out</button></>:<><p className="text-sm text-[var(--guest-muted)]">Your checkout details do not verify your identity. Verify your phone to access your orders on other devices.</p><button onClick={()=>navigateGuest("orders")} style={{backgroundColor:"var(--guest-accent)",color:"var(--guest-accent-text)"}} className="mt-5 w-full rounded-xl p-3 font-bold text-white">Verify phone number</button></>}<div className="mt-5 border-t pt-5"><p className="text-sm font-semibold">Checkout contact details</p><p className="mt-2 text-sm text-[var(--guest-muted)]">{profileName||authName||"Name not added"} · {authPhone?"+91 "+authPhone:"No phone saved"}</p><button className="mt-3 text-sm font-bold" style={{color:"var(--guest-link)"}} onClick={()=>{setAuthName(profileName||authName);setAuthOpen(true);}}>Edit checkout details</button></div></div></div></section>}
      <p className="mt-8 text-center text-[10px] text-[var(--guest-muted)]">Powered by RestaurantOS</p>
      </>}
    </div>
    {menu&&(guestPage==="home"||guestPage==="menu")&&count>0&&<div className="fixed inset-x-0 bottom-[72px] z-40 border-t border-[var(--guest-border)] bg-[var(--guest-surface)] p-4 shadow-lg"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3"><div><div className="text-xs font-bold">{count} {count===1?"item":"items"} in your cart</div><div className="mt-1 text-sm font-bold">₹{total.toFixed(2)}</div></div><button onClick={()=>setShowCart(true)} className="inline-flex items-center gap-2 rounded-full bg-[var(--guest-accent)] px-6 py-3 text-sm font-bold text-[var(--guest-accent-text)]"><ShoppingBag size={15}/> View cart</button></div></div>}
    {menu&&!loading&&<>{guestPage==="menu"&&<button aria-label="Browse categories" onClick={()=>setCategoryOpen(true)} style={{backgroundColor:"var(--guest-accent)",color:"var(--guest-accent-text)"}} className="fixed bottom-[160px] right-4 z-30 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-[var(--guest-accent-text)] shadow-xl"><List size={18}/> Categories</button>}<GuestBottomNav qrToken={qrToken} active={guestPage} onNavigate={navigateGuest}/>{categoryOpen&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--guest-overlay)]" onClick={()=>setCategoryOpen(false)}><section role="dialog" aria-modal="true" aria-label="Menu categories" onClick={e=>e.stopPropagation()} className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--guest-surface)] p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">Explore categories</h2><button aria-label="Close categories" onClick={()=>setCategoryOpen(false)}><X/></button></div>{[{id:"all",name:"All dishes",items:items},...menu.categories].filter(c=>c.items.length>0).map(c=><button key={c.id} onClick={()=>jump(c.id)} className="flex w-full items-center justify-between border-b border-[var(--guest-border)] py-4 text-left font-semibold"><span>{c.name} <span className="ml-2 text-xs font-normal text-[var(--guest-muted)]">{c.items.length} dishes</span></span>{activeCategory===c.id&&<Check size={17}/>}</button>)}</section></div>}</>}
    {false&&ordersOpen&&<div className="fixed inset-0 z-[55] flex items-end justify-center bg-[var(--guest-overlay)] sm:items-center sm:p-4" onClick={()=>setOrdersOpen(false)}><section role="dialog" aria-modal="true" aria-label="My orders" className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-[var(--guest-surface)] p-6 sm:rounded-[28px]" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[var(--guest-link)]">{menu?.restaurantName}</p><h2 className="mt-2 text-2xl font-black">My orders</h2></div><button aria-label="Close orders" onClick={()=>setOrdersOpen(false)} className="rounded-full border p-2"><X size={19}/></button></div><p className="mt-3 text-sm text-[var(--guest-muted)]">Orders placed on this browser for this table.</p>{visibleOrders.length===0?<p className="mt-8 rounded-[var(--guest-radius)] border bg-[var(--guest-surface)] p-6 text-center text-sm text-[var(--guest-muted)]">No orders yet. Explore the menu and place your first order.</p>:<div className="mt-5 space-y-3">{visibleOrders.map(order=><Link key={order.orderId} href={guestTrackingHref(qrToken,order.orderId)} prefetch={false} onClick={event=>openTracking(event,order.orderId)} className="block rounded-[var(--guest-radius)] border bg-[var(--guest-surface)] p-4"><div className="flex items-center justify-between gap-3"><span className="font-bold">{order.orderNumber}</span><span style={{color:"var(--guest-link)"}} className="text-xs font-bold">{order.status}</span></div><div className="mt-2 text-xs text-[var(--guest-muted)]">{order.tableName} · ₹{Number(order.totalAmount).toFixed(2)} · {new Date(order.createdAt).toLocaleDateString("en-IN")}</div><div className="mt-3 text-sm font-bold" style={{color:"var(--guest-link)"}}>Track order →</div></Link>)}</div>}<div className="mt-5 rounded-[var(--guest-radius)] border bg-[var(--guest-surface)] p-4"><h3 className="text-sm font-bold">Recover orders from other devices</h3><p className="mt-1 text-xs text-[var(--guest-muted)]">Verify your mobile number to view orders from this restaurant.</p>{historyToken?<div className="mt-3 flex items-center justify-between gap-2 text-xs"><span>Verified: {historyPhone}</span><button style={{color:"var(--guest-link)"}} onClick={()=>{setHistoryToken("");setVerifiedOrders([]);localStorage.removeItem("restaurantos_verified_"+qrToken);}} className="font-bold">Sign out</button></div>:<><label className="mt-3 block text-xs font-semibold">Mobile number<input type="tel" inputMode="numeric" value={historyPhone} onChange={e=>setHistoryPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number" className="mt-1 w-full rounded-xl border p-3" /></label>{historyChallenge?<><p className="mt-2 text-xs">Demo OTP: 123456 (expires in 5 minutes)</p><input aria-label="Verification code" inputMode="numeric" maxLength={6} value={historyCode} onChange={e=>setHistoryCode(e.target.value.replace(/\D/g,"").slice(0,6))} className="mt-2 w-full rounded-xl border p-3" placeholder="6-digit code"/><button disabled={historyBusy} onClick={()=>void verifyHistoryOtp()} style={{backgroundColor:"var(--guest-accent)",color:"var(--guest-accent-text)"}} className="mt-2 w-full rounded-xl p-3 text-sm font-bold text-white">Verify and recover</button></>:<button disabled={historyBusy} onClick={()=>void requestHistoryOtp()} style={{backgroundColor:"var(--guest-accent)",color:"var(--guest-accent-text)"}} className="mt-3 w-full rounded-xl p-3 text-sm font-bold text-white">Get demo OTP</button>}</>}{historyError&&<p role="alert" className="mt-2 text-xs text-[var(--guest-danger)]">{historyError}</p>}</div><p className="mt-4 text-xs text-[var(--guest-muted)]">Saved orders on this device appear without verification. Complete history requires phone verification.</p></section></div>}
    {authOpen&&<div className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--guest-overlay)] sm:items-center sm:p-4" onClick={()=>setAuthOpen(false)}><section role="dialog" aria-modal="true" aria-label="Guest details" className="w-full max-w-md rounded-t-[30px] bg-[var(--guest-surface)] p-6 shadow-2xl sm:rounded-[30px]" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[var(--guest-link)]">{menu?.restaurantName}</p><h2 className="mt-2 text-2xl font-black">Your details</h2></div><button aria-label="Close" onClick={()=>setAuthOpen(false)} className="rounded-full border p-2"><X size={19}/></button></div><p className="mt-3 text-sm leading-6 text-[var(--guest-muted)]">Enter your name and mobile number to order. No OTP required.</p><label className="mt-5 block text-sm font-semibold">Full name<input autoComplete="name" value={authName} onChange={e=>setAuthName(e.target.value)} maxLength={120} placeholder="Your full name" className="mt-2 w-full rounded-xl border bg-[var(--guest-surface)] p-3 font-normal outline-none"/></label><label className="mt-5 block text-sm font-semibold">Mobile number<div className="mt-2 flex items-center gap-2 rounded-xl border bg-[var(--guest-surface)] px-3"><span className="border-r pr-3 text-sm text-[var(--guest-muted)]">+91</span><input type="tel" inputMode="numeric" autoComplete="tel-national" value={authPhone} onChange={e=>setAuthPhone(e.target.value.replace(/\D/g,"").slice(0,10))} maxLength={10} placeholder="10-digit mobile number" className="w-full py-3 font-normal outline-none"/></div></label>{authError&&<p role="alert" className="mt-4 rounded-xl bg-[var(--guest-error-surface)] p-3 text-sm text-[var(--guest-danger)]">{authError}</p>}<button onClick={saveGuestDetails} className="mt-6 w-full rounded-[var(--guest-radius)] bg-[var(--guest-accent)] p-4 font-bold text-[var(--guest-accent-text)]">Continue without OTP</button><p className="mt-4 text-center text-xs text-[var(--guest-muted)]">Your number is saved as contact information, not verified identity.</p></section></div>}
    {receipt&&<div className="fixed inset-0 z-50 grid place-items-center bg-[var(--guest-overlay)] p-4"><section role="dialog" aria-modal="true" aria-label="Order confirmation" className="w-full max-w-sm rounded-[var(--guest-radius)] bg-[var(--guest-surface)] p-7 text-center shadow-2xl"><div style={{color:"var(--guest-link)"}} className="mx-auto grid h-14 w-14 place-items-center rounded-[var(--guest-radius)] bg-[var(--guest-tint)]"><ShoppingBag size={22}/></div><div className="eyebrow mt-5">Order received</div><h2 className="mt-2 text-2xl font-bold">You’re all set.</h2><p className="mt-2 text-sm text-[var(--guest-muted)]">Your order has been sent to the restaurant team. Status updates automatically while this window is open.</p><div className="my-5 rounded-xl bg-[var(--guest-soft)] p-4"><div className="text-[10px] uppercase tracking-wider text-[var(--guest-muted)]">Order number</div><div className="mt-1 text-xl font-bold">{receipt.orderNumber}</div><div className="mt-2 text-xs text-[var(--guest-muted)]">{receipt.tableName} · ₹{receipt.totalAmount.toFixed(2)}</div></div><div aria-live="polite" className="mb-4 rounded-xl border border-[var(--guest-border)] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--guest-muted)]">Live order status</div><div style={{color:"var(--guest-link)"}} className="mt-1 text-sm font-bold">{{NEW:"Received",ACCEPTED:"Accepted by restaurant",PREPARING:"Preparing your food",READY:"Ready to serve",SERVED:"Served",CANCELLED:"Cancelled"}[receipt.status]??receipt.status}</div>{trackingError&&<p role="status" className="mt-2 text-xs text-[var(--guest-danger)]">{trackingError}</p>}</div><Link href={guestTrackingHref(qrToken,receipt.orderId)} prefetch={false} onClick={event=>openTracking(event,receipt.orderId)} style={{backgroundColor:"var(--guest-accent)",color:"var(--guest-accent-text)"}} className="mb-3 block w-full rounded-[var(--guest-radius)] px-5 py-4 text-center font-bold text-white">Track my order</Link><button onClick={()=>setReceipt(null)} className="ghost-button w-full">Back to menu</button></section></div>}
    {selectedDish&&<div className="fixed inset-0 z-[60] flex items-end justify-center bg-[var(--guest-overlay)] p-0 sm:items-center sm:p-4" onClick={()=>setSelectedDish(null)}><section role="dialog" aria-modal="true" aria-label={selectedDish.name} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[var(--guest-surface)] pb-6 sm:rounded-[var(--guest-radius)]" onClick={e=>e.stopPropagation()}><div className="relative aspect-[16/10] bg-gradient-to-br from-[var(--guest-soft)] to-[var(--guest-tint)]">{selectedDish.imageUrl?<img src={selectedDish.imageUrl} alt={selectedDish.name} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center"><Utensils size={64} className="text-[var(--guest-muted)]"/></div>}<button aria-label="Close dish details" onClick={()=>setSelectedDish(null)} className="absolute right-4 top-4 rounded-full bg-[var(--guest-surface)] p-2 shadow-lg"><X size={19}/></button></div><div className="px-5 pt-5"><div className="flex items-start justify-between gap-3"><h2 className="min-w-0 flex-1 text-2xl font-black text-[var(--guest-text)]">{selectedDish.name}</h2><span role="img" aria-label={selectedDish.dietaryType==="VEG"?"Vegetarian":selectedDish.dietaryType==="EGG"?"Contains egg":"Non-vegetarian"} title={selectedDish.dietaryType==="VEG"?"Vegetarian":selectedDish.dietaryType==="EGG"?"Contains egg":"Non-vegetarian"} className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[2px] border-2 ${selectedDish.dietaryType==="VEG"?"border-[#238c4a]":selectedDish.dietaryType==="EGG"?"border-[#eab308]":"border-[#b43c34]"}`}><span className={`h-[7px] w-[7px] rounded-full ${selectedDish.dietaryType==="VEG"?"bg-[#238c4a]":selectedDish.dietaryType==="EGG"?"bg-[#eab308]":"bg-[#b43c34]"}`}/></span></div><p className="mt-2 text-sm leading-6 text-[var(--guest-muted)]">{selectedDish.description||"Freshly prepared by the restaurant."}</p><div className="mt-4 flex items-center gap-4 text-sm text-[var(--guest-muted)]"><span><Clock3 size={15} className="mr-1 inline"/>{selectedDish.prepTimeMinutes} min</span><span>{selectedDish.dietaryType==="VEG"?"Vegetarian":selectedDish.dietaryType==="EGG"?"Contains egg":"Non-vegetarian"}</span></div><div className="mt-6 flex items-center justify-between"><span className="text-xl font-extrabold">₹{Number(selectedDish.price).toFixed(2)}</span>{(cart[selectedDish.id]??0)===0?<button onClick={()=>change(selectedDish.id,1)} className="rounded-xl bg-[var(--guest-accent)] px-7 py-3 text-sm font-bold text-[var(--guest-accent-text)]">Add to cart +</button>:<div className="flex items-center gap-5 rounded-xl bg-[var(--guest-accent)] px-4 py-3 font-bold text-[var(--guest-accent-text)]"><button onClick={()=>change(selectedDish.id,-1)} aria-label="Remove one"><Minus size={18}/></button>{cart[selectedDish.id]}<button onClick={()=>change(selectedDish.id,1)} disabled={(cart[selectedDish.id]??0)>=20} aria-label="Add one"><Plus size={18}/></button></div>}</div></div></section></div>}
    {showCart&&menu&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--guest-overlay)] p-0 sm:items-center sm:p-4" onClick={()=>setShowCart(false)}><section role="dialog" aria-modal="true" aria-label="Your cart" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-[var(--guest-surface)] p-5 sm:rounded-[var(--guest-radius)]" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><div className="eyebrow">{menu.tableName}</div><h2 className="mt-1 text-xl font-bold">Your order</h2></div><button onClick={()=>setShowCart(false)} className="ghost-button">Close</button></div><div className="my-5 divide-y divide-[var(--guest-border)]">{cartItems.map(item=><div key={item.id} className="flex items-start justify-between gap-3 py-4"><div className="min-w-0 flex-1"><div className="text-sm font-semibold">{item.name}</div><div className="mt-1 text-xs text-[var(--guest-muted)]">₹{Number(item.price).toFixed(2)} each</div><button type="button" onClick={()=>change(item.id,-(cart[item.id]??0))} aria-label={`Remove ${item.name} from cart`} className="mt-2 text-xs font-semibold text-[var(--guest-danger)] underline underline-offset-2">Remove</button></div><div className="flex shrink-0 flex-col items-end gap-2"><div className="text-sm font-bold">₹{(item.price*cart[item.id]).toFixed(2)}</div><div className="flex items-center gap-3 rounded-lg border border-[var(--guest-accent)] bg-[var(--guest-surface)] px-2 py-1.5 text-[var(--guest-primary-link)]"><button type="button" onClick={()=>change(item.id,-1)} aria-label={`Decrease ${item.name} quantity`} className="grid h-7 w-7 place-items-center"><Minus size={16}/></button><span className="min-w-4 text-center text-sm font-bold">{cart[item.id]}</span><button type="button" onClick={()=>change(item.id,1)} disabled={(cart[item.id]??0)>=20} aria-label={`Increase ${item.name} quantity`} className="grid h-7 w-7 place-items-center disabled:opacity-40"><Plus size={16}/></button></div></div></div>)}</div><div className="flex justify-between border-t border-[var(--guest-border)] pt-4 text-sm font-bold"><span>Total</span><span>₹{total.toFixed(2)}</span></div><div className="mt-5 space-y-3"><div className="rounded-xl bg-[var(--guest-soft)] px-4 py-3 text-sm"><p className="font-semibold text-[var(--guest-text)]">{profileName||authName||"Guest checkout"}</p><p className="mt-1 text-xs text-[var(--guest-muted)]">{historyToken?"Verified mobile":"Contact mobile"}: +91 {historyToken?historyPhone:authPhone||"Not added"}</p>{!(profileName||authName)&&<p className="mt-1 text-xs">You will be asked for your name once before ordering.</p>}</div><label className="block"><span className="text-xs font-semibold text-[var(--guest-muted)]">Special instructions (optional)</span><textarea value={orderNotes} onChange={e=>setOrderNotes(e.target.value)} placeholder="Allergies or preparation notes" maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-[var(--guest-border)] bg-[var(--guest-surface)] px-4 py-3 text-sm outline-none"/></label></div>{orderError&&<p role="alert" className="mt-3 rounded-lg bg-[var(--guest-error-surface)] px-3 py-2 text-xs text-[var(--guest-danger)]">{orderError}</p>}<button onClick={()=>void placeOrder()} disabled={submitting||!count} className="mt-5 w-full rounded-[var(--guest-radius)] bg-[var(--guest-accent)] px-5 py-4 font-bold text-[var(--guest-accent-text)] disabled:opacity-50">{submitting?"Placing order…":"Place order · ₹"+total.toFixed(2)}</button></section></div>}
  </main>;
}
