export const orderStages=[
 {key:"NEW",label:"Order received",done:"Your order has been received.",pending:"Waiting for your order."},
 {key:"ACCEPTED",label:"Accepted",done:"The restaurant confirmed your order.",pending:"Waiting for restaurant confirmation."},
 {key:"PREPARING",label:"Preparing",done:"The kitchen started preparing your food.",pending:"Preparation has not started yet."},
 {key:"READY",label:"Ready",done:"Your food is ready to serve.",pending:"Your food is not ready yet."},
 {key:"SERVED",label:"Served",done:"Your food has been served.",pending:"Waiting for your food to be served."}
] as const;
export function orderProgress(status:string){
 const index=orderStages.findIndex(stage=>stage.key===status);
 const cancelled=status==="CANCELLED";
 return {index,cancelled,known:index>=0||cancelled,stages:orderStages.map((stage,i)=>({...stage,state:cancelled||index<0?"pending":i<index?"complete":i===index?"current":"pending",description:!cancelled&&index>=i?stage.done:stage.pending}))};
}
