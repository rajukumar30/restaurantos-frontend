"use client";

import {useEffect,useRef,useState} from "react";
import {Client} from "@stomp/stompjs";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Status="connecting"|"connected"|"disconnected";
type EventEnvelope={eventId:string;type:string;tenantId:string;branchId:string;resourceId:string;occurredAt:string};

/** Subscribes only to the current tenant/branch; reconnects and reloads the REST snapshot. */
export function useOrderEvents(token:string,tenantId:string,branchId:string,onChange:()=>void,topic:"orders"|"service-requests"|"billing"="orders"){
 const [status,setStatus]=useState<Status>("disconnected");
 const onChangeRef=useRef(onChange);
 useEffect(()=>{onChangeRef.current=onChange;},[onChange]);
 useEffect(()=>{
  if(!token||!tenantId||!branchId){return;}
  let active=true;
  let refreshTimer:ReturnType<typeof setTimeout>|undefined;
  let lastRefresh=0;
  const scheduleRefresh=()=>{
   if(!active)return;
   if(refreshTimer!==undefined)return;
   const delay=Math.max(0,350-(Date.now()-lastRefresh));
   refreshTimer=setTimeout(()=>{
    refreshTimer=undefined;
    if(!active)return;
    lastRefresh=Date.now();
    onChangeRef.current();
   },delay);
  };
  const refreshOnFocus=()=>{if(document.visibilityState==="visible")scheduleRefresh();};
  window.addEventListener("focus",refreshOnFocus);
  document.addEventListener("visibilitychange",refreshOnFocus);
  const seen=new Set<string>();
  const url=API.replace(/^http/,"ws").replace(/\/$/,"")+"/ws/realtime";
  const client=new Client({
   brokerURL:url,
   connectHeaders:{Authorization:"Bearer "+token},
   reconnectDelay:3000,
   heartbeatIncoming:10000,
   heartbeatOutgoing:10000,
   onConnect:()=>{
    if(!active)return;
    setStatus("connected");
    scheduleRefresh();
    client.subscribe("/topic/tenants/"+tenantId+"/branches/"+branchId+"/"+topic,message=>{
     if(!active)return;
     try{
      const event=JSON.parse(message.body) as EventEnvelope;
      if(event.tenantId!==tenantId||event.branchId!==branchId||!event.eventId||seen.has(event.eventId))return;
      seen.add(event.eventId);
      if(seen.size>500)seen.clear();
      scheduleRefresh();
     }catch{/* Ignore malformed messages; the REST snapshot remains authoritative. */}
    });
   },
   onWebSocketClose:()=>{if(active)setStatus("disconnected");},
   onStompError:()=>{if(active)setStatus("disconnected");},
   onWebSocketError:()=>{if(active)setStatus("disconnected");}
  });
  setStatus("connecting");
  client.activate();
  return()=>{active=false;if(refreshTimer!==undefined)clearTimeout(refreshTimer);window.removeEventListener("focus",refreshOnFocus);document.removeEventListener("visibilitychange",refreshOnFocus);void client.deactivate();};
 },[token,tenantId,branchId,topic]);
 return status;
}
