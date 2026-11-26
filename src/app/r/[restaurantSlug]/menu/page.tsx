"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {type Branding,resolveBranding,brandStyle,safeImage} from "@/lib/guest-branding";
import {GuestPageHeader,GuestBrandHero,GuestBrandDetails} from "@/components/guest-branding";
import { Utensils, MapPin } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
type Item = { id:string; name:string; description?:string; price:number; dietaryType:string; prepTimeMinutes:number;imageUrl?:string };
type Category = { id:string; name:string; description?:string; sortOrder:number; items:Item[] };
type Branch = { id:string; name:string };
type Menu = { restaurantName:string; slug:string; branches:Branch[]; branchId:string; branchName:string; categories:Category[]; branding?:Branding };

export default function RestaurantPublicMenuPage() {
  const params = useParams<{restaurantSlug:string}>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [menu,setMenu] = useState<Menu|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const branchId = searchParams.get("branchId");
        const query = branchId ? "?branchId=" + encodeURIComponent(branchId) : "";
        const response = await fetch(`${API}/api/v1/public/restaurants/${encodeURIComponent(params.restaurantSlug)}/menu${query}`, { cache:"no-store" });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message ?? "This restaurant menu is unavailable.");
        if (!cancelled) setMenu(payload.data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to load this restaurant menu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (params.restaurantSlug) load();
    return () => { cancelled = true; };
  }, [params.restaurantSlug, searchParams]);

  const branding=resolveBranding(menu);
  return <main className="guest-theme min-h-screen" style={brandStyle(branding)}>
    <GuestPageHeader branding={branding}/>
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
      {loading ? <div className="panel py-20 text-center text-sm text-[var(--guest-muted)]">Loading menu…</div> :
      error ? <div className="panel px-6 py-16 text-center"><Utensils className="mx-auto text-[var(--guest-danger)]" size={26}/><h1 className="mt-4 text-xl font-bold">Menu unavailable</h1><p className="mt-2 text-sm text-[var(--guest-muted)]">{error}</p></div> :
      menu && <>
        <div className="mb-8">
          <GuestBrandHero branding={branding} compact/>
          <h1 className="mt-2 text-3xl font-bold tracking-[-.055em] sm:text-4xl">{menu.restaurantName}<span className="text-[var(--guest-link)]">.</span></h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--guest-border)] bg-[var(--guest-surface)] px-3 py-2 text-xs text-[var(--guest-muted)]"><MapPin size={14}/><span className="font-semibold">Branch</span>
              <select aria-label="Select branch" className="max-w-[180px] bg-transparent font-semibold outline-none" value={menu.branchId} onChange={e=>router.push(`/r/${encodeURIComponent(menu.slug)}/menu?branchId=${encodeURIComponent(e.target.value)}`)}>
                {menu.branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <span className="text-xs text-[var(--guest-muted)]">{menu.branchName}</span>
          </div>
          <p className="mt-4 text-sm text-[var(--guest-muted)]">Browse the menu at this branch. To place a dine-in order, scan your table’s QR code.</p>
        </div>
        {menu.categories.map(category=><section key={category.id} className="mb-5 overflow-hidden rounded-[var(--guest-radius)] border border-[var(--guest-border)] bg-[var(--guest-surface)]">
          <div className="border-b border-[var(--guest-border)] px-5 py-4"><h2 className="font-bold">{category.name}</h2>{category.description&&<p className="mt-1 text-xs text-[var(--guest-muted)]">{category.description}</p>}</div>
          {category.items.length===0 ? <p className="px-5 py-6 text-xs text-[var(--guest-muted)]">No available items in this category.</p> :
          <div className="divide-y divide-[var(--guest-border)]">{category.items.map(item=><article key={item.id} className="flex items-center gap-3 px-5 py-4">
            {item.imageUrl&&<img src={safeImage(item.imageUrl)} alt={item.name} loading="lazy" className="h-16 w-20 shrink-0 rounded-lg object-cover"/>}<div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-sm border-2 ${item.dietaryType==="VEG"?"border-[#527a5b]":item.dietaryType==="EGG"?"border-[#b88a37]":"border-[#c65e3d]"}`}/><h3 className="text-sm font-bold">{item.name}</h3></div>
              {item.description&&<p className="mt-1 text-xs leading-5 text-[var(--guest-muted)]">{item.description}</p>}
              <div className="mt-2 text-sm font-bold">₹{Number(item.price).toFixed(2)} <span className="ml-1 text-[10px] font-normal text-[var(--guest-muted)]">· {item.prepTimeMinutes} min</span></div>
            </div>
          </article>)}</div>}
        </section>)}
        <GuestBrandDetails branding={branding}/>
        {menu.categories.length===0&&<div className="panel py-12 text-center text-sm text-[var(--guest-muted)]">This restaurant has not published a menu yet.</div>}
      </>}
      <p className="mt-8 text-center text-[10px] text-[var(--guest-muted)]">Powered by RestaurantOS</p>
    </div>
  </main>;
}
