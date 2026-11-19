"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export default function WorkspaceEntry(){
 const router=useRouter();
 useEffect(()=>{
  const token=localStorage.getItem("restaurantos_access_token");
  const raw=localStorage.getItem("restaurantos_user");
  if(!token||!raw){router.replace("/login");return;}
  try{
   const user=JSON.parse(raw);
   const memberships=user.memberships??[];
   const roles=memberships.map((m:{roles?:string})=>m.roles??"").join(" ");
   if(user.authorities?.includes("PLATFORM_ADMIN"))router.replace("/admin/");
   else if(/OWNER/i.test(roles))router.replace("/owner/");
   else if(memberships.length)router.replace("/staff/");
   else router.replace("/login");
  }catch{router.replace("/login");}
 },[router]);
 return <main className="grid min-h-screen place-items-center bg-[#f7f4ec] text-sm text-[#77796f]">Opening your workspace…</main>;
}
