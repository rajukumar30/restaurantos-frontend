export type GuestDraft={visitId:string|null;cart:Record<string,number>;notes:string;updatedAt:number};
const MAX_AGE=12*60*60*1000;
export function emptyGuestDraft():GuestDraft{return {visitId:null,cart:{},notes:"",updatedAt:0};}
export function readGuestDraft(raw:string|null,now:number):GuestDraft{
 try{const d=JSON.parse(raw??"null");if(!d||typeof d.updatedAt!=="number"||!Number.isFinite(d.updatedAt)||d.updatedAt>now||now-d.updatedAt>=MAX_AGE||!d.cart||typeof d.cart!=="object"||Array.isArray(d.cart))return emptyGuestDraft();
 const cart=Object.fromEntries(Object.entries(d.cart).filter(([id,n])=>/^[0-9a-f-]{36}$/i.test(id)&&typeof n==="number"&&Number.isInteger(n)&&n>0&&n<=20).slice(0,50)) as Record<string,number>;
 return {visitId:typeof d.visitId==="string"&&/^[0-9a-f-]{36}$/i.test(d.visitId)?d.visitId:null,cart,notes:typeof d.notes==="string"?d.notes.slice(0,500):"",updatedAt:d.updatedAt};
 }catch{return emptyGuestDraft();}
}
export function attachGuestDraft(draft:GuestDraft,visitId:string,now:number):GuestDraft{
 if(draft.visitId===visitId)return draft;
 if(draft.visitId!==null)return {...emptyGuestDraft(),visitId,updatedAt:now};
 return {...draft,visitId,updatedAt:now};
}
