"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, ChartColumnIncreasing, ChefHat, LayoutDashboard, LogOut, Menu, PlusCircle, Settings2, ShieldCheck, X, Users, Activity, Headphones, Bell, ScrollText, SlidersHorizontal, Package, Wallet } from "lucide-react";

const groups = [
  {label:"OVERVIEW",items:[
    {label:"Dashboard",href:"/admin/dashboard",icon:LayoutDashboard,ready:true},
    {label:"Analytics & Reports",href:"/admin/analytics",icon:ChartColumnIncreasing,ready:true}
  ]},
  {label:"RESTAURANT MANAGEMENT",items:[
    {label:"Restaurants",href:"/admin/restaurants",icon:Building2,ready:true},
    {label:"Onboard restaurant",href:"/admin/restaurants/new",icon:PlusCircle,ready:true},
    {label:"Feature management",href:"/admin/restaurants/features",icon:Settings2,ready:true},
    {label:"Service workflows",href:"/admin/restaurants/service",icon:ChefHat,ready:true}
  ]},
  {label:"BUSINESS",items:[
    {label:"Plans & Subscriptions",href:"/admin/plans",icon:Package,ready:false},
    {label:"Billing & Payments",href:"/admin/billing",icon:Wallet,ready:false}
  ]},
  {label:"OPERATIONS",items:[
    {label:"Users & Access",href:"/admin/users",icon:Users,ready:false},
    {label:"System Monitoring",href:"/admin/monitoring",icon:Activity,ready:false},
    {label:"Support Center",href:"/admin/support",icon:Headphones,ready:false},
    {label:"Notifications",href:"/admin/notifications",icon:Bell,ready:false}
  ]},
  {label:"PLATFORM",items:[
    {label:"Security & Audit Logs",href:"/admin/audit",icon:ScrollText,ready:true},
    {label:"Platform Settings",href:"/admin/settings",icon:SlidersHorizontal,ready:false}
  ]}
] as const;

export default function PlatformAdminLayout({children}:{children:ReactNode}) {
  const pathname=usePathname();
  const router=useRouter();
  const [authorized,setAuthorized]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  useEffect(()=>{
    const token=localStorage.getItem("restaurantos_access_token");
    const raw=localStorage.getItem("restaurantos_user");
    if(!token||!raw){router.replace("/login?next="+encodeURIComponent(pathname));return;}
    try {
      const user=JSON.parse(raw) as {authorities?:string[]};
      if(!user.authorities?.includes("PLATFORM_ADMIN")){router.replace("/");return;}
      setAuthorized(true);
    }catch{router.replace("/login");}
  },[pathname,router]);
  useEffect(()=>setMenuOpen(false),[pathname]);
  function logout(){
    localStorage.removeItem("restaurantos_access_token");
    localStorage.removeItem("restaurantos_user");
    router.replace("/login");
  }
  if(!authorized)return <div className="grid min-h-screen place-items-center bg-[#f7f4ec] text-sm text-[#77796f]">Checking platform administrator access…</div>;
  return <div className="min-h-screen bg-[#f7f4ec] text-[#171916]">
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[#e8e4dc] bg-white px-4 shadow-sm sm:h-16 sm:px-6">
      <div className="flex items-center gap-3"><button type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={()=>setMenuOpen(v=>!v)} className="rounded-lg p-2 hover:bg-[#f7f4ec] lg:hidden">{menuOpen?<X size={21}/>:<Menu size={21}/>}</button><span className="truncate text-sm font-bold sm:text-base">Platform admin</span></div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#edf5ed] px-2 py-1.5 text-[11px] font-bold text-[#42704d] sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"><ShieldCheck size={15}/> Super Admin</span>
    </header>
    {menuOpen&&<button type="button" aria-label="Close navigation" onClick={()=>setMenuOpen(false)} className="fixed inset-0 z-40 bg-black/40 lg:hidden"/>}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#e8e4dc] bg-[#fffefa] shadow-xl transition-transform lg:translate-x-0 lg:shadow-none ${menuOpen?"translate-x-0":"-translate-x-full"}`}>
      <Link href="/admin/dashboard" className="flex h-20 items-center gap-3 border-b border-[#eee9e0] px-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e56a42] text-xl font-black text-white">r.</span><span><strong className="block text-lg tracking-tight">restaurant<span className="text-[#e56a42]">os</span></strong><small className="text-[10px] font-bold uppercase tracking-widest text-[#77796f]">Control center</small></span></Link>
      <nav aria-label="Platform navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {groups.map(group=><div key={group.label} className="mb-5"><p className="mb-2 px-3 text-[10px] font-extrabold tracking-[.15em] text-[#92948b]">{group.label}</p>
          {group.items.map(({label,href,icon:Icon,ready})=>{
            const active=pathname===href;
            return ready?<Link key={href} href={href} aria-current={active?"page":undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active?"bg-[#fff0e8] text-[#b85d3e]":"text-[#55594f] hover:bg-[#f7f4ec]"}`}><Icon size={18}/><span className="flex-1">{label}</span></Link>
            :<div key={href} title="Coming soon" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#a3a69f]"><Icon size={18}/><span className="flex-1">{label}</span><span className="text-[9px] font-bold uppercase">Soon</span></div>;
          })}
        </div>)}
      </nav>
      <div className="border-t border-[#eee9e0] p-4"><button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#8c4035] hover:bg-red-50"><LogOut size={19}/> Sign out</button></div>
    </aside>
    <div className="min-w-0 lg:pl-[260px]"><div className="mx-auto max-w-7xl">{children}</div></div>
  </div>;
}
