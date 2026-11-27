"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {membershipRoles,staffRole,roleHome} from "./role-routes";
export default function StaffHome(){
 const router=useRouter();
 useEffect(()=>{
  const token=localStorage.getItem("restaurantos_access_token");
  const raw=localStorage.getItem("restaurantos_user");
  if(!token||!raw){router.replace("/login?next=%2Fstaff%2F");return;}
  try{
   const user=JSON.parse(raw),memberships=user.memberships??[];
   if(user.authorities?.includes("PLATFORM_ADMIN")){router.replace("/admin/");return;}
   const roles=membershipRoles(memberships);
   if(roles.map(r=>r.toUpperCase()).includes("OWNER")){router.replace("/owner/");return;}
   router.replace(memberships.length?roleHome(staffRole(roles)):"/login");
  }catch{router.replace("/login");}
 },[router]);
 return <main className="grid min-h-screen place-items-center">Opening staff workspace…</main>;
}
