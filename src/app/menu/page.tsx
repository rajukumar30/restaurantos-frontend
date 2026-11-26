"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CirclePlus, Clock3, ImagePlus, LogOut, Plus, Search, Utensils, X } from "lucide-react";
import Link from "next/link";
import ImageCropEditor,{imageSizeLabel} from "@/components/image-crop-editor";
import {menuThumbnail} from "@/lib/guest-branding";
import { usePathname, useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
type Membership = { tenantId: string; tenantName: string; roles: string };
type Branch = { id: string; name: string; branchCode: string };
type MenuItem = { id: string; categoryId: string; name: string; description?: string; price: number; dietaryType: "VEG"|"NON_VEG"|"EGG"; prepTimeMinutes: number; available: boolean; imageUrl?: string };
type Category = { id: string; name: string; description?: string; sortOrder: number; active: boolean; items: MenuItem[] };

const emptyItem = { categoryId:"", name:"", description:"", price:"", dietaryType:"VEG", prepTimeMinutes:"15", imageUrl:"" };

export default function MenuPage() {
 const ownerRoute=usePathname().startsWith("/owner");
  const router=useRouter();
  const [token,setToken]=useState("");
  const [demoMode,setDemoMode]=useState(false);
  const [memberships,setMemberships]=useState<Membership[]>([]);
  const [tenantId,setTenantId]=useState("");
  const [branches,setBranches]=useState<Branch[]>([]);
  const [branchId,setBranchId]=useState("");
  const [categories,setCategories]=useState<Category[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [search,setSearch]=useState("");
  const [categoryForm,setCategoryForm]=useState(false);
  const [itemForm,setItemForm]=useState(false);
  const [newCategory,setNewCategory]=useState({name:"",description:""});
  const [newItem,setNewItem]=useState(emptyItem);
  const [uploading,setUploading]=useState(false);
  const [dishPhoto,setDishPhoto]=useState<File|null>(null),[dishPreview,setDishPreview]=useState("");
  const [cropRequest,setCropRequest]=useState<{file:File;itemId?:string;tenant:string;branch:string}|null>(null);
  useEffect(()=>{if(!dishPhoto){setDishPreview("");return;}const url=URL.createObjectURL(dishPhoto);setDishPreview(url);return()=>URL.revokeObjectURL(url);},[dishPhoto]);
  useEffect(()=>{setDishPhoto(null);setCropRequest(null);},[tenantId,branchId]);

  useEffect(()=>{
    const accessToken=localStorage.getItem("restaurantos_access_token")??"";
    const rawUser=localStorage.getItem("restaurantos_user");
    if(!accessToken||!rawUser){
      const demoRequested=new URLSearchParams(window.location.search).get("demo")==="1";
      if(demoRequested){
        const demoTenant="demo-restaurant";
        const demoBranch="demo-main";
        setDemoMode(true);
        setMemberships([{tenantId:demoTenant,tenantName:"The Olive Kitchen",roles:"Owner"}]);
        setTenantId(demoTenant);
        setBranches([{id:demoBranch,name:"Indiranagar · Main branch",branchCode:"MAIN"}]);
        setBranchId(demoBranch);
        setCategories([
          {id:"cat-small-plates",name:"Small plates",description:"A little something to start",sortOrder:0,active:true,items:[
            {id:"item-paneer",categoryId:"cat-small-plates",name:"Tandoori paneer tikka",description:"Smoky paneer, mint chutney, pickled onions",price:289,dietaryType:"VEG",prepTimeMinutes:18,available:true},
            {id:"item-chicken",categoryId:"cat-small-plates",name:"Chicken malai kebab",description:"Creamy marinade, charred lemon",price:349,dietaryType:"NON_VEG",prepTimeMinutes:20,available:false}
          ]},
          {id:"cat-mains",name:"From the kitchen",description:"Comfort food, made fresh",sortOrder:1,active:true,items:[
            {id:"item-biryani",categoryId:"cat-mains",name:"Hyderabadi chicken biryani",description:"Long-grain basmati, slow cooked dum style",price:379,dietaryType:"NON_VEG",prepTimeMinutes:25,available:true},
            {id:"item-dal",categoryId:"cat-mains",name:"Dal makhani",description:"Black lentils, slow simmered overnight",price:269,dietaryType:"VEG",prepTimeMinutes:15,available:true}
          ]},
          {id:"cat-drinks",name:"Drinks",description:"Something to sip",sortOrder:2,active:true,items:[
            {id:"item-nimbu",categoryId:"cat-drinks",name:"Fresh masala nimbu soda",description:"Fresh lime, roasted cumin, sparkling soda",price:119,dietaryType:"VEG",prepTimeMinutes:5,available:true}
          ]}
        ]);
        setLoading(false);
        return;
      }
      router.replace("/login");return;
    }
    try{
      const user=JSON.parse(rawUser);
      const available:Membership[]=user.memberships??[];
      if(!available.length){router.replace("/login");return;}
      setToken(accessToken);setMemberships(available);setTenantId(available[0].tenantId);
    }catch{router.replace("/login");}
  },[router]);

  useEffect(()=>{
    if(!token||!tenantId)return;
    let cancelled=false;
    async function loadBranches(){
      setLoading(true);setError("");
      try{
        const response=await fetch(`${API}/api/v1/tenants/${tenantId}/branches`,{headers:{Authorization:`Bearer ${token}`}});
        const payload=await response.json();
        if(!response.ok||!payload.success)throw new Error(payload.message??"Unable to load branches.");
        if(!cancelled){setBranches(payload.data);setBranchId(current=>payload.data.some((b:Branch)=>b.id===current)?current:(payload.data[0]?.id??""));}
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to load branches.");}
      finally{if(!cancelled)setLoading(false);}
    }
    loadBranches();return()=>{cancelled=true;};
  },[token,tenantId]);

  useEffect(()=>{
    if(!token||!tenantId||!branchId)return;
    let cancelled=false;
    async function loadMenu(){
      setLoading(true);setError("");
      try{
        const response=await fetch(`${API}/api/v1/tenants/${tenantId}/menu?branchId=${branchId}`,{headers:{Authorization:`Bearer ${token}`}});
        const payload=await response.json();
        if(!response.ok||!payload.success)throw new Error(payload.message??"Unable to load menu.");
        if(!cancelled)setCategories(payload.data);
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"Unable to load menu.");}
      finally{if(!cancelled)setLoading(false);}
    }
    loadMenu();return()=>{cancelled=true;};
  },[token,tenantId,branchId]);

  const allItems=useMemo(()=>categories.flatMap(category=>category.items),[categories]);
  const filteredCategories=useMemo(()=>categories.map(category=>({...category,items:category.items.filter(item=>[item.name,item.description,category.name].some(value=>value?.toLowerCase().includes(search.toLowerCase())))})).filter(category=>category.items.length>0||(!search&&category.active)),[categories,search]);
  const activeItems=allItems.filter(item=>item.available).length;

  async function refreshMenu(){
    const response=await fetch(`${API}/api/v1/tenants/${tenantId}/menu?branchId=${branchId}`,{headers:{Authorization:`Bearer ${token}`}});
    const payload=await response.json();
    if(!response.ok||!payload.success)throw new Error(payload.message??"Unable to refresh menu.");
    setCategories(payload.data);
  }

  async function addCategory(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError("");setNotice("");
    try{
      const response=await fetch(`${API}/api/v1/tenants/${tenantId}/menu/categories`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({...newCategory,branchId,sortOrder:categories.length})});
      const payload=await response.json();
      if(!response.ok||!payload.success)throw new Error(payload.message??"Could not create category.");
      setNewCategory({name:"",description:""});setCategoryForm(false);await refreshMenu();setNotice("Category added to your menu.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to create category.");}
    finally{setSaving(false);}
  }

  function uploadMenuImage(file:File,itemId?:string){
    if(!token||!tenantId||!branchId){setError("Select a restaurant branch first.");return;}
    setCropRequest({file,itemId,tenant:tenantId,branch:branchId});
  }
  async function applyImage(file:File){
    const request=cropRequest;if(!request||request.tenant!==tenantId||request.branch!==branchId)throw Error("Restaurant changed. Select the photo again.");
    if(!request.itemId){setDishPhoto(file);setCropRequest(null);return;}
    setUploading(true);setError("");
    try{const body=new FormData();body.append("image",file);const response=await fetch(API+"/api/v1/tenants/"+tenantId+"/menu/items/"+request.itemId+"/image?branchId="+encodeURIComponent(branchId),{method:"PUT",headers:{Authorization:"Bearer "+token},body});const payload=await response.json();if(!response.ok||!payload.success)throw Error(payload.message||"Unable to replace photo");setCropRequest(null);await refreshMenu();setNotice("Dish image updated.");}finally{setUploading(false);}
  }
  async function removeImage(itemId:string){
    if(!window.confirm("Remove this dish photo?"))return;setUploading(true);setError("");
    try{const r=await fetch(API+"/api/v1/tenants/"+tenantId+"/menu/items/"+itemId+"/image?branchId="+encodeURIComponent(branchId),{method:"DELETE",headers:{Authorization:"Bearer "+token}});const p=await r.json();if(!r.ok||!p.success)throw Error(p.message||"Unable to remove image");await refreshMenu();}catch(e){setError(e instanceof Error?e.message:"Unable to remove image.");}finally{setUploading(false);}
  }
  async function addItem(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setSaving(true);setError("");setNotice("");
    try{
      const item={categoryId:newItem.categoryId,name:newItem.name,description:newItem.description,price:Number(newItem.price),dietaryType:newItem.dietaryType,prepTimeMinutes:Number(newItem.prepTimeMinutes),branchId};
      let response:Response;const url=API+"/api/v1/tenants/"+tenantId+"/menu/items";
      if(dishPhoto){const body=new FormData();body.append("item",new Blob([JSON.stringify(item)],{type:"application/json"}));body.append("image",dishPhoto);response=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+token},body});}
      else response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify(item)});
      const payload=await response.json();
      if(!response.ok||!payload.success)throw new Error(payload.message??"Could not add menu item.");
      setNewItem(emptyItem);setDishPhoto(null);setItemForm(false);await refreshMenu();setNotice("Menu item added.");
    }catch(e){setError(e instanceof Error?e.message:"Unable to create menu item.");}
    finally{setSaving(false);}
  }

  async function toggleAvailability(item:MenuItem){
    setError("");setNotice("");
    try{
      const response=await fetch(`${API}/api/v1/tenants/${tenantId}/menu/items/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({branchId,price:item.price,available:!item.available})});
      const payload=await response.json();
      if(!response.ok||!payload.success)throw new Error(payload.message??"Could not update item.");
      await refreshMenu();setNotice(`${item.name} is now ${item.available?"unavailable":"available"} at this branch.`);
    }catch(e){setError(e instanceof Error?e.message:"Unable to update item.");}
  }

  function logout(){localStorage.removeItem("restaurantos_access_token");localStorage.removeItem("restaurantos_user");router.push("/login");}

  return <main className="min-h-screen bg-[#f7f4ec]">{cropRequest&&<ImageCropEditor file={cropRequest.file} kind="item" onCancel={()=>setCropRequest(null)} onSave={applyImage}/>}
    <header className="flex items-center justify-between border-b border-[#e9e5dc] bg-[#fffefa] px-5 py-4 sm:px-9">
      <div className="flex items-center gap-3"><div className="brand-mark">r.</div><div><div className="font-bold tracking-tight">restaurant<span className="text-[#E56A42]">os</span></div><div className="text-[9px] uppercase tracking-[.16em] text-[#99998f]">Menu management</div></div></div>
      <div className="flex items-center gap-2"><Link href={ownerRoute?"/owner/":"/"} className="ghost-button hidden sm:inline-flex items-center gap-2"><ArrowLeft size={14}/> Dashboard</Link><button onClick={logout} className="ghost-button inline-flex items-center gap-2"><LogOut size={14}/> Sign out</button></div>
    </header>
    <div className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between mb-8">
        <div><div className="eyebrow">Workspace / Catalogue</div><h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-[-.055em]">Your menu<span className="text-[#E56A42]">.</span></h1><p className="mt-3 text-sm text-[#77796f]">Build your catalogue and control what guests can order at each branch.</p></div>
        {!demoMode&&<div className="flex flex-wrap gap-2"><button onClick={()=>{setCategoryForm(v=>!v);setItemForm(false);}} className="ghost-button inline-flex items-center gap-2"><Plus size={14}/> Add category</button><button onClick={()=>{setItemForm(v=>!v);setCategoryForm(false);}} className="primary-button inline-flex items-center gap-2"><CirclePlus size={15}/> Add menu item</button></div>}
      </div>
      {demoMode&&<div className="mb-5 rounded-xl border border-[#ead8bd] bg-[#fbf2df] px-4 py-3 text-xs text-[#87652d]">Demo preview · Sample menu data only. Sign-in and live menu updates are not connected in this preview.</div>}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {memberships.length>1&&<select value={tenantId} onChange={e=>{setTenantId(e.target.value);setBranchId("");}} className="ghost-button bg-[#fffefa]">{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select>}
          <label className="text-xs text-[#77796f]">Branch</label><select value={branchId} onChange={e=>setBranchId(e.target.value)} className="ghost-button bg-[#fffefa]">{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-3"><Search size={15} className="text-[#99998f]"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search dishes or categories" className="w-full bg-transparent py-2.5 text-xs outline-none sm:w-56"/></div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-6">
        <Metric label="Categories" value={categories.length}/><Metric label="Menu items" value={allItems.length}/><Metric label="Available now" value={activeItems}/>
      </div>
      {(error||notice)&&<div role={error?"alert":"status"} className={`mb-5 rounded-xl px-4 py-3 text-xs ${error?"bg-[#fbede7] text-[#a7442a]":"bg-[#eaf2e9] text-[#527a5b]"}`}>{error||notice}</div>}
      {categoryForm&&<form onSubmit={addCategory} className="panel mb-5 p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Create a category</h2><p className="mt-1 text-xs text-[#99998f]">Examples: Starters, Main course, Beverages.</p></div><button type="button" onClick={()=>setCategoryForm(false)} aria-label="Close category form"><X size={18}/></button></div><div className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]"><Field label="Category name" value={newCategory.name} onChange={v=>setNewCategory(p=>({...p,name:v}))} placeholder="e.g. Starters" required/><Field label="Short description" value={newCategory.description} onChange={v=>setNewCategory(p=>({...p,description:v}))} placeholder="Optional description"/><button disabled={saving||!branchId} className="primary-button self-end disabled:opacity-50">{saving?"Saving…":"Save category"}</button></div></form>}
      {itemForm&&<form onSubmit={addItem} className="panel mb-5 p-5 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold">Add a menu item</h2><p className="mt-1 text-xs text-[#99998f]">The item will be added to this branch&apos;s menu.</p></div><button type="button" onClick={()=>setItemForm(false)} aria-label="Close item form"><X size={18}/></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Dish name" value={newItem.name} onChange={v=>setNewItem(p=>({...p,name:v}))} placeholder="e.g. Paneer tikka" required/>
        <Field label="Description" value={newItem.description} onChange={v=>setNewItem(p=>({...p,description:v}))} placeholder="Ingredients or details"/>
        <Field label="Price (₹)" value={newItem.price} onChange={v=>setNewItem(p=>({...p,price:v}))} placeholder="249" type="number" required min="0.01" step="0.01"/>
        <label className="block"><span className="text-xs font-semibold text-[#55584f]">Category *</span><select required value={newItem.categoryId} onChange={e=>setNewItem(p=>({...p,categoryId:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm"><option value="">Choose category</option>{categories.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="block"><span className="text-xs font-semibold text-[#55584f]">Dietary type</span><select value={newItem.dietaryType} onChange={e=>setNewItem(p=>({...p,dietaryType:e.target.value}))} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm"><option value="VEG">Vegetarian</option><option value="NON_VEG">Non-vegetarian</option><option value="EGG">Contains egg</option></select></label>
        <Field label="Prep time (minutes)" value={newItem.prepTimeMinutes} onChange={v=>setNewItem(p=>({...p,prepTimeMinutes:v}))} placeholder="15" type="number" required min="1" max="240"/>
      </div><div className="mt-4 rounded-xl border border-dashed border-[#e4dfd4] p-4"><label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold"><ImagePlus size={18}/> {uploading?"Uploading image…":"Choose dish photo (800 × 640 · max 100 KB after compression)"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={e=>{const file=e.target.files?.[0];if(file)void uploadMenuImage(file);e.target.value="";}}/></label>{dishPreview&&<div className="mt-3 flex items-center gap-3"><img src={dishPreview} alt="Dish preview" className="h-20 w-24 rounded-lg object-cover"/><span className="text-xs">{dishPhoto?imageSizeLabel(dishPhoto.size):""} · ready to save</span><button type="button" className="ghost-button" onClick={()=>setDishPhoto(null)}>Remove image</button></div>}</div><div className="mt-5 flex justify-end"><button disabled={saving||uploading||!categories.some(c=>c.active)} className="primary-button disabled:opacity-50">{saving?"Adding…":"Add to menu"}</button></div></form>}
      {loading?<div className="panel py-16 text-center text-sm text-[#99998f]">Loading your menu…</div>:filteredCategories.length===0?<div className="panel px-6 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f5eee5] text-[#d56a45]"><Utensils size={22}/></div><h2 className="mt-4 font-bold">{search?"No matching dishes":"Your menu is ready for its first dish"}</h2><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#99998f]">{search?"Try another search term.":"Start by creating categories like Starters or Main course, then add dishes with prices and preparation times."}</p>{!search&&<button onClick={()=>{setCategoryForm(true);setItemForm(false);}} className="primary-button mt-5">Create first category</button>}</div>:<div className="space-y-5">{filteredCategories.map(category=><section key={category.id} className="panel overflow-hidden"><div className="flex items-center justify-between gap-3 border-b border-[#eeeae2] px-5 py-4 sm:px-6"><div><div className="font-bold">{category.name}</div><div className="mt-1 text-xs text-[#99998f]">{category.description||`${category.items.length} items in this category`}</div></div><span className="rounded-full bg-[#f5eee5] px-3 py-1 text-[10px] font-bold text-[#9a684d]">{category.items.length} items</span></div>{category.items.length===0?<p className="px-6 py-7 text-xs text-[#99998f]">No items in this category yet.</p>:<div className="divide-y divide-[#f0ede6]">{category.items.map(item=><div key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6"><div className={`grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl ${item.dietaryType==="VEG"?"bg-[#eaf2e9] text-[#527a5b]":item.dietaryType==="EGG"?"bg-[#fbf2dc] text-[#a77a2d]":"bg-[#fbede7] text-[#c65e3d]"}`}>{item.imageUrl?<img src={menuThumbnail(item.imageUrl)} alt={item.name} loading="lazy" className="h-full w-full object-cover"/>:<Utensils size={17}/>}</div><div className="min-w-[150px] flex-1"><div className="text-sm font-bold">{item.name}</div><div className="mt-1 text-[11px] text-[#85867d]">{item.description||item.dietaryType.replace("_"," ")} · <Clock3 size={11} className="inline"/> {item.prepTimeMinutes} min</div></div><div className="mr-2 text-sm font-bold tabular-nums">₹{Number(item.price).toFixed(2)}</div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.available?"bg-[#eaf2e9] text-[#527a5b]":"bg-[#efeee9] text-[#77796f]"}`}>{item.available?"Available":"Unavailable"}</span>{!demoMode&&<><label className="ghost-button cursor-pointer !px-3 !py-2 text-xs">{item.imageUrl?"Replace photo":"Add photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading||saving} onChange={event=>{const file=event.target.files?.[0];if(file)uploadMenuImage(file,item.id);event.target.value="";}}/></label>{item.imageUrl&&<button type="button" disabled={uploading||saving} onClick={()=>void removeImage(item.id)} className="ghost-button !px-3 !py-2 text-xs">Remove photo</button>}</>}{!demoMode&&<button onClick={()=>toggleAvailability(item)} className="ghost-button !px-3 !py-2">{item.available?"Mark sold out":"Make available"}</button>}</div>)}</div>}</section>)}</div>}
      <p className="mt-7 text-center text-[10px] text-[#aaa99f]">{demoMode?"RestaurantOS menu workspace preview · Sample data only":"Menu prices and availability are branch-specific. Changes apply to the selected branch."}</p>
    </div>
  </main>;
}

function Metric({label,value}:{label:string;value:number}){return <div className="panel p-5"><div className="text-xs text-[#85867d]">{label}</div><div className="mt-3 text-3xl font-bold tabular-nums">{value}</div></div>;}
function Field({label,value,onChange,placeholder,type="text",required=false,min,step,max}: {label:string;value:string;onChange:(v:string)=>void;placeholder:string;type?:string;required?:boolean;min?:string;max?:string;step?:string}){return <label className="block"><span className="text-xs font-semibold text-[#55584f]">{label}{required?" *":""}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} required={required} min={min} max={max} step={step} className="mt-2 w-full rounded-xl border border-[#e4dfd4] bg-[#fffefa] px-4 py-3 text-sm outline-none focus:border-[#d68b6d]"/></label>;}
