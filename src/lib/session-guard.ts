"use client";
import {useEffect} from "react";
import {closeWorkspaceSocket} from "./realtime/workspace-socket";
import {clearWorkspaceCache} from "./workspace-fetch";
import {useRouter,usePathname} from "next/navigation";

const KEY="restaurantos_access_token";
const USER="restaurantos_user";
export function isSessionExpired(token:string):boolean {
 try {
  const parts=token.split(".");
  if(parts.length!==3)return true;
  const normalized=parts[1].replace(/-/g,"+").replace(/_/g,"/");
  const payload=JSON.parse(atob(normalized)) as {exp?:number};
  return typeof payload.exp!=="number"||payload.exp*1000<=Date.now()+1000;
 }catch{return true;}
}
export function clearSessionAndRedirect(next:string){
 closeWorkspaceSocket();clearWorkspaceCache();
 localStorage.removeItem(KEY);
 localStorage.removeItem(USER);
 const target=next.startsWith("/")&&!next.startsWith("//")?next:"/";
 window.location.replace("/login?reason=session-expired&next="+encodeURIComponent(target));
}
export function useSessionGuard(enabled:boolean){
 const router=useRouter();const pathname=usePathname();
 useEffect(()=>{
  if(!enabled)return;
  const token=localStorage.getItem(KEY);
  if(!token||isSessionExpired(token)){clearSessionAndRedirect(pathname);return;}
  const interval=window.setInterval(()=>{
   const current=localStorage.getItem(KEY);
   if(!current||isSessionExpired(current))clearSessionAndRedirect(window.location.pathname);
  },15000);
  function onFocus(){const current=localStorage.getItem(KEY);if(!current||isSessionExpired(current))clearSessionAndRedirect(window.location.pathname);}
  window.addEventListener("focus",onFocus);
  return()=>{window.clearInterval(interval);window.removeEventListener("focus",onFocus);};
 },[enabled,pathname,router]);
 useEffect(()=>{
  if(!enabled)return;
  const original=window.fetch;
  window.fetch=async function(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
   const response=await original.call(window,input,init);
   if(response.status===401){
    const url=typeof input==="string"?input:input instanceof URL?input.href:input.url;
    const api=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
    if(url.startsWith(api+"/api/")&&!url.includes("/auth/login")){
     const token=localStorage.getItem(KEY);
     if(token)clearSessionAndRedirect(window.location.pathname);
    }
   }
   return response;
  };
  return()=>{window.fetch=original;};
 },[enabled]);
}
