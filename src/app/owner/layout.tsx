"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
import {useEffect,useState} from "react";
import {TrendingUp,MessageSquare,Tag,Heart,LayoutDashboard,ChefHat,UtensilsCrossed,Smartphone,Users,Menu,X,LogOut,Sparkles,ShieldCheck,ReceiptText,Palette} from "lucide-react";
import "./owner.css";
import {useSessionGuard,isSessionExpired,clearSessionAndRedirect} from "@/lib/session-guard";
const API=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
const featureByRoute:Record<string,string>={"/owner/floor":"GUEST_ORDERING","/owner/orders":"GUEST_ORDERING","/owner/tables":"QR_MENU","/owner/website":"QR_MENU"};
const navigation=[{href:"/owner/",label:"Overview",icon:LayoutDashboard},{href:"/owner/floor",label:"Live Floor",icon:LayoutDashboard},{href:"/owner/analytics",label:"Analytics & reports",icon:TrendingUp},{href:"/owner/orders",label:"Orders & kitchen",icon:ChefHat},{href:"/owner/menu",label:"Menu management",icon:UtensilsCrossed},{href:"/owner/website",label:"Customize Website",icon:Palette},{href:"/owner/tables",label:"Tables & QR",icon:Smartphone},{href:"/owner/staff",label:"Team & access",icon:Users},{href:"/owner/feedback",label:"Customer feedback",icon:MessageSquare},{href:"/owner/promotions",label:"Discounts & offers",icon:Tag},{href:"/owner/customers",label:"Customers & loyalty",icon:Heart},{href:"/owner/features",label:"Plan & features",icon:ShieldCheck},{href:"/owner/billing",label:"Billing & invoices",icon:ReceiptText}];
export default function OwnerLayout({children}:{children:React.ReactNode}){
 const pathname=usePathname();const router=useRouter();const [open,setOpen]=useState(false);const [authorized,setAuthorized]=useState(false);
 const [tenantId,setTenantId]=useState("");
 const [allowedFeatures,setAllowedFeatures]=useState<Set<string>>(new Set());
 const [featureError,setFeatureError]=useState("");
 const [featuresLoading,setFeaturesLoading]=useState(true);
 useSessionGuard(authorized);const [restaurant,setRestaurant]=useState("Owner portal");const branch="Restaurant workspace";
 useEffect(()=>{const token=localStorage.getItem("restaurantos_access_token"),raw=localStorage.getItem("restaurantos_user");if(!token||isSessionExpired(token)){clearSessionAndRedirect(pathname);return;}if(!raw){router.replace("/login?next="+encodeURIComponent(pathname));return;}try{const user=JSON.parse(raw);const roles=JSON.stringify(user.memberships??[]).toUpperCase();if(!roles.includes("OWNER")&&!user.authorities?.includes("PLATFORM_ADMIN")){router.replace("/");return;}setRestaurant(user.memberships?.[0]?.tenantName||"Owner portal");setTenantId(user.memberships?.[0]?.tenantId||"");setAuthorized(true);}catch{router.replace("/login");}},[pathname,router]);
 useEffect(()=>{
  if(!authorized||!tenantId){setAllowedFeatures(new Set());setFeaturesLoading(false);return;}
  const controller=new AbortController();
  const token=localStorage.getItem("restaurantos_access_token");
  if(!token){setAllowedFeatures(new Set());setFeaturesLoading(false);return;}
  setAllowedFeatures(new Set());setFeaturesLoading(true);setFeatureError("");
  fetch(API+"/api/v1/tenants/"+encodeURIComponent(tenantId)+"/entitlements",{
   headers:{Authorization:"Bearer "+token},cache:"no-store",signal:controller.signal
  }).then(async response=>{
   const payload=await response.json();
   if(!response.ok||!payload.success||!Array.isArray(payload.data?.features))
    throw new Error(payload.message||"Could not verify subscription features");
   return payload.data.features as {key:string;effectiveEnabled:boolean}[];
  }).then(features=>{if(!controller.signal.aborted)setAllowedFeatures(new Set(features.filter(f=>f.effectiveEnabled).map(f=>f.key)));})
   .catch(()=>{if(!controller.signal.aborted){setAllowedFeatures(new Set());setFeatureError("Subscription features could not be verified. Some menu items are temporarily hidden.");}})
   .finally(()=>{if(!controller.signal.aborted)setFeaturesLoading(false);});
  return()=>controller.abort();
 },[authorized,tenantId]);
 const visibleNavigation=navigation.filter(item=>!featureByRoute[item.href]||(!featuresLoading&&allowedFeatures.has(featureByRoute[item.href])));
 if(!authorized)return <main className="grid min-h-screen place-items-center text-sm text-[#77796f]">Opening owner workspace…</main>;
 const requiredFeature=featureByRoute[pathname.replace(/\/$/,"")];
 if(requiredFeature&&featuresLoading)return <main className="grid min-h-screen place-items-center text-sm text-[#77796f]">Verifying subscription access…</main>;
 if(requiredFeature&&!allowedFeatures.has(requiredFeature))return <main className="grid min-h-screen place-items-center bg-[#f7f7f4] p-6"><div className="max-w-md rounded-2xl border bg-white p-8 text-center"><ShieldCheck className="mx-auto mb-3 text-[#e7764c]"/><h1 className="text-lg font-bold">Feature not available</h1><p className="mt-2 text-sm text-[#77796f]">This feature is not enabled under the restaurant&apos;s current subscription.</p><Link href="/owner/features" className="mt-5 inline-block rounded-xl bg-[#1b241f] px-5 py-3 text-sm text-white">View plan & features</Link></div></main>;
 const active=(href:string)=>pathname===href||pathname+"/"===href;
 const logout=()=>{if(!window.dispatchEvent(new Event("krlio:before-owner-signout",{cancelable:true})))return;localStorage.removeItem("restaurantos_access_token");localStorage.removeItem("restaurantos_user");router.replace("/login");};
 return <div className="owner-portal min-h-screen bg-[#f7f7f4] text-[#20241f] lg:flex">
 {open&&<button aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={()=>setOpen(false)}/>}
 <aside className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#1b241f] text-white transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open?"translate-x-0":"-translate-x-full"}`}>
  <div className="flex items-center justify-between px-6 pb-7 pt-7"><Link href="/owner/" className="flex items-center gap-3" onClick={()=>setOpen(false)}><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e7764c] text-xl font-black">r.</span><span className="text-xl font-extrabold tracking-[-.06em]">restaurant<span className="text-[#f18c66]">os</span></span></Link><button className="lg:hidden" aria-label="Close menu" onClick={()=>setOpen(false)}><X size={20}/></button></div>
  <div className="mx-4 mb-8 rounded-2xl border border-white/10 bg-white/[.06] p-3"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#aebdb2]"><span className="h-2 w-2 rounded-full bg-[#74c999]"/>Restaurant workspace</div><p className="mt-2 truncate text-sm font-semibold">{restaurant}</p><p className="mt-1 truncate text-xs text-[#aebdb2]">{branch}</p></div>
  <nav className="min-h-0 flex-1 overflow-y-auto px-3" aria-label="Main navigation"><p className="px-4 pb-3 text-[10px] font-bold uppercase tracking-[.17em] text-[#879b8e]">Workspace</p>{visibleNavigation.map(({href,label,icon:Icon})=><Link key={href} href={href} onClick={()=>setOpen(false)} aria-current={active(href)?"page":undefined} className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-[13px] font-semibold transition-colors ${active(href)?"bg-[#e7764c] text-white":"text-[#b9c7bb] hover:bg-white/10 hover:text-white"}`}><Icon size={18}/>{label}</Link>)}{featureError&&<p role="status" className="mx-3 mt-3 rounded-lg bg-amber-950/40 p-3 text-xs text-amber-100">{featureError} <Link href="/owner/features" className="underline">View plan</Link></p>}</nav>
  <div className="m-4 rounded-2xl bg-[#29392f] p-4"><div className="flex items-center gap-2 text-xs font-bold text-[#e4f0e6]"><Sparkles size={15} className="text-[#efad7e]"/>RestaurantOS V2</div><p className="mt-2 text-xs leading-5 text-[#b3c5b7]">A clearer view of your restaurant, every day.</p></div>
  <button onClick={logout} className="mx-4 mb-5 flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-[#d7dfd8] hover:bg-white/10"><LogOut size={17}/>Sign out</button>
 </aside>
 <div className="min-w-0 flex-1">
  <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-[#e9ebe5] bg-white/95 px-4 backdrop-blur sm:px-8">
   <div className="flex min-w-0 items-center gap-3"><button aria-label="Open navigation" className="rounded-xl border border-[#e8e9e4] p-2.5 lg:hidden" onClick={()=>setOpen(true)}><Menu size={19}/></button><div className="min-w-0"><p className="text-[11px] font-medium text-[#899087]">Workspace / {navigation.find(n=>active(n.href))?.label??"Owner"}</p><p className="truncate text-sm font-bold sm:text-base">{restaurant}</p></div></div>
   <div className="flex items-center gap-3"><span className="hidden text-xs text-[#899087] sm:block">Restaurant workspace</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5e6db] text-sm font-bold text-[#ba623c]">{restaurant.charAt(0).toUpperCase()}</span></div>
  </header>
  <div className="owner-page min-w-0">{children}</div>
 </div>
 </div>;
}
