export type Bill={visitId:string;tableId:string;tableName:string;billNumber:string;status:string;openedAt:string;total:number;paid:number;due:number;orderCount:number;unfinished:number;upiId:string|null;merchantName:string|null;requestedAt:string|null};
export type BillDetail={bill:Bill;items:{orderNumber:string;itemName:string;quantity:number;lineTotal:number}[]};
export const money=(n:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(Number(n));
export function upiUri(b:Bill){
 if(b.status!=="PAYMENT_PENDING"||!b.upiId||!b.merchantName||Number(b.due)<=0)return "";
 if(!/^[A-Za-z0-9._-]{2,100}@[A-Za-z0-9.-]{2,50}$/.test(b.upiId))return "";
 return "upi://pay?"+new URLSearchParams({pa:b.upiId,pn:b.merchantName,am:Number(b.due).toFixed(2),cu:"INR",tn:b.billNumber}).toString().replaceAll("+","%20");
}
export async function readCheckout(r:Response){const p=await r.json().catch(()=>null);if(!r.ok||!p?.success)throw Error(p?.detail||p?.message||"Request failed ("+r.status+")");return p.data;}
