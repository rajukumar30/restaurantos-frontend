import type {CSSProperties} from "react";
export type Branding={
 displayName:string;slogan:string;logoUrl:string;bannerUrl:string;theme:"CLASSIC"|"BOLD"|"MINIMAL";
 primaryColor:string;accentColor:string;backgroundColor:string;bannerTitle:string;bannerText:string;
 about:string;contactPhone:string;address:string;openingHours:string;showBanner:boolean;showFeatured:boolean;showDetails:boolean;
};
export const presets={
 CLASSIC:{label:"Krlio Default",primaryColor:"#1B241F",accentColor:"#E7764C",backgroundColor:"#F7F7F4"},
 BOLD:{label:"Warm & bold",primaryColor:"#7C2F20",accentColor:"#E79B58",backgroundColor:"#FFF4E6"},
 MINIMAL:{label:"Clean & minimal",primaryColor:"#303632",accentColor:"#397758",backgroundColor:"#FFFFFF"}
} as const;
export function defaultBranding(displayName:string):Branding{return {displayName,slogan:"",logoUrl:"",bannerUrl:"",theme:"CLASSIC",...presets.CLASSIC,bannerTitle:"",bannerText:"",about:"",contactPhone:"",address:"",openingHours:"",showBanner:true,showFeatured:true,showDetails:true};}
type Legacy={restaurantName?:string;slogan?:string;logoUrl?:string;bannerUrl?:string;theme?:string;branding?:Branding};
export function resolveBranding(menu:Legacy|null):Branding{
 const defaults=defaultBranding(menu?.restaurantName||"Your restaurant");
 if(menu?.branding)return {...defaults,...menu.branding};
 const theme=menu?.theme==="BOLD"||menu?.theme==="MINIMAL"?menu.theme:"CLASSIC";
 return {...defaults,theme,...presets[theme],slogan:menu?.slogan||"",logoUrl:menu?.logoUrl||"",bannerUrl:menu?.bannerUrl||""};
}
export function validColor(color:string,fallback:string){return /^#[0-9a-f]{6}$/i.test(color)?color:fallback;}
export function foreground(color:string){
 const c=validColor(color,"#1B241F").slice(1).match(/../g)!.map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return .2126*c[0]+.7152*c[1]+.0722*c[2]>.179?"#151915":"#FFFFFF";
}
export function brandStyle(b:Branding):CSSProperties{
 const primary=validColor(b.primaryColor,"#1B241F"),accent=validColor(b.accentColor,"#E7764C"),background=validColor(b.backgroundColor,"#F7F7F4");
 return {"--guest-primary":primary,"--guest-primary-text":foreground(primary),"--guest-accent":accent,"--guest-accent-text":foreground(accent),"--guest-bg":background,"--guest-text":foreground(background),"--guest-radius":b.theme==="MINIMAL"?"8px":b.theme==="BOLD"?"28px":"18px",backgroundColor:background,color:foreground(background)} as CSSProperties;
}
export function safeImage(url:string){if(/^\/api\/v1\/public\/guest-website\/images\/[0-9a-f-]{36}$/i.test(url))return (process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net").replace(/\/$/,"")+url;try{const u=new URL(url);return u.protocol==="https:"&&!u.username&&!u.password?u.href:"";}catch{return "";}}

/** Compress locally; do not send raw large phone photographs or SVG files. */
export async function compressBrandImage(file:File,max:number):Promise<File>{
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>12*1024*1024)throw Error("Select a JPG, PNG or WebP photo under 12 MB.");
 const bitmap=await createImageBitmap(file);
 try{
  const factor=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*factor));canvas.height=Math.max(1,Math.round(bitmap.height*factor));
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Could not prepare photo.");
  ctx.fillStyle="#FFFFFF";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  for(const quality of [.85,.72,.58,.45]){
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
   if(blob&&blob.size<=500*1024)return new File([blob],"photo.jpg",{type:"image/jpeg"});
  }
  throw Error("Photo is too large. Try a smaller image.");
 }finally{bitmap.close();}
}
