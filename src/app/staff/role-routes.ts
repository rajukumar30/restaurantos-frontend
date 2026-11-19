export type StaffRole="MANAGER"|"KITCHEN"|"WAITER"|"CASHIER"|"STAFF";
export function staffRole(roles:string[]):StaffRole{
 const keys=roles.map(r=>r.toUpperCase());
 if(keys.includes("OWNER")||keys.includes("MANAGER"))return "MANAGER";
 if(keys.includes("KITCHEN"))return "KITCHEN";
 if(keys.includes("WAITER"))return "WAITER";
 if(keys.includes("CASHIER"))return "CASHIER";
 return "STAFF";
}
export function roleHome(role:StaffRole){
 return role==="STAFF"?"/staff/general":"/staff/"+role.toLowerCase();
}
export function membershipRoles(memberships:unknown):string[]{
 if(!Array.isArray(memberships))return [];
 return memberships.flatMap(m=>{
  const roles=m?.roles;
  return Array.isArray(roles)?roles.map(String):typeof roles==="string"?roles.split(/[,;\s]+/):[];
 });
}
