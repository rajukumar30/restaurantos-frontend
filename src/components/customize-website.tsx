"use client";
import {useEffect,useRef,useState} from "react";
import {Palette,ImagePlus,Store,Eye,RotateCcw,Check,Save,ArrowLeft,ChevronRight,Pencil,LayoutTemplate,RefreshCw} from "lucide-react";
import {type Branding,defaultBranding,presets,brandStyle,safeImage,resolveBranding} from "@/lib/guest-branding";
import {GuestPageHeader,GuestBrandHero,GuestBrandDetails} from "@/components/guest-branding";
import {GuestMenuDishCard,GuestFeaturedDishCard} from "@/components/guest-dish-card";
import GuestBottomNav from "@/components/guest-bottom-nav";
import ImageCropEditor,{imageSizeLabel} from "@/components/image-crop-editor";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
type Membership={tenantId:string;tenantName:string;roles?:string[]};
type ImageKey="logoUrl"|"bannerUrl";
type Tab="details"|"design"|"banner"|"sections";
const tabs=[{id:"details",label:"Restaurant details",description:"Name, logo, tagline and contact",icon:Store},{id:"design",label:"Look & feel",description:"Theme, colours and design style",icon:Palette},{id:"banner",label:"Welcome banner",description:"Banner photo, heading and message",icon:ImagePlus},{id:"sections",label:"Homepage sections",description:"Choose what guests see on Home",icon:LayoutTemplate}] as const;
const button="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dfe3d9] bg-white px-3 py-2 text-xs font-semibold hover:bg-[#f0f3ec] disabled:opacity-50";
const primary="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#c75935] px-3.5 py-2 text-sm font-bold text-white hover:bg-[#b34c2d] disabled:opacity-50";
const inputClass="mt-2 w-full rounded-xl border border-[#e0e4dc] bg-white px-3 py-3 text-sm outline-none focus:border-[#e7764c]";
export default function CustomizeWebsite(){
 const [memberships,setMemberships]=useState<Membership[]>([]),[tenant,setTenant]=useState(""),[token,setToken]=useState("");
 const [photos,setPhotos]=useState<Partial<Record<ImageKey,File>>>({});
 const [cropRequest,setCropRequest]=useState<{key:ImageKey;file:File}|null>(null);
 const photoBusy=!!cropRequest;
 const [previews,setPreviews]=useState<Partial<Record<ImageKey,string>>>({});
 useEffect(()=>{const next:Partial<Record<ImageKey,string>>={};for(const key of ["logoUrl","bannerUrl"] as const)if(photos[key])next[key]=URL.createObjectURL(photos[key]!);setPreviews(next);return()=>Object.values(next).forEach(url=>URL.revokeObjectURL(url));},[photos]);
 const [draft,setDraft]=useState<Branding|null>(null),[published,setPublished]=useState<Branding|null>(null);
 const [previewPage,setPreviewPage]=useState<"home"|"menu">("home");
 const [mobileView,setMobileView]=useState<"editor"|"preview">("editor"),[sectionOpen,setSectionOpen]=useState(false),[previewVersion,setPreviewVersion]=useState<"draft"|"published">("draft"),[retry,setRetry]=useState(0);
 const publishLock=useRef(false);const root=useRef<HTMLElement>(null);
 const [tab,setTab]=useState<Tab>("details"),[error,setError]=useState(""),[notice,setNotice]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 useEffect(()=>{try{const user=JSON.parse(localStorage.getItem("restaurantos_user")||"{}"),t=localStorage.getItem("restaurantos_access_token")||"";const m:Membership[]=user.memberships||[];if(!t||!m.length)throw Error("Sign in to customize your restaurant.");setToken(t);setMemberships(m);setTenant(m[0].tenantId);}catch(e){setError(e instanceof Error?e.message:"Sign in required");setLoading(false);}},[]);
 useEffect(()=>{if(!tenant||!token)return;const controller=new AbortController();setLoading(true);setDraft(null);setPublished(null);setPhotos({});setError("");setNotice("");
  fetch(API+"/api/v1/tenants/"+encodeURIComponent(tenant)+"/guest-website",{headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal})
  .then(async r=>{const p=await r.json();if(!r.ok||!p.success)throw Error(p.message||"Unable to load website settings");return resolveBranding({branding:p.data as Branding});})
  .then(s=>{if(!controller.signal.aborted){setDraft(s);setPublished(s);}}).catch(e=>{if(!controller.signal.aborted)setError(e.message||"Unable to load settings");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
 },[tenant,token,retry]);
 function field<K extends keyof Branding>(key:K,value:Branding[K]){setDraft(d=>d?{...d,[key]:value}:d);setNotice("");}
 const dirty=JSON.stringify(draft)!==JSON.stringify(published)||Object.keys(photos).length>0;
 useEffect(()=>{
  if(!dirty&&!saving)return;
  function beforeUnload(e:BeforeUnloadEvent){e.preventDefault();e.returnValue="";}
  function confirmLeave(){return !saving&&window.confirm("Leave the website editor and discard unpublished changes?");}
  function navigate(e:MouseEvent){
   if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
   const anchor=e.target instanceof Element?e.target.closest("a[href]"):null;
   if(!(anchor instanceof HTMLAnchorElement)||anchor.target&&anchor.target!=="_self"||anchor.hasAttribute("download"))return;
   const next=new URL(anchor.href,window.location.href);
   if(next.origin!==window.location.origin||next.pathname.replace(/\/$/,"")===window.location.pathname.replace(/\/$/,""))return;
   if(!confirmLeave()){e.preventDefault();e.stopImmediatePropagation();}
  }
  function ownerNavigation(e:Event){if(!confirmLeave())e.preventDefault();}
  window.addEventListener("beforeunload",beforeUnload);document.addEventListener("click",navigate,true);
  window.addEventListener("krlio:before-owner-signout",ownerNavigation);
  return()=>{window.removeEventListener("beforeunload",beforeUnload);document.removeEventListener("click",navigate,true);window.removeEventListener("krlio:before-owner-signout",ownerNavigation);};
 },[dirty,saving]);
 function scrollEditor(){if(window.matchMedia("(max-width: 1279px)").matches)root.current?.scrollIntoView({block:"start",behavior:"instant"});}
 function openSection(next:Tab){setTab(next);setSectionOpen(true);setMobileView("editor");scrollEditor();}
 function showPreview(){setPreviewVersion("draft");setMobileView("preview");scrollEditor();}
 function backToEditor(){setMobileView("editor");scrollEditor();}
 const changeTenant=(value:string)=>{if(saving||photoBusy)return;if(dirty&&!window.confirm("Discard unpublished changes?"))return;setTenant(value);setMobileView("editor");setSectionOpen(false);setTab("details");setPreviewPage("home");setPreviewVersion("draft");};
 function chooseTheme(theme:Branding["theme"]){const {primaryColor,accentColor,backgroundColor}=presets[theme];setDraft(d=>d?{...d,theme,primaryColor,accentColor,backgroundColor}:d);}
 function selectPhoto(key:ImageKey,file:File){setError("");setCropRequest({key,file});}
 function applyPhoto(file:File){if(!cropRequest)return;const key=cropRequest.key;setPhotos(old=>({...old,[key]:file}));field(key,"");setCropRequest(null);}
 function clearPhoto(key:ImageKey){setPhotos(old=>{const next={...old};delete next[key];return next;});field(key,"");}
 async function publish(){if(!draft||!dirty||saving||photoBusy||publishLock.current)return;setError("");setNotice("");
  if(!draft.displayName.trim()){setError("Enter a restaurant name.");openSection("details");return;}
  if([draft.logoUrl,draft.bannerUrl].some(u=>u&&!safeImage(u))){setError("Use a valid HTTPS image link, or leave it empty.");return;}
  publishLock.current=true;setSaving(true);try{const url=API+"/api/v1/tenants/"+encodeURIComponent(tenant)+"/guest-website";let r:Response;
  if(Object.keys(photos).length){const body=new FormData();body.append("settings",new Blob([JSON.stringify(draft)],{type:"application/json"}));if(photos.logoUrl)body.append("logo",photos.logoUrl);if(photos.bannerUrl)body.append("banner",photos.bannerUrl);r=await fetch(url+"/publish",{method:"POST",headers:{Authorization:"Bearer "+token},body});}else{r=await fetch(url,{method:"PUT",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(draft)});}const p=await r.json();if(!r.ok||!p.success)throw Error(p.message||"Could not publish website");const saved=resolveBranding({branding:p.data as Branding});setPublished(saved);setDraft(saved);setPhotos({});setNotice("Website published. Your existing QR codes are unchanged.");}catch(e){setError(e instanceof Error?e.message:"Could not publish website");}finally{publishLock.current=false;setSaving(false);}
 }
 function reset(){if(!draft)return;const d=defaultBranding(draft.displayName);setDraft({...draft,theme:d.theme,primaryColor:d.primaryColor,accentColor:d.accentColor,backgroundColor:d.backgroundColor,showBanner:true,showFeatured:true,showDetails:true});setNotice("Default design restored in preview. Publish to apply it.");}
 const preview=previewVersion==="published"?published:draft?{...draft,...previews}:null;
 const activeTab=tabs.find(t=>t.id===tab)!;
 const discard=()=>{if(saving||photoBusy||!dirty||!window.confirm("Discard all unpublished website changes?"))return;setDraft(published);setPhotos({});setError("");setNotice("Unpublished changes discarded.");};
 const photoField=(key:ImageKey,label:string)=>draft&&<div className="space-y-2"><p className="text-sm font-semibold">{label}</p><div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3">{(previews[key]||safeImage(draft[key]))&&<img src={previews[key]||safeImage(draft[key])} alt={label+" preview"} className={key==="logoUrl"?"h-16 w-16 shrink-0 rounded-lg bg-[#f0f2eb] object-contain":"aspect-video w-full max-w-[240px] rounded-lg object-cover"}/>}<label className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#f7f7f4] px-3 py-3 text-xs font-bold"><ImagePlus size={17}/>{photoBusy?"Preparing photo…":"Choose photo"}<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={photoBusy||saving} onChange={e=>{const file=e.target.files?.[0];if(file)selectPhoto(key,file);e.target.value="";}}/></label>{(draft[key]||photos[key])&&<button type="button" disabled={saving||photoBusy} onClick={()=>clearPhoto(key)} className="text-xs font-bold text-red-700">Remove</button>}</div><p className="text-xs text-[#788078]">{key==="logoUrl"?"Up to 256 × 256 · PNG or JPEG · max 40 KB":"960 × 540 · max 120 KB"}{photos[key]?" · optimized "+imageSizeLabel(photos[key]!.size):""}</p></div>;
 const textField=(key:"displayName"|"slogan"|"logoUrl"|"bannerUrl"|"bannerTitle"|"bannerText"|"about"|"contactPhone"|"address"|"openingHours",label:string,max:number,placeholder="",multi=false)=>draft&&<label className="block text-sm font-semibold">{label}{multi?<textarea className={inputClass} rows={3} value={draft[key]} maxLength={max} placeholder={placeholder} onChange={e=>field(key,e.target.value)}/>:<input className={inputClass} value={draft[key]} maxLength={max} placeholder={placeholder} onChange={e=>field(key,e.target.value)}/>}</label>;
 
 return <main ref={root} className="mx-auto flex min-h-[calc(100dvh-76px)] max-w-[1500px] scroll-mt-[76px] flex-col px-3 pt-4 sm:px-6">
 {cropRequest&&<ImageCropEditor file={cropRequest.file} kind={cropRequest.key==="logoUrl"?"logo":"banner"} onCancel={()=>setCropRequest(null)} onSave={applyPhoto}/>}
 <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-[#718073]">Restaurant website</p><h1 className="text-2xl font-extrabold tracking-tight">Customize Website</h1>
  {!loading&&published&&<p className="mt-1 flex items-center gap-1.5 text-xs text-[#657168]"><span className={"h-2 w-2 rounded-full "+(dirty?"bg-amber-500":"bg-[#52845f]")}/>{dirty?"Unpublished changes":"Website settings up to date"}</p>}</div>
  {memberships.length>1&&<select aria-label="Restaurant" className={button+" max-w-full"} value={tenant} disabled={saving||photoBusy} onChange={e=>changeTenant(e.target.value)}>{memberships.map(m=><option key={m.tenantId} value={m.tenantId}>{m.tenantName}</option>)}</select>}
 </header>
 {loading?<div role="status" className="rounded-xl border bg-white p-8 text-center text-sm text-[#657168]">Loading website settings…</div>:!draft?<div className="rounded-xl border bg-white p-5"><p role="alert" className="text-sm text-red-800">{error||"Unable to load website settings."}</p>{tenant&&token&&<button type="button" className={button+" mt-3"} onClick={()=>setRetry(n=>n+1)}><RefreshCw size={15}/> Retry</button>}</div>:<>
 <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl border border-[#e1e5da] bg-white p-1.5 xl:hidden">
  <button type="button" aria-pressed={mobileView==="editor"} onClick={backToEditor} className={"flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold "+(mobileView==="editor"?"bg-[#213d32] text-white":"text-[#455348]")}><Pencil size={15}/> Editor</button>
  <button type="button" aria-pressed={mobileView==="preview"} onClick={showPreview} className={"flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold "+(mobileView==="preview"?"bg-[#213d32] text-white":"text-[#455348]")}><Eye size={16}/> Preview</button>
 </div>
 <div className="min-w-0 flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-4">
  <section className={(mobileView==="editor"?"block":"hidden")+" min-w-0 xl:block"}>
   <nav aria-label="Website settings sections" className={(sectionOpen?"hidden":"block")+" overflow-hidden rounded-xl border border-[#e1e5da] bg-white xl:mb-3 xl:block"}>
    {tabs.map(({id,label,description,icon:Icon},index)=><button key={id} type="button" onClick={()=>openSection(id)} aria-current={tab===id?"true":undefined} className={"flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-[#f3f5ef] "+(index?"border-t border-[#e9ece5] ":"")+(tab===id?"xl:bg-[#eaf0e8]":"")}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#eaf0e8] text-[#426a4b]"><Icon size={19}/></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block text-xs text-[#657168]">{description}</span></span><ChevronRight size={17} className="shrink-0 text-[#657168]"/></button>)}
   </nav>
   <div className={(sectionOpen?"block":"hidden")+" rounded-xl border border-[#e1e5da] bg-white p-4 sm:p-5 xl:block"}>
    <div className="mb-4 flex items-center gap-2 border-b border-[#e9ece5] pb-3">
     <button type="button" aria-label="Back to editor sections" className={button+" !px-2 xl:hidden"} onClick={()=>{setSectionOpen(false);scrollEditor();}}><ArrowLeft size={17}/></button>
     <div className="min-w-0 flex-1"><h2 className="text-base font-extrabold">{activeTab.label}</h2><p className="text-xs text-[#657168]">{activeTab.description}</p></div>
     <button type="button" aria-label="Preview website" className={button+" !px-2 xl:hidden"} onClick={showPreview}><Eye size={17}/></button>
    </div>
 <fieldset disabled={saving||photoBusy} className="space-y-4">
 {tab==="details"&&<>{textField("displayName","Restaurant display name",120,"Your restaurant")}{textField("slogan","Tagline",160,"Fresh food, happy moments")}{photoField("logoUrl","Restaurant logo")}{textField("about","About your restaurant",1000,"Tell guests about your restaurant",true)}{textField("contactPhone","Contact number",40,"+91 …")}{textField("address","Address",300,"Restaurant address",true)}{textField("openingHours","Opening hours",200,"Monday–Sunday, 11 AM–10 PM")}</>}
 {tab==="design"&&<><h2 className="font-bold">Choose a ready-made theme</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{(Object.keys(presets) as Branding["theme"][]).map(key=>{const p=presets[key];return <button type="button" key={key} onClick={()=>chooseTheme(key)} aria-pressed={draft.theme===key} className={"rounded-xl border-2 p-3 text-left "+(draft.theme===key?"border-[#e7764c]":"border-transparent")}><div className="mb-2 rounded-lg p-3" style={{background:p.backgroundColor}}><div className="h-10 rounded-md" style={{background:p.primaryColor}}/><div className="mt-2 h-5 w-1/2 rounded" style={{background:p.accentColor}}/></div><div className="text-xs font-bold">{p.label} {draft.theme===key&&<Check size={14} className="inline"/>}</div></button>;})}</div>
 <h2 className="font-bold">Choose a coordinated colour combination</h2><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{[{label:"Krlio",p:presets.CLASSIC.primaryColor,a:presets.CLASSIC.accentColor,b:presets.CLASSIC.backgroundColor},{label:"Forest",p:"#214537",a:"#C8A46B",b:"#F3F6EF"},{label:"Spice",p:"#742E2E",a:"#E4A54C",b:"#FFF6EB"},{label:"Ocean",p:"#183C60",a:"#68C3C0",b:"#F0F6FA"},{label:"Coffee",p:"#54362B",a:"#CC9465",b:"#FCF2E7"},{label:"Midnight",p:"#292D40",a:"#D6B46D",b:"#151825"}].map(({label,p,a,b})=><button key={label} type="button" onClick={()=>setDraft(d=>d?{...d,primaryColor:p,accentColor:a,backgroundColor:b}:d)} aria-pressed={draft.primaryColor.toUpperCase()===p&&draft.accentColor.toUpperCase()===a&&draft.backgroundColor.toUpperCase()===b} className={"rounded-xl border p-3 text-left text-xs font-bold "+(draft.primaryColor.toUpperCase()===p&&draft.accentColor.toUpperCase()===a&&draft.backgroundColor.toUpperCase()===b?"border-[#63806a] ring-1 ring-[#63806a]":"border-[#e0e4dc]")}><div className="mb-2 flex overflow-hidden rounded-md border"><span className="h-7 flex-1" style={{background:p}}/><span className="h-7 flex-1" style={{background:a}}/><span className="h-7 flex-1" style={{background:b}}/></div>{label}</button>)}</div><details><summary className="cursor-pointer text-sm font-bold">Advanced colours</summary><p className="mt-2 text-xs text-[#788078]">Headings, supporting text, cards, links and button text adapt automatically for readability.</p><div className="mt-4 grid gap-4 sm:grid-cols-3">{([{key:"primaryColor",label:"Header"},{key:"accentColor",label:"Buttons"},{key:"backgroundColor",label:"Background"}] as const).map(({key,label})=><label className="text-sm font-semibold" key={key}>{label}<input aria-label={label} type="color" className="mt-2 block h-12 w-full rounded border" value={draft[key]} onChange={e=>field(key,e.target.value)}/></label>)}</div></details><button type="button" className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold" onClick={reset}><RotateCcw size={16}/> Restore Krlio default design</button></>}
 {tab==="banner"&&<>{photoField("bannerUrl","Welcome banner photo")}{textField("bannerTitle","Banner heading",120,"Welcome to our restaurant")}{textField("bannerText","Banner message",300,"Explore our special dishes",true)}<p className="text-xs text-[#788078]">Choose a wide photo from your phone. We resize and compress it automatically before publishing.</p></>}
 {tab==="sections"&&<>{([{key:"showBanner",label:"Welcome banner"},{key:"showFeatured",label:"Featured dishes"},{key:"showDetails",label:"About & contact details"}] as const).map(({key,label})=><label key={key} className="flex items-center justify-between rounded-xl border p-4 text-sm font-semibold">{label}<input type="checkbox" className="h-5 w-5 accent-[#e7764c]" checked={draft[key]} onChange={e=>field(key,e.target.checked)}/></label>)}<p className="text-xs text-[#788078]">Menu, ordering, service and order tracking always stay available.</p></>}
 </fieldset>
    <button type="button" className={button+" mt-5 w-full !border-[#213d32] !bg-[#213d32] !text-white xl:hidden"} disabled={saving||photoBusy} onClick={()=>{setSectionOpen(false);scrollEditor();}}>Done</button>
    <p className="mt-2 text-center text-[11px] text-[#657168] xl:hidden">Changes stay in your draft until you publish.</p>
   </div>
  </section>
  <aside className={(mobileView==="preview"?"block":"hidden")+" min-w-0 rounded-xl border border-[#e1e5da] bg-white p-2.5 sm:p-4 xl:sticky xl:top-24 xl:block"}>
   <div className="mb-3 flex items-center justify-between gap-2"><h2 className="flex items-center gap-2 text-sm font-bold"><Eye size={18}/> Website preview</h2><button type="button" className={button+" xl:hidden"} onClick={backToEditor}><ArrowLeft size={15}/> Editor</button></div>
   <div className="mb-2 grid grid-cols-2 gap-2">{(["draft","published"] as const).map(version=><button key={version} type="button" aria-pressed={previewVersion===version} onClick={()=>setPreviewVersion(version)} className={button+(previewVersion===version?" !border-[#63806a] !bg-[#e4ede2]":"")}>{version==="draft"?"Your draft":"Published"}</button>)}</div>
   <div className="mb-3 grid grid-cols-2 gap-2">{(["home","menu"] as const).map(page=><button key={page} type="button" onClick={()=>setPreviewPage(page)} aria-pressed={previewPage===page} className={"rounded-lg border px-3 py-2 text-xs font-semibold "+(previewPage===page?"bg-[#213d32] text-white":"bg-white")}>{page==="home"?"Home / featured":"Menu"}</button>)}</div>
   {preview&&<div className="guest-theme mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl border border-[#dfe3d9] xl:rounded-[24px] xl:border-[4px] xl:border-[#1b241f]" style={brandStyle(preview)}>
    <GuestPageHeader branding={preview} tableName="Table 01"/>
    <div className="p-3"><GuestBrandHero branding={preview} tableName="Table 01" compact={previewPage==="menu"} onExplore={previewPage==="home"?()=>setPreviewPage("menu"):undefined}/>
    {(previewPage==="menu"||preview.showFeatured)&&<><div className="mb-3 flex items-center justify-between gap-2"><h3 className="font-bold">{previewPage==="home"?"Explore the menu":"All dishes"}</h3>{previewPage==="home"&&<button type="button" className="text-xs font-bold text-[var(--guest-link)]" onClick={()=>setPreviewPage("menu")}>See all dishes →</button>}</div><div className="grid grid-cols-2 gap-2">{[{id:"one",name:"Paneer tikka",price:249,dietaryType:"VEG",prepTimeMinutes:15},{id:"two",name:"Chicken biryani",price:299,dietaryType:"NON_VEG",prepTimeMinutes:20}].map(item=>previewPage==="menu"?<GuestMenuDishCard key={item.id} item={item} quantity={0}/>:<GuestFeaturedDishCard key={item.id} item={item} quantity={0}/>)}</div></>}
    {previewPage==="home"&&<GuestBrandDetails branding={preview}/>}</div>
    <GuestBottomNav qrToken="" active={previewPage} preview onNavigate={page=>{if(page==="home"||page==="menu")setPreviewPage(page);}}/>
   </div>}
   <p className="mt-3 text-center text-xs text-[#657168]">Example dishes only. Preview does not place orders or change your live menu.</p>
   <button type="button" className={button+" mt-3 w-full xl:hidden"} onClick={backToEditor}>Back to editor</button>
  </aside>
 </div>
 <footer className="sticky bottom-0 z-30 -mx-3 mt-4 shrink-0 border-t border-[#e1e5da] bg-[#fffefa] px-3 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,.05)] sm:-mx-6 sm:px-6">
  {error&&<p role="alert" className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">{error}</p>}
  {notice&&<p role="status" className="mb-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-800">{notice}</p>}
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-medium text-[#657168]">{saving?"Publishing website…":dirty?"Unpublished changes":"No unpublished changes"}</p><div className="grid grid-cols-[1fr_1.5fr] gap-2 sm:flex"><button disabled={!dirty||saving||photoBusy} type="button" className={button+" sm:min-w-24"} onClick={discard}>Discard</button><button disabled={!dirty||saving||photoBusy} type="button" onClick={()=>void publish()} className={primary+" sm:min-w-40"}><Save size={16}/>{saving?"Publishing…":"Publish changes"}</button></div></div>
 </footer>
 </>}
 </main>;
}
