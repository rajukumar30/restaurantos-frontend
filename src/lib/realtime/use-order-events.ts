"use client";
import {useEffect,useRef,useState} from "react";
import {subscribeWorkspace,type SocketStatus} from "./workspace-socket";
import {invalidateWorkspaceDashboard} from "../workspace-fetch";

/** One authenticated transport per login, scoped subscriptions and bounded event reconciliation. */
export function useOrderEvents(token:string,tenantId:string,branchId:string,onChange:(resourceId?:string)=>void|Promise<void>,topic:"orders"|"service-requests"|"billing"|"floor"="orders"){
 const [status,setStatus]=useState<SocketStatus>("disconnected");
 const latest=useRef(onChange);
 useEffect(()=>{latest.current=onChange;},[onChange]);
 useEffect(()=>{
  if(!token||!tenantId||!branchId){setStatus("disconnected");return;}
  let active=true,timer:ReturnType<typeof setTimeout>|undefined;
  let pending=false,inFlight=false,full=false,last=0,resource:string|undefined;
  const drain=()=>{
   if(!active||!pending||inFlight||timer!==undefined)return;
   timer=setTimeout(()=>{
    timer=undefined;if(!active||!pending)return;
    const id=full?undefined:resource;
    pending=false;full=false;resource=undefined;inFlight=true;last=Date.now();
    Promise.resolve().then(()=>active?latest.current(id):undefined).catch(()=>{}).finally(()=>{inFlight=false;drain();});
   },Math.max(100,250-(Date.now()-last)));
  };
  const schedule=(id?:string)=>{
   if(!active)return;pending=true;
   if(!id||(resource&&resource!==id))full=true;else if(!full)resource=id;
   drain();
  };
  const reconcile=()=>schedule();
  const release=subscribeWorkspace(token,tenantId,branchId,topic,{
   status:setStatus,reconcile,
   event:event=>{invalidateWorkspaceDashboard(token,tenantId,branchId);schedule(event.resourceId);}
  });
  const focus=()=>{if(document.visibilityState==="visible")schedule();};
  window.addEventListener("focus",focus);document.addEventListener("visibilitychange",focus);
  return()=>{active=false;if(timer!==undefined)clearTimeout(timer);release();window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",focus);};
 },[token,tenantId,branchId,topic]);
 return status;
}
