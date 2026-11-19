"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export default function StaffHome(){
 const router=useRouter();
 useEffect(()=>{
  const token=localStorage.getItem("restaurantos_access_token");
  const raw=localStorage.getItem("restaurantos_user");
  if(!token||!raw){router.replace("/login?next=%2Fstaff%2F");return;}
  try{
   const user=JSON.parse(raw);
   const memberships=user.memberships??[];
   const roles=memberships.flatMap((m:{roles?:string})=>(m.roles??"").toUpperCase().split(/[,;\s]+/));
   if(user.authorities?.includes("PLATFORM_ADMIN")){router.replace("/admin/");return;}
   if(roles.includes("OWNER")){router.replace("/owner/");return;}
   if(!memberships.length){router.replace("/login");return;}
   router.replace(roles.includes("KITCHEN")&&!roles.includes("MANAGER")?"/staff/kitchen":"/staff/dashboard");
  }catch{router.replace("/login");}
 },[router]);
 return <main className="grid min-h-screen place-items-center">Opening staff workspace…</main>;
}
