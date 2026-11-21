"use client";
import {useEffect,useRef,useState} from "react";
import {Client} from "@stomp/stompjs";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
export function useGuestOrderEvents(qrToken:string,orderId:string,onChange:()=>void){
 const [status,setStatus]=useState<"connecting"|"connected"|"disconnected">("disconnected");
 const callback=useRef(onChange);
 useEffect(()=>{callback.current=onChange;},[onChange]);
 useEffect(()=>{
  if(!qrToken||!orderId)return;
  let active=true;
  const refresh=()=>{if(document.visibilityState==="visible")callback.current();};
  window.addEventListener("focus",refresh);
  document.addEventListener("visibilitychange",refresh);
  const client=new Client({
   brokerURL:API.replace(/^http/,"ws").replace(/\/$/,"")+"/ws/realtime",
   connectHeaders:{"X-Guest-QR":qrToken},
   reconnectDelay:3000,
   heartbeatIncoming:10000,
   heartbeatOutgoing:10000,
   onConnect:()=>{
    if(!active)return;
    setStatus("connected");
    client.subscribe("/topic/guest/orders/"+orderId,()=>{
     if(active)callback.current();
    });
    callback.current();
   },
   onWebSocketClose:()=>{if(active)setStatus("disconnected");},
   onStompError:()=>{if(active)setStatus("disconnected");},
   onWebSocketError:()=>{if(active)setStatus("disconnected");}
  });
  setStatus("connecting");
  client.activate();
  return()=>{active=false;window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);void client.deactivate();};
 },[qrToken,orderId]);
 return status;
}
