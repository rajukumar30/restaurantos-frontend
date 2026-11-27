"use client";
import Link from "next/link";
import {Home,BookOpen,Bell,ReceiptText,UserRound} from "lucide-react";
export const guestTabs=[{id:"home",label:"Home",icon:Home},{id:"menu",label:"Menu",icon:BookOpen},{id:"service",label:"Service",icon:Bell},{id:"orders",label:"Orders",icon:ReceiptText},{id:"account",label:"Account",icon:UserRound}] as const;
import {type GuestView,guestViewHref} from "@/lib/guest-routes";
export {type GuestView,guestViewFromUrl,guestViewHref} from "@/lib/guest-routes";
export default function GuestBottomNav({qrToken,active,onNavigate,preview=false}:{qrToken:string;active:GuestView;onNavigate?:(view:GuestView)=>void;preview?:boolean}){
 return <nav aria-label="Guest navigation" className={"guest-bottom-nav px-3 py-2 "+(preview?"":"fixed inset-x-0 bottom-0 z-30")}><div className="mx-auto grid max-w-lg grid-cols-5 gap-1">{guestTabs.map(({id,label,icon:Icon})=>{
 const className="guest-nav-item "+(active===id?"guest-nav-active":"");
 const content=<><span className="guest-nav-icon"><Icon size={20}/></span>{label}</>;
 if(preview&&id!=="home"&&id!=="menu")return <span key={id} className={className}>{content}</span>;
 return onNavigate?<button key={id} type="button" onClick={()=>onNavigate(id)} aria-current={active===id?"page":undefined} className={className}>{content}</button>:<Link key={id} href={guestViewHref(qrToken,id)} aria-current={active===id?"page":undefined} className={className}>{content}</Link>;
 })}</div></nav>;
}
