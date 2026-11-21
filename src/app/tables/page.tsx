"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, ExternalLink, Plus, QrCode, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import QRCode from "qrcode";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
type Membership = { tenantId: string; tenantName: string; roles: string };
type Branch = { id: string; name: string; branchCode: string };
type RestaurantTable = { id: string; tableNumber: string; displayName: string; seatingCapacity: number; qrToken: string; active: boolean };
type QrPreview = { table: RestaurantTable; image: string; url: string };

export default function TablesPage() {
 const ownerRoute=usePathname().startsWith("/owner");
  const router = useRouter();
  const [token,setToken] = useState("");
  const [demo,setDemo] = useState(false);
  const [memberships,setMemberships] = useState<Membership[]>([]);
  const [tenantId,setTenantId] = useState("");
  const [branches,setBranches] = useState<Branch[]>([]);
  const [branchId,setBranchId] = useState("");
  const [tables,setTables] = useState<RestaurantTable[]>([]);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [showForm,setShowForm] = useState(false);
  const [tableNumber,setTableNumber] = useState("");
  const [displayName,setDisplayName] = useState("");
  const [capacity,setCapacity] = useState("2");
  const [qrPreview,setQrPreview] = useState<QrPreview|null>(null);

  useEffect(()=>{
    const accessToken=localStorage.getItem("restaurantos_access_token")??"";
    const rawUser=localStorage.getItem("restaurantos_user");
    if(!accessToken||!rawUser){
      if(new URLSearchParams(window.location.search).get("demo")==="1"){
        setDemo(true);setMemberships([{tenantId:"demo-restaurant",tenantName:"The Olive Kitchen",roles:"Owner"}]);
        setTenantId("demo-restaurant");setBranches([{id:"demo-main",name:"Indiranagar · Main branch",branchCode:"MAIN"}]);
        setBranchId("demo-main");setTables([
          {id:"d1",tableNumber:"01",displayName:"Table 01",seatingCapacity:2,qrToken:"sample-table-01",active:true},
          {id:"d2",tableNumber:"02",displayName:"Table 02",seatingCapacity:4,qrToken:"sample-table-02",active:true},
          {id:"d3",tableNumber:"03",displayName:"Window table",seatingCapacity:4,qrToken:"sample-table-03",active:true},
          {id:"d4",tableNumber:"04",displayName:"Table 04",seatingCapacity:6,qrToken:"sample-table-04",active:false}
        ]);setLoading(false);return;
      }
      router.replace("/login");return;
    }
    try{
      const user=JSON.parse(rawUser);const available:Membership[]=user.memberships??[];
      if(!available.length){router.replace("/login");return;}
      setToken(accessToken);setMemberships(available);setTenantId(available[0].tenantId);
    }catch{router.replace("/login");}
  },[router]);

  useEffect(()=>{
    if(!token||!tenantId)return;let cancelled=false;
    async function loadBranches(){
      setLoading(true);setError("");
      try{
        const response=await fetch(`${API}/api/v1/tenants/${tenantId}/branches`,{headers:{Authorization:`Bearer ${token}`}});
        const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Unable to load branches.");
        if(!cancelled){setBranches(payload.data);setBranchId(current=>payload.data.some((b:Branch)=>b.id===current)?current:(payload.data[0]?.id??""));}
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to load branches.");}
      finally{if(!cancelled)setLoading(false);}
    }
    loadBranches();return()=>{cancelled=true;};
  },[token,tenantId]);

  useEffect(()=>{
    if(!token||!tenantId||!branchId)return;let cancelled=false;
    async function loadTables(){
      setLoading(true);setError("");
      try{
        const response=await fetch(`${API}/api/v1/tenants/${tenantId}/tables?branchId=${branchId}`,{headers:{Authorization:`Bearer ${token}`}});
        const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Unable to load tables.");
        if(!cancelled)setTables(payload.data);
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to load tables.");}
      finally{if(!cancelled)setLoading(false);}
    }
    loadTables();return()=>{cancelled=true;};
  },[token,tenantId,branchId]);

  const activeCount=useMemo(()=>tables.filter(t=>t.active).length,[tables]);
  const guestUrl=(table:RestaurantTable)=>`${window.location.origin}/order/${table.qrToken}`;

  async function createTable(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError("");setNotice("");
    try{
      const response=await fetch(`${API}/api/v1/tenants/${tenantId}/tables`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({branchId,tableNumber,displayName:displayName.trim()||null,seatingCapacity:Number(capacity)})});
      const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Could not create table.");
      setTables(current=>[...current,payload.data].sort((a,b)=>a.tableNumber.localeCompare(b.tableNumber,undefined,{numeric:true})));
      setTableNumber("");setDisplayName("");setCapacity("2");setShowForm(false);setNotice("Table created. Its QR code is ready to print.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to create table.");}
    finally{setSaving(false);}
  }

  async function toggleTable(table:RestaurantTable){
    if(demo)return;setError("");setNotice("");
    try{
      const response=await fetch(`${API}/api/v1/tenants/${tenantId}/tables/${table.id}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({branchId,displayName:table.displayName,seatingCapacity:table.seatingCapacity,active:!table.active})});
      const payload=await response.json();if(!response.ok||!payload.success)throw new Error(payload.message??"Could not update table.");
      setTables(current=>current.map(t=>t.id===table.id?payload.data:t));setNotice(`${table.displayName} is now ${table.active?"inactive":"active"}.`);
    }catch(e){setError(e instanceof Error?e.message:"Unable to update table.");}
  }

  async function openQr(table:RestaurantTable){
    const url=guestUrl(table);const image=await QRCode.toDataURL(url,{width:420,margin:2,errorCorrectionLevel:"H"});
    setQrPreview({table,image,url});
  }

  function downloadQr(){
    if(!qrPreview)return;const anchor=document.createElement("a");anchor.href=qrPreview.image;anchor.download=`restaurantos-${qrPreview.table.tableNumber}-qr.png`;anchor.click();
  }

  function logout(){localStorage.removeItem("restaurantos_access_token");localStorage.removeItem("restaurantos_user");router.push("/login");}

  return <main className="min-h-screen bg-[#f7f4ec]">
    <header className="flex items-center justify-between border-b border-[#e9e5dc] bg-[#fffefa] px-5 py-4 sm:px-9">
      <div className="flex items-center gap-3"><div className="brand-mark">r.</div><div><div className="font-bold tracking-tight">restaurant<span className="text-[#E56A42]">os</span></div><div className="text-[9px] uppercase tracking-[.16em] text-[#99998f]">Tables & QR</div></div></div>
      <div className="flex items-center gap-2"><Link href={ownerRoute?"/owner/":"/"} className="ghost-button hidden sm:inline-flex items-center gap-2"><ArrowLeft size={14}/> Dashboard</Link>{!demo&&<button onClick={logout} className="ghost-button">Sign out</button>}</div>
    </header>
    <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div><div className="eyebrow">Workspace / Floor setup</div><h1 className="mt-2 text-3xl font-bold tracking-[-.055em] sm:text-4xl">Tables & QR<span className="text-[#E56A42]">.</span></h1><p className="mt-3 text-sm text-[#77796f]">Create tables and give every seat area its own scan-to-order QR code.</p></div>
        {!demo&&<button onClick={()=>setShowForm(v=>!v)} className="primary-button inline-flex items-center gap-2 self-start"><Plus size={15}/> Add table</button>}
      </div>
      {demo&&<div className="mb-5 rounded-xl border border-[#ead8bd] bg-[#fbf2df] px-4 py-3 text-xs text-[#87652d]">Demo preview · Sample tables only. QR codes and live table updates require a connected backend.</div>}
      <div className="mb-6 flex flex-wrap items-center gap-3"><label className="text-xs text-[#77796f]">Restaurant</label>{memberships.length>1?<select value={tenantId} onChange={e=>{setTenantId(e.target.value);setBranchId("");}} className="ghost-button">{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select>:<span className="text-sm font-semibold">{memberships[0]?.tenantName}</span>}<label className="ml-2 text-xs text-[#77796f]">Branch</label><select value={branchId} onChange={e=>setBranchId(e.target.value)} className="ghost-button">{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label="Total tables" value={tables.length}/><Metric label="Active tables" value={activeCount}/><Metric label="Seats available" value={tables.filter(t=>t.active).reduce((sum,t)=>sum+t.seatingCapacity,0)}/></div>
      {(error||notice)&&<div role={error?"alert":"status"} className={`mb-5 rounded-xl px-4 py-3 text-xs ${error?"bg-[#fbede7] text-[#a7442a]":"bg-[#eaf2e9] text-[#527a5b]"}`}>{error||notice}</div>}
      {showForm&&<form onSubmit={createTable} className="panel mb-5 p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Add a table</h2><p className="mt-1 text-xs text-[#99998f]">A unique QR code will be generated automatically.</p></div><button type="button" onClick={()=>setShowForm(false)} aria-label="Close form"><X size={18}/></button></div><div className="grid gap-3 sm:grid-cols-3"><Field label="Table number" value={tableNumber} onChange={setTableNumber} placeholder="e.g. 01" required/><Field label="Display name" value={displayName} onChange={setDisplayName} placeholder="Optional, e.g. Window table"/><Field label="Seating capacity" value={capacity} onChange={setCapacity} placeholder="2" type="number" min="1" max="50" required/><button disabled={saving||!branchId} className="primary-button self-end disabled:opacity-50 sm:col-span-3 sm:justify-self-end">{saving?"Creating…":"Create table & QR"}</button></div></form>}
      {loading?<div className="panel py-16 text-center text-sm text-[#99998f]">Loading tables…</div>:tables.length===0?<div className="panel px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f5eee5] text-[#d56a45]"><QrCode size={23}/></div><h2 className="mt-4 font-bold">No tables yet</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#99998f]">Add your first table. RestaurantOS will generate a unique QR token for guests to open the menu.</p>{!demo&&<button onClick={()=>setShowForm(true)} className="primary-button mt-5">Add first table</button>}</div>:<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tables.map(table=><article key={table.id} className="panel p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#99998f]">Table {table.tableNumber}</div><h2 className="mt-1 text-lg font-bold">{table.displayName}</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${table.active?"bg-[#eaf2e9] text-[#527a5b]":"bg-[#efeee9] text-[#77796f]"}`}>{table.active?"Active":"Inactive"}</span></div><div className="mt-5 flex items-center gap-2 text-xs text-[#77796f]"><Users size={14}/> {table.seatingCapacity} seats</div><div className="mt-5 flex flex-wrap gap-2"><button onClick={()=>openQr(table)} disabled={!table.active} className="primary-button inline-flex items-center gap-2 disabled:opacity-40"><QrCode size={14}/> View QR</button>{!demo&&<button onClick={()=>toggleTable(table)} className="ghost-button">{table.active?"Deactivate":"Activate"}</button>}</div></article>)}</div>}
      <p className="mt-7 text-center text-[10px] text-[#aaa99f]">{demo?"RestaurantOS table workspace preview · Sample data only":"QR codes are unique to a table and branch. Deactivated tables stop resolving for guests."}</p>
    </div>
    {qrPreview&&<div className="fixed inset-0 z-50 grid place-items-center bg-[#171916]/55 p-4" onClick={()=>setQrPreview(null)}><section role="dialog" aria-modal="true" aria-label="Table QR code" className="w-full max-w-sm rounded-2xl bg-[#fffefa] p-6 text-center shadow-2xl" onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between"><div className="text-left"><div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#99998f]">Guest scan code</div><h2 className="mt-1 text-lg font-bold">{qrPreview.table.displayName}</h2></div><button onClick={()=>setQrPreview(null)} aria-label="Close QR code" className="ghost-button !p-2"><X size={16}/></button></div><img src={qrPreview.image} alt={`QR code for ${qrPreview.table.displayName}`} className="mx-auto my-5 w-64 rounded-xl border border-[#eeeae2] p-2"/><p className="break-all text-[10px] text-[#85867d]">{qrPreview.url}</p><div className="mt-5 flex gap-2"><button onClick={downloadQr} className="primary-button flex-1 inline-flex items-center justify-center gap-2"><Download size={14}/> Download PNG</button><a href={qrPreview.url} target="_blank" rel="noreferrer" className="ghost-button inline-flex items-center gap-2"><ExternalLink size={14}/> Open</a></div><p className="mt-4 text-[10px] text-[#aaa99f]">Print this code and place it on the table.</p></section></div>}
  </main>;
}

function Metric({label,value}:{label:string;value:number}){return <div className="panel p-5"><div className="text-xs text-[#85867d]">{label}</div><div className="mt-3 text-3xl font-bold tabular-nums">{value}</div></div>;}
function Field({label,value,onChange,placeholder,type="text",required=false,min,max}:{label:string;value:string;onChange:(value:string)=>void;placeholder:string;type?:string;required?:boolean;min?:string;max?:string}){return <label className="block"><span className="text-xs font-semibold text-[#55584f]">{label}{required?" *":""}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} min={min} max={max} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#d68b6d]"/></label>;}
