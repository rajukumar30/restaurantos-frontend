"use client";
import {useCallback,useEffect,useState} from "react";
import {BellRing,HandPlatter,Sparkles,GlassWater,Utensils,Receipt,MessageSquare,CheckCircle2,Clock3,X} from "lucide-react";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://restaurantos-backend-kz2r.onrender.com";
type Request={id:string;type:string;status:string;notes?:string;createdAt:string;tableName?:string};
const options=[
 {type:"WAITER",title:"Call waiter",description:"Need assistance?",icon:HandPlatter},
 {type:"CLEANING",title:"Clean table",description:"Clear or wipe the table",icon:Sparkles},
 {type:"WATER",title:"Drinking water",description:"Request water",icon:GlassWater},
 {type:"CUTLERY",title:"Cutlery",description:"Spoons, forks or plates",icon:Utensils},
 {type:"BILL",title:"Request bill",description:"Ready to settle?",icon:Receipt},
 {type:"OTHER",title:"Something else",description:"Tell us what you need",icon:MessageSquare}
];
const names:Record<string,string>=Object.fromEntries(options.map(o=>[o.type,o.title]));
async function data(res:Response){const body=await res.json();if(!res.ok||!body.success)throw Error(body.message||"Unable to reach restaurant staff");return body.data;}
export default function GuestService({qrToken,tableName}:{qrToken:string;tableName:string}){
 const [requests,setRequests]=useState<Request[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState("");
 const [error,setError]=useState("");
 const [notes,setNotes]=useState("");
 const [otherOpen,setOtherOpen]=useState(false);
 const load=useCallback(async()=>{try{const r=await data(await fetch(API+"/api/v1/public/qr/"+encodeURIComponent(qrToken)+"/service-requests",{cache:"no-store"}));setRequests(r);setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to load requests");}finally{setLoading(false);}},[qrToken]);
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),10000);return()=>clearInterval(timer);},[load]);
 async function send(type:string){if(busy)return;if(type==="OTHER"&&!notes.trim()){setOtherOpen(true);return;}setBusy(type);setError("");try{await data(await fetch(API+"/api/v1/public/qr/"+encodeURIComponent(qrToken)+"/service-requests",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type,notes:type==="OTHER"?notes.trim():null})}));setOtherOpen(false);setNotes("");await load();}catch(e){setError(e instanceof Error?e.message:"Could not send request");}finally{setBusy("");}}
 async function cancel(id:string){setBusy(id);try{await data(await fetch(API+"/api/v1/public/qr/"+encodeURIComponent(qrToken)+"/service-requests/"+id+"/cancel",{method:"PATCH"}));await load();}catch(e){setError(e instanceof Error?e.message:"Unable to cancel request");}finally{setBusy("");}}
 return <section className="mx-auto max-w-xl pb-8">
  <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#8b7864]">{tableName}</p><h1 className="mt-2 text-2xl font-extrabold text-[#242b24]">How can we help?</h1><p className="mt-2 text-sm text-[#757b73]">Choose what you need. Our staff will be notified.</p></div><div className="rounded-2xl bg-[#edf5ed] p-3 text-[#2a6d3c]"><BellRing size={23}/></div></div>
  <div className="mt-6 grid grid-cols-2 gap-3">{options.map(o=>{const Icon=o.icon;const active=requests.find(r=>r.type===o.type&&r.status!=="COMPLETED");return <button key={o.type} type="button" disabled={!!busy||!!active} onClick={()=>o.type==="OTHER"?setOtherOpen(true):void send(o.type)} className="min-h-[132px] rounded-2xl border border-[#e6e9e3] bg-white p-4 text-left shadow-sm transition active:scale-[.98] disabled:opacity-65"><Icon size={23} className="text-[#267d45]"/><p className="mt-3 text-sm font-extrabold text-[#263126]">{o.title}</p><p className="mt-1 text-[11px] leading-4 text-[#81877e]">{active?"Already requested":o.description}</p></button>;})}</div>
  {otherOpen&&<div className="mt-4 rounded-2xl border border-[#e4e9e0] bg-white p-4"><label className="text-sm font-bold" htmlFor="service-note">What do you need?</label><textarea id="service-note" value={notes} maxLength={250} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Describe your request briefly" className="mt-2 w-full rounded-xl border p-3 text-sm"/><div className="mt-3 flex gap-2"><button onClick={()=>setOtherOpen(false)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button><button disabled={!notes.trim()||!!busy} onClick={()=>void send("OTHER")} className="rounded-xl bg-[#243128] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Send request</button></div></div>}
  {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  <div className="mt-8 flex items-center justify-between"><h2 className="text-lg font-extrabold">Active requests</h2><button onClick={()=>void load()} className="text-xs font-bold text-[#267d45]">Refresh</button></div>
  {loading?<p className="mt-4 text-sm text-[#777]">Loading requests…</p>:requests.length===0?<p className="mt-3 rounded-2xl bg-[#f5f7f3] p-5 text-sm text-[#697269]">No active requests. Tap an option above whenever you need help.</p>:<div className="mt-3 space-y-3">{requests.map(r=><article key={r.id} className="rounded-2xl border border-[#e8ebe5] bg-white p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-bold">{names[r.type]||r.type}</h3><span className={`rounded-full px-3 py-1 text-xs font-bold ${r.status==="COMPLETED"?"bg-green-50 text-green-700":r.status==="ON_THE_WAY"?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-700"}`}>{r.status==="COMPLETED"?"Completed":r.status==="ON_THE_WAY"?"On the way":"Requested"}</span></div>{r.notes&&<p className="mt-1 text-xs text-[#757b73]">{r.notes}</p>}<div className="mt-4 grid grid-cols-3 gap-1">{["Requested","On the way","Completed"].map((label,i)=><div key={label}><div className={`h-1.5 rounded-full ${i===0||(i===1&&r.status!=="REQUESTED")||(i===2&&r.status==="COMPLETED")?"bg-[#238b4b]":"bg-[#e9ece7]"}`}/><p className="mt-1 text-[10px] text-[#777]">{label}</p></div>)}</div><div className="mt-3 flex items-center justify-between text-xs text-[#777]"><span className="flex items-center gap-1">{r.status==="ON_THE_WAY"?<CheckCircle2 size={14}/>:<Clock3 size={14}/>} {r.status==="COMPLETED"?"Request completed":r.status==="ON_THE_WAY"?"Staff accepted your request":"Waiting for staff"}</span>{r.status==="REQUESTED"&&<button disabled={!!busy} onClick={()=>void cancel(r.id)} className="flex items-center gap-1 font-bold text-[#ad4339]"><X size={13}/> Cancel</button>}</div></article>)}</div>}
  <p className="mt-5 text-center text-xs text-[#899086]">Requests refresh automatically every 10 seconds.</p>
 </section>;
}
