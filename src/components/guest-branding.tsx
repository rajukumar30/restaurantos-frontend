"use client";
import {Utensils} from "lucide-react";
import {type Branding,safeImage} from "@/lib/guest-branding";
export function GuestBrandHero({branding:b,tableName,onExplore,compact=false}:{branding:Branding;tableName?:string;onExplore?:()=>void;compact?:boolean}){
 const photo=b.bannerUrl.startsWith("blob:")?b.bannerUrl:safeImage(b.bannerUrl);
 if(!b.showBanner)return <div className="mb-5"><h1 className="text-2xl font-extrabold">{b.displayName}</h1>{b.slogan&&<p className="mt-2 text-sm opacity-80">{b.slogan}</p>}{onExplore&&<button type="button" onClick={onExplore} className="mt-3 rounded-xl px-4 py-3 font-bold" style={{background:"var(--guest-accent)",color:"var(--guest-accent-text)"}}>Explore menu</button>}</div>;
 return <section className="mb-5 overflow-hidden shadow-sm" style={{borderRadius:"var(--guest-radius)",background:"var(--guest-primary)",color:"var(--guest-primary-text)"}}>
  <div className={compact?"px-5 py-5":"min-h-52 px-6 py-6"} style={photo?{backgroundImage:'linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.38)),url("'+photo.replaceAll('"','%22')+'")',backgroundSize:"cover",backgroundPosition:"center",color:"#FFFFFF"}:undefined}>
   <p className="text-xs font-bold uppercase tracking-widest opacity-80">{tableName?"Welcome to "+tableName:"Welcome to our restaurant"}</p>
   <h1 className="mt-3 text-2xl font-extrabold">{b.bannerTitle||b.displayName}</h1>
   <p className="mt-2 text-sm opacity-85">{b.bannerText||b.slogan||"Good food, made fresh for your table."}</p>
   {onExplore&&<button type="button" onClick={onExplore} className="mt-5 rounded-xl px-5 py-3 text-sm font-bold" style={{background:"var(--guest-accent)",color:"var(--guest-accent-text)"}}>Explore full menu →</button>}
  </div>
 </section>;
}
export function GuestBrandHeader({branding:b}:{branding:Branding}){
 const logo=b.logoUrl.startsWith("blob:")?b.logoUrl:safeImage(b.logoUrl);
 return <div className="flex items-center gap-3">{logo?<img src={logo} alt={b.displayName+" logo"} className="h-11 w-11 rounded-xl bg-white object-contain"/>:<Utensils size={22}/>}<div><p className="font-extrabold">{b.displayName}</p>{b.slogan&&<p className="text-xs opacity-80">{b.slogan}</p>}</div></div>;
}
export function GuestBrandDetails({branding:b}:{branding:Branding}){
 if(!b.showDetails||![b.about,b.contactPhone,b.address,b.openingHours].some(Boolean))return null;
 return <section className="mt-6 rounded-2xl border bg-white p-5 text-[#20241f]"><h2 className="font-bold">About our restaurant</h2>{b.about&&<p className="mt-2 whitespace-pre-line text-sm">{b.about}</p>}{b.address&&<p className="mt-3 text-sm"><strong>Address: </strong>{b.address}</p>}{b.openingHours&&<p className="mt-2 text-sm"><strong>Opening hours: </strong>{b.openingHours}</p>}{b.contactPhone&&<p className="mt-2 text-sm"><strong>Contact: </strong>{b.contactPhone}</p>}</section>;
}
