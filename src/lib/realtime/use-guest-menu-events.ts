"use client";
import {useEffect,useRef} from "react";
import {Client} from "@stomp/stompjs";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
/** Branch-scoped invalidation; no polling and no full page reset. */
export function useGuestMenuEvents(qrToken:string,branchId:string,onChange:()=>void){
 const latest=useRef(onChange);useEffect(()=>{latest.current=onChange;},[onChange]);
 useEffect(()=>{
  if(!qrToken||!branchId)return;
  let active=true,timer:ReturnType<typeof setTimeout>|undefined,last=0;
  function schedule(){
   if(!active||timer!==undefined)return;
   timer=setTimeout(()=>{timer=undefined;if(active){last=Date.now();latest.current();}},Math.max(150,500-(Date.now()-last)));
  }
  const focus=()=>{if(document.visibilityState==="visible")schedule();};
  window.addEventListener("focus",focus);document.addEventListener("visibilitychange",focus);
  const client=new Client({brokerURL:API.replace(/^http/,"ws").replace(/\/$/,"")+"/ws/realtime",connectHeaders:{"X-Guest-QR":qrToken},reconnectDelay:5000,heartbeatIncoming:10000,heartbeatOutgoing:10000,
   onConnect:()=>{if(!active)return;client.subscribe("/topic/guest/branches/"+branchId+"/menu",()=>schedule());schedule();},
   onStompError:()=>{if(active){client.reconnectDelay=0;void client.deactivate();}}
  });
  client.activate();
  return()=>{active=false;if(timer!==undefined)clearTimeout(timer);window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",focus);void client.deactivate();};
 },[qrToken,branchId]);
}
