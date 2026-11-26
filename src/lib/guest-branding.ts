import type {CSSProperties} from "react";
export type Branding={
 displayName:string;slogan:string;logoUrl:string;bannerUrl:string;theme:"CLASSIC"|"BOLD"|"MINIMAL";
 primaryColor:string;accentColor:string;backgroundColor:string;bannerTitle:string;bannerText:string;
 about:string;contactPhone:string;address:string;openingHours:string;showBanner:boolean;showFeatured:boolean;showDetails:boolean;
};
export const presets={
 CLASSIC:{label:"Krlio Default",primaryColor:"#213D32",accentColor:"#B64D32",backgroundColor:"#FAF7F2"},
 BOLD:{label:"Warm & bold",primaryColor:"#7C2F20",accentColor:"#E79B58",backgroundColor:"#FFF4E6"},
 MINIMAL:{label:"Clean & minimal",primaryColor:"#303632",accentColor:"#397758",backgroundColor:"#FFFFFF"}
} as const;
export function defaultBranding(displayName:string):Branding{return {displayName,slogan:"",logoUrl:"",bannerUrl:"",theme:"CLASSIC",...presets.CLASSIC,bannerTitle:"",bannerText:"",about:"",contactPhone:"",address:"",openingHours:"",showBanner:true,showFeatured:true,showDetails:true};}
type Legacy={restaurantName?:string;slogan?:string;logoUrl?:string;bannerUrl?:string;theme?:string;branding?:Branding};
export function resolveBranding(menu:Legacy|null):Branding{
 const defaults=defaultBranding(menu?.restaurantName||"Your restaurant");
 if(menu?.branding){const saved={...defaults,...menu.branding};if(saved.theme==="CLASSIC"&&saved.primaryColor.toUpperCase()==="#1B241F"&&saved.accentColor.toUpperCase()==="#E7764C"&&saved.backgroundColor.toUpperCase()==="#F7F7F4")return {...saved,primaryColor:presets.CLASSIC.primaryColor,accentColor:presets.CLASSIC.accentColor,backgroundColor:presets.CLASSIC.backgroundColor};return saved;}
 const theme=menu?.theme==="BOLD"||menu?.theme==="MINIMAL"?menu.theme:"CLASSIC";
 return {...defaults,theme,...presets[theme],slogan:menu?.slogan||"",logoUrl:menu?.logoUrl||"",bannerUrl:menu?.bannerUrl||""};
}
export function validColor(color:string,fallback:string){return /^#[0-9a-f]{6}$/i.test(color)?color:fallback;}
type RGB=[number,number,number];
function rgb(hex:string):RGB{return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)) as RGB;}
export function luminance(hex:string){const [r,g,b]=rgb(hex).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b;}
export function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function mix(a:string,b:string,amount:number){const x=rgb(a),y=rgb(b);return "#"+x.map((v,i)=>Math.round(v+(y[i]-v)*amount).toString(16).padStart(2,"0")).join("");}
export function foreground(color:string){
 const bg=validColor(color,"#213D32"),preferred=contrast(bg,"#20241F")>=4.5?"#20241F":"#FFFFFF";
 return contrast(bg,preferred)>=4.5?preferred:contrast(bg,"#000000")>=contrast(bg,"#FFFFFF")?"#000000":"#FFFFFF";
}
function readable(color:string,backgrounds:string[],text:string,min=4.5){
 for(let i=0;i<=20;i++){const candidate=mix(color,text,i/20);if(backgrounds.every(bg=>contrast(candidate,bg)>=min))return candidate;}
 return text;
}
/** One palette, derived from the owner's three choices. Never colour critical status indicators by brand. */
export function palette(b:Branding){
 const primary=validColor(b.primaryColor,"#213D32"),accent=validColor(b.accentColor,"#B64D32"),background=validColor(b.backgroundColor,"#FAF7F2");
 const dark=luminance(background)<.179;
 const surface=mix(background,"#FFFFFF",dark ? .055 : 1);
 const soft=mix(background,dark?"#FFFFFF":"#000000",dark ? .085 : .035);
 const tint=mix(surface,primary,dark ? .11 : .085);
 const isDefault=b.theme==="CLASSIC"&&primary.toUpperCase()===presets.CLASSIC.primaryColor&&accent.toUpperCase()===presets.CLASSIC.accentColor&&background.toUpperCase()===presets.CLASSIC.backgroundColor;
 const text=isDefault?"#25332B":foreground(background);
 // Keep body and surface contrast consistent for custom mid-tone backgrounds as well.
 const safeSurface=contrast(text,surface)>=4.5?surface:background;
 const safeSoft=contrast(text,soft)>=4.5?soft:background;
 const safeTint=contrast(text,tint)>=4.5?tint:background;
 const bases=[background,safeSurface,safeSoft,safeTint];
 const muted=readable(isDefault?"#59665D":mix(text,background,.38),bases,text);
 const link=readable(accent,bases,text);
 const primaryLink=readable(primary,bases,text);
 const accentSoft=mix(safeSurface,accent,dark ? .16 : .085);
 const errorSurfaceCandidate=mix(safeSurface,"#B42318",dark ? .16 : .065),successSurfaceCandidate=mix(safeSurface,"#16834B",dark ? .16 : .065);
 const errorSurface=contrast(text,errorSurfaceCandidate)>=4.5?errorSurfaceCandidate:safeSurface;
 const successSurface=contrast(text,successSurfaceCandidate)>=4.5?successSurfaceCandidate:safeSurface;
 const danger=readable(dark?"#FF9D96":"#B42318",[...bases,errorSurface],text);
 const success=readable(dark?"#80D8A3":"#167744",[...bases,successSurface],text);
 const border=isDefault?"#E4DFD5":mix(safeSurface,text,dark ? .22 : .15);
 const strongBorder=readable(mix(safeSurface,text,.4),[safeSurface,background],text,3);
 return {primary,accent,background,text,primaryText:foreground(primary),accentText:foreground(accent),surface:safeSurface,soft:safeSoft,tint:safeTint,muted,link,primaryLink,accentSoft,border,strongBorder,danger,success,errorSurface,successSurface,overlay:"rgba(0,0,0,.62)",
  radius:b.theme==="MINIMAL"?"9px":b.theme==="BOLD"?"24px":"16px",
  headingFont:b.theme==="BOLD"?"Georgia, 'Times New Roman', serif":"inherit",
  shadow:dark?"0 6px 22px rgba(0,0,0,.24)":"0 5px 18px rgba(0,0,0,.065)"};
}
export function brandStyle(b:Branding):CSSProperties{
 const p=palette(b);
 return {"--guest-primary":p.primary,"--guest-primary-text":p.primaryText,"--guest-accent":p.accent,"--guest-accent-text":p.accentText,"--guest-bg":p.background,"--guest-text":p.text,"--guest-surface":p.surface,"--guest-soft":p.soft,"--guest-tint":p.tint,"--guest-muted":p.muted,"--guest-link":p.link,"--guest-primary-link":p.primaryLink,"--guest-accent-soft":p.accentSoft,"--guest-border":p.border,"--guest-strong-border":p.strongBorder,"--guest-danger":p.danger,"--guest-success":p.success,"--guest-error-surface":p.errorSurface,"--guest-success-surface":p.successSurface,"--guest-overlay":p.overlay,"--guest-radius":p.radius,"--guest-heading-font":p.headingFont,"--guest-shadow":p.shadow,backgroundColor:p.background,color:p.text,colorScheme:p.text==="#FFFFFF"?"dark":"light"} as CSSProperties;
}
export function safeImage(url:string){if(/^\/api\/v1\/public\/(?:guest-website|menu)\/images\/[0-9a-f-]{36}$/i.test(url))return (process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net").replace(/\/$/,"")+url;try{const u=new URL(url);return u.protocol==="https:"&&!u.username&&!u.password?u.href:"";}catch{return "";}}

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

/** Use an upload-time thumbnail only for our own stored menu photos. External links are unchanged. */
export function menuThumbnail(url:string){
 if(/^\/api\/v1\/public\/menu\/images\/[0-9a-f-]{36}$/i.test(url))return safeImage(url)+"/thumbnail";
 return safeImage(url);
}

/** During a rolling deployment, the previous backend may not yet expose the thumbnail endpoint. */
export function fallbackMenuThumbnail(image:HTMLImageElement,url:string){
 const original=safeImage(url);
 if(original&&image.getAttribute("src")!==original){image.src=original;}
}
