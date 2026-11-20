"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Utensils, Search, Clock3, List, Home, BookOpen, ReceiptText, UserRound, X, Check } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Item={id:string;name:string;description?:string;price:number;dietaryType:string;prepTimeMinutes:number};
type Category={id:string;name:string;items:Item[]};
type Menu={tableId:string;tableName:string;branchName:string;restaurantName:string;categories:Category[];slogan?:string;logoUrl?:string;bannerUrl?:string;theme?:string};

export default function GuestOrderPage(){
  const params=useParams<{qrToken:string}>();
  const qrToken=params.qrToken;
  const [menu,setMenu]=useState<Menu|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [cart,setCart]=useState<Record<string,number>>({});
  const [search,setSearch]=useState("");
  const [activeCategory,setActiveCategory]=useState("all");
  const [categoryOpen,setCategoryOpen]=useState(false);
  const [authOpen,setAuthOpen]=useState(false);
  const [authPhone,setAuthPhone]=useState("");
  const [authName,setAuthName]=useState("");
  const [authError,setAuthError]=useState("");
  const [showCart,setShowCart]=useState(false);
  const [customerName,setCustomerName]=useState("");
  const [orderNotes,setOrderNotes]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [orderError,setOrderError]=useState("");
  const [receipt,setReceipt]=useState<{orderId:string;orderNumber:string;totalAmount:number;tableName:string;status:string}|null>(null);
  const [trackingError,setTrackingError]=useState("");
  const [ordersOpen,setOrdersOpen]=useState(false);
  const [guestPage,setGuestPage]=useState<"home"|"orders"|"account">("home");
  const [guestOrders,setGuestOrders]=useState<{orderId:string;orderNumber:string;totalAmount:number;tableName:string;status:string;createdAt:string}[]>([]);
  const [historyPhone,setHistoryPhone]=useState("");
  const [historyChallenge,setHistoryChallenge]=useState("");
  const [historyCode,setHistoryCode]=useState("");
  const [historyToken,setHistoryToken]=useState("");
  const [historyError,setHistoryError]=useState("");
  const [historyBusy,setHistoryBusy]=useState(false);
  const [verifiedOrders,setVerifiedOrders]=useState<typeof guestOrders>([]);
  useEffect(()=>{try{const s=JSON.parse(localStorage.getItem("restaurantos_verified_"+qrToken)||"null");if(s&&s.expiresAt>Date.now()){setHistoryToken(s.token);setHistoryPhone(s.phone);setAuthPhone(s.phone);}}catch{/* ignore */}},[qrToken]);
  useEffect(()=>{if(!ordersOpen||!historyToken)return;let cancelled=false;
    fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/customer/orders`,{headers:{Authorization:"Bearer "+historyToken},cache:"no-store"})
    .then(async r=>{if(!r.ok)throw new Error("Verification expired. Please verify again.");return r.json();})
    .then(p=>{if(!cancelled)setVerifiedOrders(p.data.map((o:typeof guestOrders[number])=>({...o,totalAmount:Number(o.totalAmount)})));})
    .catch(e=>{if(!cancelled){setHistoryError(e.message);setHistoryToken("");setVerifiedOrders([]);localStorage.removeItem("restaurantos_verified_"+qrToken);}});
    return()=>{cancelled=true;};
  },[ordersOpen,historyToken,qrToken]);
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

  useEffect(()=>{
    if(!receipt?.orderId||!qrToken)return;
    let cancelled=false;
    async function refreshStatus(){
      try{
        const response=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(receipt!.orderId)}`,{cache:"no-store"});
        if(!response.ok)throw new Error("Status updates are temporarily unavailable.");
        const payload=await response.json();
        if(!payload.success)throw new Error(payload.message??"Unable to check order status.");
        if(!cancelled){
          setReceipt(current=>current&&current.orderId===receipt!.orderId?{...current,status:payload.data.status}:current);
          setTrackingError("");
        }
      }catch(e){if(!cancelled)setTrackingError(e instanceof Error?e.message:"Unable to check order status.");}
    }
    refreshStatus();
    const timer=window.setInterval(refreshStatus,10000);
    return()=>{cancelled=true;window.clearInterval(timer);};
  },[receipt?.orderId,qrToken]);

  const items=useMemo(()=>menu?.categories.flatMap(category=>category.items)??[],[menu]);
  const cartItems=items.filter(item=>(cart[item.id]??0)>0);
  const count=cartItems.reduce((sum,item)=>sum+(cart[item.id]??0),0);
  const total=cartItems.reduce((sum,item)=>sum+item.price*(cart[item.id]??0),0);
  function change(itemId:string,delta:number){setCart(current=>({...current,[itemId]:Math.min(20,Math.max(0,(current[itemId]??0)+delta))}));}

  useEffect(()=>{if(new URLSearchParams(window.location.search).get("view")==="orders"){setOrdersOpen(true);window.history.replaceState(null,"",window.location.pathname);}},[]);
  useEffect(()=>{try{const saved=localStorage.getItem("restaurantos_guest_orders_"+qrToken);if(saved)setGuestOrders(JSON.parse(saved));}catch{/* ignore */}},[qrToken]);
  useEffect(()=>{
    if(!ordersOpen||!qrToken||guestOrders.length===0)return;
    let cancelled=false;
    async function refreshSavedOrders(){
      const updated=await Promise.all(guestOrders.slice(0,20).map(async order=>{
        try{
          const response=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders/${encodeURIComponent(order.orderId)}`,{cache:"no-store"});
          if(!response.ok)return order;
          const payload=await response.json();
          return payload.success?{...order,status:payload.data.status}:order;
        }catch{return order;}
      }));
      if(cancelled)return;
      setGuestOrders(current=>{
        const byId=new Map(updated.map(o=>[o.orderId,o.status]));
        const merged=current.map(o=>byId.has(o.orderId)?{...o,status:byId.get(o.orderId)!}:o);
        try{localStorage.setItem("restaurantos_guest_orders_"+qrToken,JSON.stringify(merged));}catch{/* storage unavailable */}
        return merged;
      });
    }
    refreshSavedOrders();return()=>{cancelled=true;};
  },[ordersOpen,qrToken]);
  useEffect(()=>{try{const saved=sessionStorage.getItem("restaurantos_guest_contact");if(saved){const data=JSON.parse(saved);if(typeof data.name==="string")setAuthName(data.name);if(typeof data.phone==="string")setAuthPhone(data.phone);}}catch{/* ignore */}},[]);
  function saveGuestDetails(){
    if(authName.trim().length<2){setAuthError("Please enter your full name.");return;}
    if(!/^[6-9][0-9]{9}$/.test(authPhone)){setAuthError("Enter a valid 10-digit Indian mobile number.");return;}
    sessionStorage.setItem("restaurantos_guest_contact",JSON.stringify({name:authName.trim(),phone:authPhone}));
    setCustomerName(authName.trim());setAuthError("");setAuthOpen(false);
    if(count>0)setShowCart(true);
  }
  async function placeOrder(){
    if(!menu||!count||submitting)return;if(authName.trim().length<2||!/^[6-9][0-9]{9}$/.test(authPhone)){setShowCart(false);setAuthOpen(true);return;}setSubmitting(true);setOrderError("");
    try{
      const response=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerName:authName.trim(),customerPhone:"+91"+authPhone,notes:orderNotes.trim()||null,items:cartItems.map(item=>({menuItemId:item.id,quantity:cart[item.id]}))})});
      const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Could not place your order.");
      const placed={orderId:payload.data.orderId,orderNumber:payload.data.orderNumber,totalAmount:Number(payload.data.totalAmount),tableName:payload.data.tableName,status:payload.data.status,createdAt:new Date().toISOString()};
      setReceipt(placed);setGuestOrders(current=>{const updated=[placed,...current.filter(o=>o.orderId!==placed.orderId)].slice(0,50);try{localStorage.setItem("restaurantos_guest_orders_"+qrToken,JSON.stringify(updated));}catch{/* storage unavailable */}return updated;});setTrackingError("");setCart({});setShowCart(false);setCustomerName("");setOrderNotes("");
    }catch(e){setOrderError(e instanceof Error?e.message:"Unable to place your order.");}
    finally{setSubmitting(false);}
  }

  function signOutGuest(){setHistoryToken("");setVerifiedOrders([]);setHistoryChallenge("");setHistoryCode("");setHistoryError("");localStorage.removeItem("restaurantos_verified_"+qrToken);}
  function navigateGuest(page:"home"|"orders"|"account"){setGuestPage(page);setOrdersOpen(page==="orders");setCategoryOpen(false);window.scrollTo({top:0,behavior:"smooth"});}
  const accent=menu?.theme==="BOLD"?"#a54225":menu?.theme==="MINIMAL"?"#3d4540":"#243128";
  const jump=(id:string)=>{setActiveCategory(id);setCategoryOpen(false);document.getElementById("guest-menu")?.scrollIntoView({behavior:"smooth"});};
  return <main className="min-h-screen bg-[#fffaf4] pb-36 text-[#292820]">
    <header style={{backgroundColor:accent}} className="px-5 py-5 text-white"><div className="mx-auto max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e8c9a1]">Freshly made · Served with care</p><div className="mt-1 flex items-center gap-2 text-sm font-semibold">{menu?.logoUrl?<img src={menu.logoUrl} alt={menu.restaurantName+" logo"} className="h-10 w-10 rounded-full bg-white object-cover"/>:<Utensils size={17}/>} {menu?.restaurantName||"Your table, your menu"}</div></div></header>
    <div className="mx-auto max-w-3xl px-4 py-7 sm:px-8 sm:py-10">
      {loading?<div className="panel py-20 text-center text-sm text-[#99998f]">Loading restaurant menu…</div>:error?<div className="panel px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fbede7] text-[#c65e3d]"><Utensils size={22}/></div><h1 className="mt-4 text-xl font-bold">Menu unavailable</h1><p className="mt-2 text-sm text-[#85867d]">{error}</p><p className="mt-5 text-xs text-[#aaa99f]">Please ask a staff member for help or scan the table QR code again.</p></div>:menu&&guestPage==="home"&&<>
        <div style={{backgroundColor:accent,backgroundImage:menu.bannerUrl?`linear-gradient(90deg,rgba(0,0,0,.68),rgba(0,0,0,.32)),url("${menu.bannerUrl.replaceAll('"','%22')}")`:undefined,backgroundSize:"cover",backgroundPosition:"center"}} className="mb-8 overflow-hidden rounded-[28px] px-6 py-9 text-white shadow-lg"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#e6c69e]">Welcome to {menu.tableName}</p><h1 className="mt-3 text-4xl font-black tracking-tight">{menu.restaurantName}</h1><p className="mt-3 text-sm text-[#d4dfd0]">{menu.branchName} · {menu.slogan||"Enjoy exploring our menu"}</p></div>
        <div id="guest-menu"/><label className="mb-4 flex items-center gap-3 rounded-2xl border border-[#e9e0d2] bg-white px-4 py-3"><Search size={19} className="text-[#9a806b]"/><input aria-label="Search dishes" value={search} onChange={e=>setSearch(e.target.value)} placeholder="What are you craving?" className="w-full bg-transparent text-sm outline-none"/></label>
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2"><button onClick={()=>setActiveCategory("all")} className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold ${activeCategory==="all"?"bg-[#243128] text-white":"border bg-white"}`}>All dishes</button>{menu.categories.filter(c=>c.items.length>0).map(c=><button key={c.id} onClick={()=>setActiveCategory(c.id)} className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold ${activeCategory===c.id?"bg-[#243128] text-white":"border bg-white"}`}>{c.name}</button>)}</div>
        {menu.categories.filter(c=>(activeCategory==="all"||c.id===activeCategory)&&c.items.some(i=>!search||[i.name,i.description||""].join(" ").toLowerCase().includes(search.toLowerCase()))).map(category=><section key={category.id} className="mb-5 overflow-hidden rounded-3xl border border-[#e9e0d2] bg-white shadow-[0_6px_24px_rgba(60,40,20,.04)]"><div className="border-b border-[#eeeae2] px-5 py-4"><h2 className="font-bold">{category.name}</h2><p className="mt-1 text-[11px] text-[#99998f]">{category.items.length} items</p></div>{category.items.length===0?<p className="px-5 py-6 text-xs text-[#99998f]">No items currently available.</p>:<div className="divide-y divide-[#f0ede6]">{category.items.filter(i=>!search||[i.name,i.description||""].join(" ").toLowerCase().includes(search.toLowerCase())).map(item=><div key={item.id} className="flex items-center gap-3 px-5 py-4"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-sm border-2 ${item.dietaryType==="VEG"?"border-[#527a5b]":item.dietaryType==="EGG"?"border-[#b88a37]":"border-[#c65e3d]"}`}/><h3 className="text-sm font-bold">{item.name}</h3></div>{item.description&&<p className="mt-1 text-xs leading-5 text-[#85867d]">{item.description}</p>}<div className="mt-2 text-sm font-bold tabular-nums">₹{Number(item.price).toFixed(2)} <span className="ml-1 text-[10px] font-normal text-[#99998f]">· {item.prepTimeMinutes} min</span></div></div><div className="flex items-center gap-2">{(cart[item.id]??0)>0&&<button onClick={()=>change(item.id,-1)} aria-label={`Remove one ${item.name}`} className="grid h-9 w-9 place-items-center rounded-full border border-[#e4dfd4]"><Minus size={14}/></button>}<span className="w-4 text-center text-xs font-bold">{cart[item.id]??0}</span><button onClick={()=>change(item.id,1)} aria-label={`Add one ${item.name}`} disabled={(cart[item.id]??0)>=20} className="grid h-9 w-9 place-items-center rounded-full bg-[#243128] text-white disabled:opacity-40"><Plus size={14}/></button></div></div>)}</div>}</section>)}
        {items.length===0&&<div className="panel py-12 text-center text-sm text-[#99998f]">No items are currently available at this branch.</div>}
      </>}
      {menu&&guestPage==="orders"&&<section className="mx-auto max-w-xl"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-[#9e8064]">{menu.restaurantName}</p><h1 className="mt-2 text-3xl font-black">My orders</h1><p className="mt-2 text-sm text-[#766e63]">Your orders at this restaurant, across visits and devices after verification.</p></div>{visibleOrders.length===0?<div className="rounded-2xl border bg-white p-8 text-center"><p>No orders found yet.</p><button className="mt-4 font-bold" style={{color:accent}} onClick={()=>navigateGuest("home")}>Explore the menu</button></div>:<div className="space-y-3">{visibleOrders.map(order=><Link key={order.orderId} href={`/order/${encodeURIComponent(qrToken)}/track/${encodeURIComponent(order.orderId)}`} className="block rounded-2xl border bg-white p-5"><div className="flex items-center justify-between gap-3"><strong>{order.orderNumber}</strong><span className="text-xs font-bold" style={{color:accent}}>{order.status}</span></div><p className="mt-2 text-sm text-[#766e63]">{order.tableName} · ₹{Number(order.totalAmount).toFixed(2)} · {new Date(order.createdAt).toLocaleDateString("en-IN")}</p><p className="mt-3 text-sm font-bold" style={{color:accent}}>Track order →</p></Link>)}</div>}<div className="mt-6 rounded-2xl border bg-white p-5"><h2 className="font-bold">Order history across devices</h2>{historyToken?<div className="mt-3 flex items-center justify-between gap-2 text-sm"><span>Verified: +91 {historyPhone}</span><button className="font-bold" style={{color:accent}} onClick={signOutGuest}>Sign out</button></div>:<><p className="mt-2 text-sm text-[#766e63]">Verify your number to retrieve your restaurant order history.</p><label className="mt-4 block text-sm font-semibold">Mobile number<input type="tel" inputMode="numeric" value={historyPhone} onChange={e=>setHistoryPhone(e.target.value.replace(/\D/g,"").slice(0,10))} className="mt-2 w-full rounded-xl border p-3" placeholder="10-digit mobile number"/></label>{historyChallenge?<><p className="mt-3 text-sm">Demo OTP: 123456 (valid for 5 minutes)</p><input aria-label="OTP code" value={historyCode} onChange={e=>setHistoryCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" maxLength={6} placeholder="6-digit OTP" className="mt-2 w-full rounded-xl border p-3"/><button disabled={historyBusy} onClick={()=>void verifyHistoryOtp()} style={{backgroundColor:accent}} className="mt-3 w-full rounded-xl p-3 font-bold text-white">Verify and view orders</button></>:<button disabled={historyBusy} onClick={()=>void requestHistoryOtp()} style={{backgroundColor:accent}} className="mt-3 w-full rounded-xl p-3 font-bold text-white">Get demo OTP</button>}</>}{historyError&&<p role="alert" className="mt-3 text-sm text-red-700">{historyError}</p>}</div></section>}
      {menu&&guestPage==="account"&&<section className="mx-auto max-w-xl"><p className="text-xs font-bold uppercase tracking-widest text-[#9e8064]">{menu.restaurantName}</p><h1 className="mt-2 text-3xl font-black">My account</h1><div className="mt-6 rounded-2xl border bg-white p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#eaf2e9]"><UserRound/></div><div><h2 className="font-bold">{authName||"Guest customer"}</h2><p className="text-sm text-[#766e63]">{historyToken?"Phone verified":"Guest checkout profile"}</p></div></div>{historyToken?<><p className="text-sm">Verified mobile: <strong>+91 {historyPhone}</strong></p><button onClick={()=>navigateGuest("orders")} className="mt-5 w-full rounded-xl border p-3 font-bold">View my orders</button><button onClick={signOutGuest} className="mt-3 w-full rounded-xl border p-3 font-bold text-red-700">Sign out</button></>:<><p className="text-sm text-[#766e63]">Your checkout details do not verify your identity. Verify your phone to access your orders on other devices.</p><button onClick={()=>navigateGuest("orders")} style={{backgroundColor:accent}} className="mt-5 w-full rounded-xl p-3 font-bold text-white">Verify phone number</button></>}<div className="mt-5 border-t pt-5"><p className="text-sm font-semibold">Checkout contact details</p><p className="mt-2 text-sm text-[#766e63]">{authName||"Name not added"} · {authPhone?"+91 "+authPhone:"No phone saved"}</p><button className="mt-3 text-sm font-bold" style={{color:accent}} onClick={()=>setAuthOpen(true)}>Edit checkout details</button></div></div></section>}
      <p className="mt-8 text-center text-[10px] text-[#aaa99f]">Powered by RestaurantOS</p>
    </div>
    {menu&&guestPage==="home"&&count>0&&<div className="fixed inset-x-0 bottom-16 z-40 border-t border-[#e9e5dc] bg-[#fffefa]/95 p-4 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3"><div><div className="text-xs font-bold">{count} {count===1?"item":"items"} in your cart</div><div className="mt-1 text-sm font-bold">₹{total.toFixed(2)}</div></div><button onClick={()=>setShowCart(true)} className="inline-flex items-center gap-2 rounded-full bg-[#243128] px-6 py-3 text-sm font-bold text-white"><ShoppingBag size={15}/> View cart</button></div></div>}
    {menu&&!loading&&<>{guestPage==="home"&&<button aria-label="Browse categories" onClick={()=>setCategoryOpen(true)} style={{backgroundColor:accent}} className="fixed bottom-36 right-4 z-30 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-xl"><List size={18}/> Categories</button><nav aria-label="Guest navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e6dfd3] bg-white px-4 py-2"><div className="mx-auto grid max-w-lg grid-cols-4 gap-2">{[{label:"Home",icon:<Home size={20}/>,action:()=>navigateGuest("home")},{label:"Menu",icon:<BookOpen size={20}/>,action:()=>{navigateGuest("home");setActiveCategory("all");}},{label:"Orders",icon:<ReceiptText size={20}/>,action:()=>navigateGuest("orders")},{label:"Account",icon:<UserRound size={20}/>,action:()=>navigateGuest("account")}].map(n=><button key={n.label} onClick={n.action} className="flex flex-col items-center gap-1 py-1 text-[11px] font-semibold text-[#514f43]">{n.icon}{n.label}</button>)}</div></nav>{categoryOpen&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={()=>setCategoryOpen(false)}><section role="dialog" aria-modal="true" aria-label="Menu categories" onClick={e=>e.stopPropagation()} className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-[#fffaf4] p-6"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black">Explore categories</h2><button aria-label="Close categories" onClick={()=>setCategoryOpen(false)}><X/></button></div>{[{id:"all",name:"All dishes",items:items},...menu.categories].filter(c=>c.items.length>0).map(c=><button key={c.id} onClick={()=>jump(c.id)} className="flex w-full items-center justify-between border-b border-[#eee6db] py-4 text-left font-semibold"><span>{c.name} <span className="ml-2 text-xs font-normal text-[#8e8377]">{c.items.length} dishes</span></span>{activeCategory===c.id&&<Check size={17}/>}</button>)}</section></div>}</>}
    {false&&ordersOpen&&<div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/55 sm:items-center sm:p-4" onClick={()=>setOrdersOpen(false)}><section role="dialog" aria-modal="true" aria-label="My orders" className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-[#fffaf4] p-6 sm:rounded-[28px]" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#9e8064]">{menu?.restaurantName}</p><h2 className="mt-2 text-2xl font-black">My orders</h2></div><button aria-label="Close orders" onClick={()=>setOrdersOpen(false)} className="rounded-full border p-2"><X size={19}/></button></div><p className="mt-3 text-sm text-[#766e63]">Orders placed on this browser for this table.</p>{visibleOrders.length===0?<p className="mt-8 rounded-2xl border bg-white p-6 text-center text-sm text-[#766e63]">No orders yet. Explore the menu and place your first order.</p>:<div className="mt-5 space-y-3">{visibleOrders.map(order=><Link key={order.orderId} href={`/order/${encodeURIComponent(qrToken)}/track/${encodeURIComponent(order.orderId)}`} className="block rounded-2xl border bg-white p-4"><div className="flex items-center justify-between gap-3"><span className="font-bold">{order.orderNumber}</span><span style={{color:accent}} className="text-xs font-bold">{order.status}</span></div><div className="mt-2 text-xs text-[#766e63]">{order.tableName} · ₹{Number(order.totalAmount).toFixed(2)} · {new Date(order.createdAt).toLocaleDateString("en-IN")}</div><div className="mt-3 text-sm font-bold" style={{color:accent}}>Track order →</div></Link>)}</div>}<div className="mt-5 rounded-2xl border bg-white p-4"><h3 className="text-sm font-bold">Recover orders from other devices</h3><p className="mt-1 text-xs text-[#766e63]">Verify your mobile number to view orders from this restaurant.</p>{historyToken?<div className="mt-3 flex items-center justify-between gap-2 text-xs"><span>Verified: {historyPhone}</span><button style={{color:accent}} onClick={()=>{setHistoryToken("");setVerifiedOrders([]);localStorage.removeItem("restaurantos_verified_"+qrToken);}} className="font-bold">Sign out</button></div>:<><label className="mt-3 block text-xs font-semibold">Mobile number<input type="tel" inputMode="numeric" value={historyPhone} onChange={e=>setHistoryPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number" className="mt-1 w-full rounded-xl border p-3" /></label>{historyChallenge?<><p className="mt-2 text-xs">Demo OTP: 123456 (expires in 5 minutes)</p><input aria-label="Verification code" inputMode="numeric" maxLength={6} value={historyCode} onChange={e=>setHistoryCode(e.target.value.replace(/\D/g,"").slice(0,6))} className="mt-2 w-full rounded-xl border p-3" placeholder="6-digit code"/><button disabled={historyBusy} onClick={()=>void verifyHistoryOtp()} style={{backgroundColor:accent}} className="mt-2 w-full rounded-xl p-3 text-sm font-bold text-white">Verify and recover</button></>:<button disabled={historyBusy} onClick={()=>void requestHistoryOtp()} style={{backgroundColor:accent}} className="mt-3 w-full rounded-xl p-3 text-sm font-bold text-white">Get demo OTP</button>}</>}{historyError&&<p role="alert" className="mt-2 text-xs text-red-700">{historyError}</p>}</div><p className="mt-4 text-xs text-[#81766a]">Saved orders on this device appear without verification. Complete history requires phone verification.</p></section></div>}
    {authOpen&&<div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#161c17]/65 sm:items-center sm:p-4" onClick={()=>setAuthOpen(false)}><section role="dialog" aria-modal="true" aria-label="Guest details" className="w-full max-w-md rounded-t-[30px] bg-[#fffaf4] p-6 shadow-2xl sm:rounded-[30px]" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#9e8064]">{menu?.restaurantName}</p><h2 className="mt-2 text-2xl font-black">Your details</h2></div><button aria-label="Close" onClick={()=>setAuthOpen(false)} className="rounded-full border p-2"><X size={19}/></button></div><p className="mt-3 text-sm leading-6 text-[#766e63]">Enter your name and mobile number to order. No OTP required.</p><label className="mt-5 block text-sm font-semibold">Full name<input autoComplete="name" value={authName} onChange={e=>setAuthName(e.target.value)} maxLength={120} placeholder="Your full name" className="mt-2 w-full rounded-xl border bg-white p-3 font-normal outline-none"/></label><label className="mt-5 block text-sm font-semibold">Mobile number<div className="mt-2 flex items-center gap-2 rounded-xl border bg-white px-3"><span className="border-r pr-3 text-sm text-[#70695e]">+91</span><input type="tel" inputMode="numeric" autoComplete="tel-national" value={authPhone} onChange={e=>setAuthPhone(e.target.value.replace(/\D/g,"").slice(0,10))} maxLength={10} placeholder="10-digit mobile number" className="w-full py-3 font-normal outline-none"/></div></label>{authError&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{authError}</p>}<button onClick={saveGuestDetails} className="mt-6 w-full rounded-2xl bg-[#243128] p-4 font-bold text-white">Continue without OTP</button><p className="mt-4 text-center text-xs text-[#81766a]">Your number is saved as contact information, not verified identity.</p></section></div>}
    {receipt&&<div className="fixed inset-0 z-50 grid place-items-center bg-[#171916]/55 p-4"><section role="dialog" aria-modal="true" aria-label="Order confirmation" className="w-full max-w-sm rounded-2xl bg-[#fffefa] p-7 text-center shadow-2xl"><div style={{color:accent}} className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2e9]"><ShoppingBag size={22}/></div><div className="eyebrow mt-5">Order received</div><h2 className="mt-2 text-2xl font-bold">You’re all set.</h2><p className="mt-2 text-sm text-[#77796f]">Your order has been sent to the restaurant team. Status updates automatically every 10 seconds while this window is open.</p><div className="my-5 rounded-xl bg-[#f7f4ec] p-4"><div className="text-[10px] uppercase tracking-wider text-[#99998f]">Order number</div><div className="mt-1 text-xl font-bold">{receipt.orderNumber}</div><div className="mt-2 text-xs text-[#77796f]">{receipt.tableName} · ₹{receipt.totalAmount.toFixed(2)}</div></div><div aria-live="polite" className="mb-4 rounded-xl border border-[#e9e5dc] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#99998f]">Live order status</div><div style={{color:accent}} className="mt-1 text-sm font-bold">{{NEW:"Received",ACCEPTED:"Accepted by restaurant",PREPARING:"Preparing your food",READY:"Ready to serve",SERVED:"Served",CANCELLED:"Cancelled"}[receipt.status]??receipt.status}</div>{trackingError&&<p role="status" className="mt-2 text-xs text-[#a7442a]">{trackingError}</p>}</div><Link href={`/order/${encodeURIComponent(qrToken)}/track/${encodeURIComponent(receipt.orderId)}`} style={{backgroundColor:accent}} className="mb-3 block w-full rounded-2xl px-5 py-4 text-center font-bold text-white">Track my order</Link><button onClick={()=>setReceipt(null)} className="ghost-button w-full">Back to menu</button></section></div>}
    {showCart&&menu&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-[#171916]/55 p-0 sm:items-center sm:p-4" onClick={()=>setShowCart(false)}><section role="dialog" aria-modal="true" aria-label="Your cart" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-[#fffefa] p-5 sm:rounded-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><div className="eyebrow">{menu.tableName}</div><h2 className="mt-1 text-xl font-bold">Your order</h2></div><button onClick={()=>setShowCart(false)} className="ghost-button">Close</button></div><div className="my-5 divide-y divide-[#eeeae2]">{cartItems.map(item=><div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><div className="text-sm font-semibold">{item.name}</div><div className="mt-1 text-xs text-[#85867d]">₹{Number(item.price).toFixed(2)} × {cart[item.id]}</div></div><div className="text-sm font-bold">₹{(item.price*cart[item.id]).toFixed(2)}</div></div>)}</div><div className="flex justify-between border-t border-[#e9e5dc] pt-4 text-sm font-bold"><span>Total</span><span>₹{total.toFixed(2)}</span></div><div className="mt-5 space-y-3"><label className="block"><span className="text-xs font-semibold text-[#55584f]">Your name</span><input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Name for the order" maxLength={120} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none"/></label><label className="block"><span className="text-xs font-semibold text-[#55584f]">Special instructions (optional)</span><textarea value={orderNotes} onChange={e=>setOrderNotes(e.target.value)} placeholder="Allergies or preparation notes" maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none"/></label></div>{orderError&&<p role="alert" className="mt-3 rounded-lg bg-[#fbede7] px-3 py-2 text-xs text-[#a7442a]">{orderError}</p>}<button onClick={()=>void placeOrder()} disabled={submitting||!count} className="mt-5 w-full rounded-2xl bg-[#243128] px-5 py-4 font-bold text-white disabled:opacity-50">{submitting?"Placing order…":"Place order · ₹"+total.toFixed(2)}</button></section></div>}
  </main>;
}
