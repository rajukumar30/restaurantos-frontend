/** Calendar dates are branch-local, not the browser's local timezone. */
function calendarDate(date:string):Date|null{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const value=new Date(date+"T12:00:00Z");
 if(!Number.isFinite(value.getTime())||value.toISOString().slice(0,10)!==date)return null;
 return value;
}
export function offsetDay(date:string,delta:number):string{
 const value=calendarDate(date);
 if(!value||!Number.isInteger(delta))return "";
 value.setUTCDate(value.getUTCDate()+delta);
 return Number.isFinite(value.getTime())?value.toISOString().slice(0,10):"";
}
export function prettyDay(date:string):string{
 const value=calendarDate(date);
 return value?new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"}).format(value):"Date unavailable";
}
export function localDay(value:string,timezone:string):string{
 const instant=new Date(value);
 if(!Number.isFinite(instant.getTime()))return "";
 try{
  const parts=new Intl.DateTimeFormat("en-GB",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instant);
  const keys=["year","month","day"] as const;
  const date=keys.map(key=>parts.find(part=>part.type===key)?.value??"").join("-");
  return calendarDate(date)?date:"";
 }catch{return "";}
}
export function orderTime(value:string,timezone:string):string{
 const instant=new Date(value);
 if(!Number.isFinite(instant.getTime()))return "Time unavailable";
 try{return new Intl.DateTimeFormat("en-IN",{timeZone:timezone,hour:"numeric",minute:"2-digit"}).format(instant);}
 catch{return "Time unavailable";}
}
