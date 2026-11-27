export const guestViews=["home","menu","service","orders","account"] as const;
export type GuestView=(typeof guestViews)[number];
export function guestViewFromUrl(search:string,hash=""):GuestView{
 const view=new URLSearchParams(search).get("view");
 if(view==="tracking")return "orders";
 return guestViews.some(v=>v===view)?view as GuestView:hash==="#guest-menu"?"menu":"home";
}
export function trackingOrderFromUrl(search:string):string|null{
 const params=new URLSearchParams(search),id=params.get("orderId");
 return params.get("view")==="tracking"&&id&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)?id:null;
}
export function guestViewHref(qrToken:string,view:GuestView){const base="/order/"+encodeURIComponent(qrToken);return view==="home"?base:base+"?view="+view;}
export function guestTrackingHref(qrToken:string,orderId:string){return "/order/"+encodeURIComponent(qrToken)+"?view=tracking&orderId="+encodeURIComponent(orderId);}
