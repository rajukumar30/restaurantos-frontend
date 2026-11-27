"use client";
import {Client,type StompSubscription} from "@stomp/stompjs";
export type SocketStatus="connecting"|"connected"|"disconnected";
export type EventEnvelope={eventId:string;type:string;tenantId:string;branchId:string;resourceId:string;occurredAt:string};
type Listener={event:(event:EventEnvelope)=>void;status:(status:SocketStatus)=>void;reconcile:()=>void};
type Topic={listeners:Set<Listener>;subscription?:StompSubscription;seen:Set<string>};
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function expiration(token:string){try{return Number(JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).exp)*1000;}catch{return 0;}}
function valid(token:string){try{return !!token&&window.localStorage.getItem("restaurantos_access_token")===token&&expiration(token)>Date.now();}catch{return false;}}
class WorkspaceSocket {
 private client:Client;
 private topics=new Map<string,Topic>();
 private status:SocketStatus="connecting";
 private closed=false;
 private idle:ReturnType<typeof setTimeout>|undefined;
 private expiry:ReturnType<typeof setTimeout>|undefined;
 private checkSession=()=>{if(!valid(this.token))this.close();};
 constructor(private token:string){
  this.client=new Client({
   brokerURL:API.replace(/^http/,"ws").replace(/\/$/,"")+"/ws/realtime",
   connectHeaders:{Authorization:"Bearer "+token},
   reconnectDelay:2000,heartbeatIncoming:10000,heartbeatOutgoing:10000,
   beforeConnect:()=>{if(!valid(this.token))this.close();},
   onConnect:()=>{
    if(this.closed||!valid(this.token)){this.close();return;}
    this.status="connected";
    for(const [destination,topic] of this.topics){topic.subscription=undefined;this.attach(destination,topic);for(const l of topic.listeners){l.status("connected");l.reconcile();}}
   },
   onWebSocketClose:()=>this.disconnected(),
   onWebSocketError:()=>this.disconnected(),
   // A broker authorization error must not keep retrying a denied subscription.
   onStompError:()=>this.close()
  });
  window.addEventListener("storage",this.checkSession);
  window.addEventListener("focus",this.checkSession);
  this.expiry=setTimeout(()=>this.close(),Math.min(2147483647,Math.max(0,expiration(token)-Date.now())));
 }
 start(){if(!this.closed&&valid(this.token))this.client.activate();else this.close();}
 isUsable(token:string){return !this.closed&&this.token===token&&valid(token);}
 private disconnected(){
  if(this.closed)return;this.status="disconnected";
  for(const topic of this.topics.values()){topic.subscription=undefined;for(const l of topic.listeners)l.status("disconnected");}
 }
 private attach(destination:string,topic:Topic){
  if(this.closed||!this.client.connected||topic.subscription)return;
  topic.subscription=this.client.subscribe(destination,message=>{
   if(this.closed||!valid(this.token)){this.close();return;}
   if(this.topics.get(destination)!==topic)return;
   try{
    const event=JSON.parse(message.body) as EventEnvelope;
    const [, , ,tenantId,,branchId]=destination.split("/");
    if(!event.eventId||event.tenantId!==tenantId||event.branchId!==branchId||topic.seen.has(event.eventId))return;
    topic.seen.add(event.eventId);
    if(topic.seen.size>500){const first=topic.seen.values().next().value;if(first)topic.seen.delete(first);}
    for(const l of topic.listeners)l.event(event);
   }catch{/* Ignore malformed messages; authoritative REST remains available. */}
  });
 }
 subscribe(destination:string,listener:Listener){
  if(this.closed)return ()=>{};
  if(this.idle!==undefined){clearTimeout(this.idle);this.idle=undefined;}
  let topic=this.topics.get(destination);
  if(!topic){topic={listeners:new Set(),seen:new Set()};this.topics.set(destination,topic);}
  topic.listeners.add(listener);
  listener.status(this.status);
  if(this.client.connected){this.attach(destination,topic);listener.reconcile();}
  return ()=>{
   const current=this.topics.get(destination);
   if(current!==topic)return;
   current.listeners.delete(listener);
   if(!current.listeners.size){try{current.subscription?.unsubscribe();}catch{}this.topics.delete(destination);}
   if(!this.topics.size&&!this.closed){
    // Keep only the transport warm during navigation; no idle topic subscriptions.
    this.idle=setTimeout(()=>this.close(),20000);
   }
  };
 }
 close(){
  if(this.closed)return;
  this.closed=true;
  if(this.idle!==undefined)clearTimeout(this.idle);
  if(this.expiry!==undefined)clearTimeout(this.expiry);
  window.removeEventListener("storage",this.checkSession);
  window.removeEventListener("focus",this.checkSession);
  for(const topic of this.topics.values())for(const l of topic.listeners)l.status("disconnected");
  this.topics.clear();
  void this.client.deactivate().catch(()=>{});
 }
}
let shared:WorkspaceSocket|undefined;
export function closeWorkspaceSocket(){shared?.close();shared=undefined;}
export function subscribeWorkspace(token:string,tenantId:string,branchId:string,topic:"orders"|"service-requests"|"billing"|"floor",listener:Listener){
 if(!valid(token)||!UUID.test(tenantId)||!UUID.test(branchId)){listener.status("disconnected");return ()=>{};}
 let start=false;
 if(!shared?.isUsable(token)){closeWorkspaceSocket();shared=new WorkspaceSocket(token);start=true;}
 const release=shared.subscribe("/topic/tenants/"+tenantId+"/branches/"+branchId+"/"+topic,listener);
 if(start)shared.start();
 return release;
}
