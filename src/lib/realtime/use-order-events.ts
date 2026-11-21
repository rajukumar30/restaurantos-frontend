"use client";

import {useEffect,useRef,useState} from "react";
import {Client} from "@stomp/stompjs";

const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Status="connecting"|"connected"|"disconnected";
type EventEnvelope={eventId:string;type:string;tenantId:string;branchId:string;resourceId:string;occurredAt:string};

/** Subscribes only to the current tenant/branch; reconnects and reloads the REST snapshot. */
export function useOrderEvents(token:string,tenantId:string,branchId:string,onChange:()=>void,topic:"orders"|"service-requests"="orders"){
 const [status,setStatus]=useState<Status>("disconnected");
 const onChangeRef=useRef(onChange);
 useEffect(()=>{onChangeRef.current=onChange;},[onChange]);
 useEffect(()=>{
  if(!token||!tenantId||!branchId){return;}
  let active=true;
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
    onChangeRef.current();
    client.subscribe("/topic/tenants/"+tenantId+"/branches/"+branchId+"/"+topic,message=>{
     if(!active)return;
     try{
      const event=JSON.parse(message.body) as EventEnvelope;
      if(event.tenantId!==tenantId||event.branchId!==branchId||!event.eventId||seen.has(event.eventId))return;
      seen.add(event.eventId);
      if(seen.size>500)seen.clear();
      onChangeRef.current();
     }catch{/* Ignore malformed messages; the REST snapshot remains authoritative. */}
    });
   },
   onWebSocketClose:()=>{if(active)setStatus("disconnected");},
   onStompError:()=>{if(active)setStatus("disconnected");},
   onWebSocketError:()=>{if(active)setStatus("disconnected");}
  });
  setStatus("connecting");
  client.activate();
  return()=>{active=false;void client.deactivate();};
 },[token,tenantId,branchId,topic]);
 return status;
}
