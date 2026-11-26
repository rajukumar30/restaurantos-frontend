"use client";
import {useState} from "react";
import {menuThumbnail,safeImage,fallbackMenuThumbnail} from "@/lib/guest-branding";
/** Show the already cached card image immediately. Reveal the full photo only after it is loaded. */
export default function GuestDishDetailPhoto({url,name}:{url:string;name:string}){
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 const thumbnail=menuThumbnail(url),full=safeImage(url);
 if(thumbnail===full)return <img src={full} alt={name} decoding="async" className="h-full w-full object-cover"/>;
 return <div className="relative h-full w-full overflow-hidden">
  <img src={thumbnail} onError={e=>fallbackMenuThumbnail(e.currentTarget,url)} alt={name} decoding="async" className="h-full w-full object-cover"/>
  {!failed&&<img src={full} alt="" aria-hidden="true" fetchPriority="high" decoding="async" onLoad={()=>setReady(true)} onError={()=>setFailed(true)} className={"absolute inset-0 h-full w-full object-cover "+(ready?"opacity-100":"opacity-0")}/>}
 </div>;
}
