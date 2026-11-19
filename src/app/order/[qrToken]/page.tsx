"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, Utensils } from "lucide-react";
import { useParams } from "next/navigation";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"http://localhost:8080";
type Item={id:string;name:string;description?:string;price:number;dietaryType:string;prepTimeMinutes:number};
type Category={id:string;name:string;items:Item[]};
type Menu={tableId:string;tableName:string;branchName:string;restaurantName:string;categories:Category[]};

export default function GuestOrderPage(){
  const params=useParams<{qrToken:string}>();
  const qrToken=params.qrToken;
  const [menu,setMenu]=useState<Menu|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [cart,setCart]=useState<Record<string,number>>({});
  const [showCart,setShowCart]=useState(false);
  const [customerName,setCustomerName]=useState("");
  const [orderNotes,setOrderNotes]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [orderError,setOrderError]=useState("");
  const [receipt,setReceipt]=useState<{orderId:string;orderNumber:string;totalAmount:number;tableName:string;status:string}|null>(null);
  const [trackingError,setTrackingError]=useState("");

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
  function change(itemId:string,delta:number){setCart(current=>({...current,[itemId]:Math.max(0,(current[itemId]??0)+delta)}));}

  async function placeOrder(){
    if(!menu||!count||submitting)return;setSubmitting(true);setOrderError("");
    try{
      const response=await fetch(`${API}/api/v1/public/qr/${encodeURIComponent(qrToken)}/orders`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({customerName:customerName.trim()||null,notes:orderNotes.trim()||null,items:cartItems.map(item=>({menuItemId:item.id,quantity:cart[item.id]}))})});
      const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Could not place your order.");
      setReceipt({orderId:payload.data.orderId,orderNumber:payload.data.orderNumber,totalAmount:Number(payload.data.totalAmount),tableName:payload.data.tableName,status:payload.data.status});setTrackingError("");setCart({});setShowCart(false);setCustomerName("");setOrderNotes("");
    }catch(e){setOrderError(e instanceof Error?e.message:"Unable to place your order.");}
    finally{setSubmitting(false);}
  }

  return <main className="min-h-screen bg-[#f7f4ec] pb-28">
    <header className="border-b border-[#e9e5dc] bg-[#fffefa] px-5 py-5 sm:px-8"><div className="mx-auto max-w-3xl"><div className="flex items-center gap-3"><div className="brand-mark">r.</div><div><div className="font-bold tracking-tight">restaurant<span className="text-[#E56A42]">os</span></div><div className="text-[9px] uppercase tracking-[.16em] text-[#99998f]">Scan · Browse · Order</div></div></div></div></header>
    <div className="mx-auto max-w-3xl px-4 py-7 sm:px-8 sm:py-10">
      {loading?<div className="panel py-20 text-center text-sm text-[#99998f]">Loading restaurant menu…</div>:error?<div className="panel px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fbede7] text-[#c65e3d]"><Utensils size={22}/></div><h1 className="mt-4 text-xl font-bold">Menu unavailable</h1><p className="mt-2 text-sm text-[#85867d]">{error}</p><p className="mt-5 text-xs text-[#aaa99f]">Please ask a staff member for help or scan the table QR code again.</p></div>:menu&&<>
        <div className="mb-8"><div className="eyebrow">{menu.branchName} · {menu.tableName}</div><h1 className="mt-2 text-3xl font-bold tracking-[-.055em] sm:text-4xl">{menu.restaurantName}<span className="text-[#E56A42]">.</span></h1><p className="mt-3 text-sm text-[#77796f]">Explore the menu and add your favourites to the cart.</p><div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#eaf2e9] px-3 py-1.5 text-[11px] font-semibold text-[#527a5b]"><span className="h-1.5 w-1.5 rounded-full bg-[#527a5b]"/> Ordering for {menu.tableName}</div></div>
        {menu.categories.map(category=><section key={category.id} className="mb-5 overflow-hidden rounded-2xl border border-[#e9e5dc] bg-[#fffefa]"><div className="border-b border-[#eeeae2] px-5 py-4"><h2 className="font-bold">{category.name}</h2><p className="mt-1 text-[11px] text-[#99998f]">{category.items.length} items</p></div>{category.items.length===0?<p className="px-5 py-6 text-xs text-[#99998f]">No items currently available.</p>:<div className="divide-y divide-[#f0ede6]">{category.items.map(item=><div key={item.id} className="flex items-center gap-3 px-5 py-4"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-sm border-2 ${item.dietaryType==="VEG"?"border-[#527a5b]":item.dietaryType==="EGG"?"border-[#b88a37]":"border-[#c65e3d]"}`}/><h3 className="text-sm font-bold">{item.name}</h3></div>{item.description&&<p className="mt-1 text-xs leading-5 text-[#85867d]">{item.description}</p>}<div className="mt-2 text-sm font-bold tabular-nums">₹{Number(item.price).toFixed(2)} <span className="ml-1 text-[10px] font-normal text-[#99998f]">· {item.prepTimeMinutes} min</span></div></div><div className="flex items-center gap-2">{(cart[item.id]??0)>0&&<button onClick={()=>change(item.id,-1)} aria-label={`Remove one ${item.name}`} className="grid h-8 w-8 place-items-center rounded-lg border border-[#e4dfd4]"><Minus size={14}/></button>}<span className="w-4 text-center text-xs font-bold">{cart[item.id]??0}</span><button onClick={()=>change(item.id,1)} aria-label={`Add one ${item.name}`} className="grid h-8 w-8 place-items-center rounded-lg bg-[#e56a42] text-white"><Plus size={14}/></button></div></div>)}</div>}</section>)}
        {items.length===0&&<div className="panel py-12 text-center text-sm text-[#99998f]">No items are currently available at this branch.</div>}
      </>}
      <p className="mt-8 text-center text-[10px] text-[#aaa99f]">Powered by RestaurantOS</p>
    </div>
    {menu&&count>0&&<div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e9e5dc] bg-[#fffefa]/95 p-4 backdrop-blur"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3"><div><div className="text-xs font-bold">{count} {count===1?"item":"items"} in your cart</div><div className="mt-1 text-sm font-bold">₹{total.toFixed(2)}</div></div><button onClick={()=>setShowCart(true)} className="primary-button inline-flex items-center gap-2"><ShoppingBag size={15}/> View cart</button></div></div>}
    {receipt&&<div className="fixed inset-0 z-50 grid place-items-center bg-[#171916]/55 p-4"><section role="dialog" aria-modal="true" aria-label="Order confirmation" className="w-full max-w-sm rounded-2xl bg-[#fffefa] p-7 text-center shadow-2xl"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2e9] text-[#527a5b]"><ShoppingBag size={22}/></div><div className="eyebrow mt-5">Order received</div><h2 className="mt-2 text-2xl font-bold">You’re all set.</h2><p className="mt-2 text-sm text-[#77796f]">Your order has been sent to the restaurant team. Status updates automatically every 10 seconds while this window is open.</p><div className="my-5 rounded-xl bg-[#f7f4ec] p-4"><div className="text-[10px] uppercase tracking-wider text-[#99998f]">Order number</div><div className="mt-1 text-xl font-bold">{receipt.orderNumber}</div><div className="mt-2 text-xs text-[#77796f]">{receipt.tableName} · ₹{receipt.totalAmount.toFixed(2)}</div></div><div aria-live="polite" className="mb-4 rounded-xl border border-[#e9e5dc] px-4 py-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#99998f]">Live order status</div><div className="mt-1 text-sm font-bold text-[#527a5b]">{{NEW:"Received",ACCEPTED:"Accepted by restaurant",PREPARING:"Preparing your food",READY:"Ready to serve",SERVED:"Served",CANCELLED:"Cancelled"}[receipt.status]??receipt.status}</div>{trackingError&&<p role="status" className="mt-2 text-xs text-[#a7442a]">{trackingError}</p>}</div><button onClick={()=>setReceipt(null)} className="primary-button w-full">Back to menu</button></section></div>}
    {showCart&&menu&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-[#171916]/55 p-0 sm:items-center sm:p-4" onClick={()=>setShowCart(false)}><section role="dialog" aria-modal="true" aria-label="Your cart" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-[#fffefa] p-5 sm:rounded-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div><div className="eyebrow">{menu.tableName}</div><h2 className="mt-1 text-xl font-bold">Your order</h2></div><button onClick={()=>setShowCart(false)} className="ghost-button">Close</button></div><div className="my-5 divide-y divide-[#eeeae2]">{cartItems.map(item=><div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><div className="text-sm font-semibold">{item.name}</div><div className="mt-1 text-xs text-[#85867d]">₹{Number(item.price).toFixed(2)} × {cart[item.id]}</div></div><div className="text-sm font-bold">₹{(item.price*cart[item.id]).toFixed(2)}</div></div>)}</div><div className="flex justify-between border-t border-[#e9e5dc] pt-4 text-sm font-bold"><span>Total</span><span>₹{total.toFixed(2)}</span></div><div className="mt-5 space-y-3"><label className="block"><span className="text-xs font-semibold text-[#55584f]">Your name (optional)</span><input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Name for the order" maxLength={120} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none"/></label><label className="block"><span className="text-xs font-semibold text-[#55584f]">Special instructions (optional)</span><textarea value={orderNotes} onChange={e=>setOrderNotes(e.target.value)} placeholder="Allergies or preparation notes" maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none"/></label></div>{orderError&&<p role="alert" className="mt-3 rounded-lg bg-[#fbede7] px-3 py-2 text-xs text-[#a7442a]">{orderError}</p>}<button onClick={placeOrder} disabled={submitting||!count} className="primary-button mt-5 w-full disabled:opacity-50">{submitting?"Placing order…":"Place order · ₹"+total.toFixed(2)}</button></section></div>}
  </main>;
}
