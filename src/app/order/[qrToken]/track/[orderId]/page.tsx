import {redirect} from "next/navigation";
import {guestTrackingHref} from "@/lib/guest-routes";
export default async function TrackOrderPage({params}:{params:Promise<{qrToken:string;orderId:string}>}){
 const {qrToken,orderId}=await params;
 redirect(guestTrackingHref(qrToken,orderId));
}
