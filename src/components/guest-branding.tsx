"use client";
import {Utensils,ArrowRight,MapPin,Clock3,Phone} from "lucide-react";
import {type Branding,safeImage} from "@/lib/guest-branding";
export function GuestBrandHero({branding:b,tableName,onExplore,compact=false}:{branding:Branding;tableName?:string;onExplore?:()=>void;compact?:boolean}){
 const photo=b.bannerUrl.startsWith("blob:")?b.bannerUrl:safeImage(b.bannerUrl);
 if(!b.showBanner)return <div className="mb-5"><h1 className="text-2xl font-bold">{b.displayName}</h1>{b.slogan&&<p className="mt-2 text-sm text-[var(--guest-muted)]">{b.slogan}</p>}{onExplore&&<button type="button" onClick={onExplore} className="guest-cta mt-4">Explore menu <ArrowRight size={16}/></button>}</div>;
 return <section className={"guest-hero relative mb-6 isolate overflow-hidden "+(compact?"":"guest-hero-full")} style={{borderRadius:"var(--guest-radius)",background:"var(--guest-primary)",color:"var(--guest-primary-text)"}}>
  {photo?<div className="absolute inset-0 -z-10 bg-cover bg-center" style={{backgroundImage:'linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.64)),url("'+photo.replaceAll('"','%22')+'")'}}/>:<div aria-hidden="true" className="guest-hero-ornament absolute -z-10"/>}
  <div className={compact?"relative px-5 py-5":"relative px-5 py-7 sm:px-8 sm:py-9"} style={photo?{color:"#FFFFFF"}:undefined}>
   <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-current px-3 py-1 text-[10px] font-semibold tracking-wide"><Utensils size={12}/>{tableName||"Welcome"}</div>
   <h1 className={compact?"max-w-[24ch] text-[23px] font-bold leading-tight":"max-w-[20ch] text-[30px] font-bold leading-[1.14] sm:text-4xl"}>{b.bannerTitle||(compact?b.displayName:"Good food. Great moments.")}</h1>
   <p className="mt-3 max-w-[32ch] text-sm leading-6">{b.bannerText||b.slogan||(compact?"Explore our menu and order at your table.":"Explore our menu and enjoy something delicious.")}</p>
   {onExplore&&<button type="button" onClick={onExplore} className="guest-cta mt-5">Explore menu <ArrowRight size={17}/></button>}
  </div>
 </section>;
}
export function GuestBrandHeader({branding:b}:{branding:Branding}){
 const logo=b.logoUrl.startsWith("blob:")?b.logoUrl:safeImage(b.logoUrl);
 return <div className="flex min-w-0 items-center gap-3">{logo?<img src={logo} alt={b.displayName+" logo"} className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain"/>:<div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--guest-primary)] text-[var(--guest-primary-text)]"><Utensils size={21}/></div>}<div className="min-w-0"><p className="truncate text-[17px] font-bold tracking-tight text-[var(--guest-primary-link)]">{b.displayName}</p>{b.slogan&&<p className="line-clamp-1 text-xs text-[var(--guest-muted)]">{b.slogan}</p>}</div></div>;
}
export function GuestBrandDetails({branding:b}:{branding:Branding}){
 if(!b.showDetails||![b.about,b.contactPhone,b.address,b.openingHours].some(Boolean))return null;
 return <section className="mt-6 rounded-[var(--guest-radius)] border bg-[var(--guest-surface)] p-5 text-[var(--guest-text)]"><h2 className="text-lg font-bold">About our restaurant</h2>{b.about&&<p className="mt-2 whitespace-pre-line text-sm leading-6 text-[var(--guest-muted)]">{b.about}</p>}{b.address&&<p className="mt-4 flex items-start gap-2 text-sm"><MapPin size={17} className="shrink-0 text-[var(--guest-link)]"/>{b.address}</p>}{b.openingHours&&<p className="mt-3 flex items-start gap-2 text-sm"><Clock3 size={17} className="shrink-0 text-[var(--guest-link)]"/>{b.openingHours}</p>}{b.contactPhone&&<p className="mt-3 flex items-start gap-2 text-sm"><Phone size={17} className="shrink-0 text-[var(--guest-link)]"/>{b.contactPhone}</p>}</section>;
}
