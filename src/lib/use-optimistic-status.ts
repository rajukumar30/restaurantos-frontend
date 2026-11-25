"use client";

import {useEffect,useMemo,useRef,useState} from "react";

type StatusRow={id:string;status:string};
type Pending<T>={row:T;status:string};
type Session<T>={scope:string;pending:Map<string,Pending<T>>;timer?:ReturnType<typeof setTimeout>};

/** Local projection only. The server remains authoritative; unrelated rows never wait on one another. */
export function useOptimisticStatus<T extends StatusRow>(scope:string,confirmed:T[]){
 const session=useRef<Session<T>|null>(null);
 const [view,setView]=useState<{scope:string;pending:Map<string,Pending<T>>}>({scope,pending:new Map()});
 useEffect(()=>{
  const current:Session<T>={scope,pending:new Map()};
  session.current=current;setView({scope,pending:new Map()});
  return()=>{if(current.timer!==undefined)clearTimeout(current.timer);if(session.current===current)session.current=null;};
 },[scope]);
 const pending=useMemo(()=>view.scope===scope?view.pending:new Map<string,Pending<T>>(),[view,scope]);
 const rows=useMemo(()=>{
  const seen=new Set<string>();
  const projected=confirmed.map(row=>{
   seen.add(row.id);
   const change=pending.get(row.id);
   return change?{...row,status:change.status}:row;
  });
  // A snapshot may omit a pending row (e.g. a just-served ticket).
  for(const [id,change] of pending)if(!seen.has(id))projected.push({...change.row,status:change.status});
  return projected;
 },[confirmed,pending]);

 async function run(row:T,status:string,request:(signal:AbortSignal)=>Promise<{status:string}>,
    commit:(status:string)=>void,refresh:()=>void,fail:(error:unknown)=>void){
  const current=session.current;
  if(!current||current.scope!==scope||current.pending.has(row.id))return;
  // Lock this row synchronously before React renders, never the entire dashboard.
  current.pending.set(row.id,{row,status});
  setView({scope,pending:new Map(current.pending)});
  if(current.timer!==undefined){clearTimeout(current.timer);current.timer=undefined;}
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{
   const result=await request(controller.signal);
   if(result?.status!==status)throw Error("Unexpected update confirmation");
   if(session.current===current)commit(result.status);
  }catch(error){
   // Removing the projection restores the most recent confirmed snapshot, not an old copy.
   if(session.current===current)fail(error);
  }finally{
   clearTimeout(timeout);
   if(session.current===current){
    current.pending.delete(row.id);
    setView({scope,pending:new Map(current.pending)});
    // Reconcile once after a burst, including ambiguous network failures. No automatic mutation retries.
    if(!current.pending.size){
     current.timer=setTimeout(()=>{current.timer=undefined;if(session.current===current)refresh();},150);
    }
   }
  }
 }
 return {rows,pending,run};
}
