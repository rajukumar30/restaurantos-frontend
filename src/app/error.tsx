"use client";
import {useEffect} from "react";
import Link from "next/link";
export default function ApplicationError({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
 useEffect(()=>{console.error("Krlio page render failed",error);},[error]);
 return <main className="grid min-h-[50vh] place-items-center bg-[#f7f7f4] p-5"><div role="alert" className="w-full max-w-md rounded-2xl border border-[#e3e7de] bg-white p-6 text-center"><h1 className="text-xl font-bold text-[#213d32]">This page could not be displayed</h1><p className="mt-2 text-sm text-[#657168]">Try opening the page again. If the problem persists, return to your workspace. This does not change your saved orders.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button onClick={reset} className="rounded-xl bg-[#213d32] px-4 py-2.5 text-sm font-bold text-white">Try again</button><button onClick={()=>window.location.reload()} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Reload page</button><Link href="/" className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Workspace</Link></div></div></main>;
}
