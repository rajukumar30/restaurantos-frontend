export type FloorTable={tableId:string;number:string;name:string;capacity:number;active:boolean;visitId:string|null;visitStatus:string|null;guests:number|null;openedAt:string|null;graceUntil:string|null;cleaningStartedAt:string|null;newOrders:number;preparing:number;ready:number;served:number;bill:number;requests:number;billRequested:boolean;cleaningRequested:boolean;oldestRequest:string|null;oldestNew:string|null;oldestReady:string|null};
export type FloorStatus="available"|"seated"|"ordering"|"preparing"|"ready"|"dining"|"payment"|"grace"|"dirty"|"cleaning"|"inactive";
export const labels:Record<FloorStatus,string>={available:"Available",seated:"Seated · no order",ordering:"New order",preparing:"Preparing",ready:"Ready to serve",dining:"Dining",payment:"Payment pending",grace:"Paid · grace period",dirty:"Cleaning required",cleaning:"Cleaning",inactive:"Inactive"};
export function floorStatus(t:FloorTable,now:number):FloorStatus{
 if(t.visitId){if(t.visitStatus==="PAID"){if(t.cleaningStartedAt)return "cleaning";return t.graceUntil&&Date.parse(t.graceUntil)<=now?"dirty":"grace";}
 if(t.visitStatus==="PAYMENT_PENDING"||t.billRequested)return "payment";if(t.ready)return "ready";if(t.newOrders)return "ordering";if(t.preparing)return "preparing";if(t.served)return "dining";return "seated";}
 return t.active?"available":"inactive";
}
export function age(value:string|null,now:number){return value&&Number.isFinite(Date.parse(value))?Math.max(0,Math.floor((now-Date.parse(value))/60000)):0;}
export function attention(t:FloorTable,now:number){return (t.oldestNew&&age(t.oldestNew,now)>=3)||(t.oldestReady&&age(t.oldestReady,now)>=5)||(t.oldestRequest&&age(t.oldestRequest,now)>=3)||(floorStatus(t,now)==="seated"&&age(t.openedAt,now)>=10)||floorStatus(t,now)==="dirty"||t.cleaningRequested;}
