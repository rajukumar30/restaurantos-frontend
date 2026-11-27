export type TableFilter="all"|"active"|"inactive";
export type TableSort="number"|"name"|"seats-low"|"seats-high";
type TableRow={tableNumber:string;displayName:string;seatingCapacity:number;active:boolean};
export function tableSummary(tables:TableRow[]){
 const active=tables.filter(t=>t.active);
 return {total:tables.length,active:active.length,inactive:tables.length-active.length,seats:active.reduce((n,t)=>n+t.seatingCapacity,0)};
}
export function filterTables<T extends TableRow>(tables:T[],search:string,filter:TableFilter,seats:string,sort:TableSort):T[]{
 const q=search.trim().toLowerCase();
 const capacity=(n:number)=>seats==="all"||seats==="1-2"&&n>=1&&n<=2||seats==="3-4"&&n>=3&&n<=4||seats==="5-6"&&n>=5&&n<=6||seats==="7+"&&n>=7;
 return tables.filter(t=>(!q||[t.tableNumber,t.displayName].some(v=>v.toLowerCase().includes(q)))&&(filter==="all"||t.active===(filter==="active"))&&capacity(t.seatingCapacity)).sort((a,b)=>{
 const number=a.tableNumber.localeCompare(b.tableNumber,undefined,{numeric:true,sensitivity:"base"});
 return (sort==="name"?a.displayName.localeCompare(b.displayName):sort==="seats-low"?a.seatingCapacity-b.seatingCapacity:sort==="seats-high"?b.seatingCapacity-a.seatingCapacity:0)||number;
 });
}
