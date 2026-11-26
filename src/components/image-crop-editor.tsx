"use client";
import {useEffect,useRef,useState} from "react";
import {X,RotateCcw,RotateCw,Crop} from "lucide-react";

export const imageSpecs={
 item:{width:1000,height:800,ratio:"5:4",target:180*1024,label:"Dish image"},
 banner:{width:1600,height:900,ratio:"16:9",target:250*1024,label:"Website banner"},
 logo:{width:512,height:512,ratio:"1:1",target:100*1024,label:"Restaurant logo"}
} as const;
export type ImageKind=keyof typeof imageSpecs;
export function imageSizeLabel(bytes:number){return Math.max(1,Math.round(bytes/1024))+" KB";}
function draw(canvas:HTMLCanvasElement,bitmap:ImageBitmap,kind:ImageKind,zoom:number,angle:number,x:number,y:number){
 const spec=imageSpecs[kind];canvas.width=spec.width;canvas.height=spec.height;const ctx=canvas.getContext("2d");if(!ctx)throw Error("Unable to prepare image.");
 ctx.clearRect(0,0,canvas.width,canvas.height);if(kind!=="logo"){ctx.fillStyle="#FFFFFF";ctx.fillRect(0,0,canvas.width,canvas.height);}
 const swapped=angle%180!==0,w=swapped?bitmap.height:bitmap.width,h=swapped?bitmap.width:bitmap.height;
 const scale=(kind==="logo"?Math.min(spec.width/w,spec.height/h):Math.max(spec.width/w,spec.height/h))*zoom;
 const extraX=Math.max(0,(w*scale-spec.width)/2),extraY=Math.max(0,(h*scale-spec.height)/2);
 ctx.translate(spec.width/2+x*extraX,spec.height/2+y*extraY);ctx.rotate(angle*Math.PI/180);
 ctx.drawImage(bitmap,-bitmap.width*scale/2,-bitmap.height*scale/2,bitmap.width*scale,bitmap.height*scale);
}
async function encode(canvas:HTMLCanvasElement,kind:ImageKind):Promise<File>{
 const spec=imageSpecs[kind];
 if(kind==="logo"){
  // Preserve alpha. Try a quantized raster if the full-colour PNG is too large.
  for(const levels of [256,64,32,16,8]){
   if(levels!==256){const ctx=canvas.getContext("2d")!;const image=ctx.getImageData(0,0,canvas.width,canvas.height);const step=255/(levels-1);
    for(let i=0;i<image.data.length;i+=4)for(let c=0;c<3;c++)image.data[i+c]=Math.round(Math.round(image.data[i+c]/step)*step);ctx.putImageData(image,0,0);}
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));
   if(blob&&blob.size<=spec.target)return new File([blob],"logo.png",{type:"image/png"});
  }
  throw Error("This logo is too detailed to compress without losing quality. Try a simpler logo.");
 }
 for(const quality of [.86,.77,.68,.58,.48,.38,.28,.18]){
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
  if(blob&&blob.size<=spec.target)return new File([blob],kind+".jpg",{type:"image/jpeg"});
 }
 throw Error("This photo cannot meet the size limit. Try a less detailed photo.");
}
export default function ImageCropEditor({file,kind,onCancel,onSave}:{file:File;kind:ImageKind;onCancel:()=>void;onSave:(file:File)=>void|Promise<void>}){
 const spec=imageSpecs[kind],canvasRef=useRef<HTMLCanvasElement>(null),drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
 const [bitmap,setBitmap]=useState<ImageBitmap|null>(null),[zoom,setZoom]=useState(1),[angle,setAngle]=useState(0),[x,setX]=useState(0),[y,setY]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let disposed=false;let owned:ImageBitmap|undefined;
  if(!["image/jpeg","image/png","image/webp"].includes(file.type)||file.size>12*1024*1024){setError("Choose a JPG, PNG or WebP photo under 12 MB.");return;}
  createImageBitmap(file).then(b=>{owned=b;if(disposed){b.close();return;}if(b.width*b.height>36_000_000){b.close();owned=undefined;throw Error("Photo resolution is too large. Choose a smaller photo.");}setBitmap(b);}).catch(e=>{if(!disposed)setError(e instanceof Error?e.message:"Unable to open photo.");});
  return()=>{disposed=true;owned?.close();};
 },[file]);
 useEffect(()=>{if(bitmap&&canvasRef.current)draw(canvasRef.current,bitmap,kind,zoom,angle,x,y);},[bitmap,kind,zoom,angle,x,y]);
 useEffect(()=>{function key(e:KeyboardEvent){if(e.key==="Escape"&&!busy)onCancel();}window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[busy,onCancel]);
 async function save(){if(!bitmap||busy)return;setBusy(true);setError("");try{const canvas=document.createElement("canvas");draw(canvas,bitmap,kind,zoom,angle,x,y);await onSave(await encode(canvas,kind));}catch(e){setError(e instanceof Error?e.message:"Unable to compress image.");}finally{setBusy(false);}}
 const clamp=(v:number)=>Math.max(-1,Math.min(1,v));
 return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3"><section role="dialog" aria-modal="true" aria-label="Crop and optimize photo" className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 text-[#20241f] shadow-xl sm:p-6">
 <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Adjust {spec.label.toLowerCase()}</h2><p className="mt-1 text-xs text-[#59665d]">{spec.width} × {spec.height} px · {spec.ratio} · up to {imageSizeLabel(spec.target)}</p></div><button type="button" aria-label="Close image editor" disabled={busy} onClick={onCancel}><X size={22}/></button></div>
 <p className="mb-3 text-xs text-[#59665d]">{kind==="logo"?"Your logo fits inside a square with transparency preserved.":"Drag the photo to position it inside the frame."} Original: {imageSizeLabel(file.size)}. Only the optimized image will be uploaded.</p>
 <div className="relative mx-auto overflow-hidden rounded-xl border bg-[#eaeae7]" style={{aspectRatio:spec.width/spec.height,maxWidth:kind==="logo"?240:undefined}}>
 <canvas ref={canvasRef} className="h-full w-full touch-none" aria-label="Cropped photo preview" onPointerDown={e=>{if(!bitmap||busy)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,px:x,py:y};}} onPointerMove={e=>{const p=drag.current;if(!p)return;const rect=e.currentTarget.getBoundingClientRect();setX(clamp(p.px+(e.clientX-p.x)/Math.max(1,rect.width)*2));setY(clamp(p.py+(e.clientY-p.y)/Math.max(1,rect.height)*2));}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}/>
 {!bitmap&&!error&&<div className="absolute inset-0 grid place-items-center text-xs">Preparing image…</div>}</div>
 <label className="mt-4 block text-sm font-semibold">Zoom <span className="float-right text-xs">{zoom.toFixed(1)}×</span><input className="mt-2 w-full accent-[#213d32]" type="range" min={1} max={3} step={.05} value={zoom} disabled={busy||!bitmap} onChange={e=>setZoom(Number(e.target.value))}/></label>
 <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>{setAngle(a=>(a+270)%360);setX(0);setY(0);}} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><RotateCcw size={15}/> Rotate left</button><button type="button" disabled={busy} onClick={()=>{setAngle(a=>(a+90)%360);setX(0);setY(0);}} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><RotateCw size={15}/> Rotate right</button><button type="button" disabled={busy} onClick={()=>{setZoom(1);setAngle(0);setX(0);setY(0);}} className="rounded-lg border px-3 py-2 text-xs font-semibold">Reset</button></div>
 {error&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p>}
 <div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={onCancel} className="ghost-button">Cancel</button><button type="button" disabled={!bitmap||busy} onClick={()=>void save()} className="primary-button inline-flex items-center gap-2 disabled:opacity-50"><Crop size={16}/>{busy?"Optimizing…":"Use optimized image"}</button></div>
 </section></div>;
}
