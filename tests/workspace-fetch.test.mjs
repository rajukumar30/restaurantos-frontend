import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import Module from "node:module";
const m=new Module("workspace-fetch");
m._compile(ts.transpileModule(fs.readFileSync("src/lib/workspace-fetch.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,"workspace-fetch.js");
const {workspaceFetch,readWorkspacePreview,clearWorkspaceCache}=m.exports;
const api=process.env.NEXT_PUBLIC_API_BASE_URL??"https://krlio-g5egfgctbteadvc4.westus3-01.azurewebsites.net";
const base=api+"/api/v1/tenants/11111111-1111-1111-1111-111111111111";
const token=n=>"a."+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+600,n})).toString("base64url")+".b";
test("shared branches, previews, mutations, logout and tenant isolation",async()=>{
 const oldFetch=globalThis.fetch,oldWindow=globalThis.window;
 let current=token(1),calls=0,deny=false;
 globalThis.window={localStorage:{getItem:()=>current}};
 globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({success:!deny,data:[calls]}),{status:deny?403:200});};
 const init=()=>({headers:{Authorization:"Bearer "+current}});
 try{
  clearWorkspaceCache();
  const [a,b]=await Promise.all([workspaceFetch(base+"/branches",init()),workspaceFetch(base+"/branches",init())]);
  assert.deepEqual(await a.json(),await b.json());assert.equal(calls,1);
  await workspaceFetch(base+"/branches",init());assert.equal(calls,1);
  await workspaceFetch(base.replaceAll("1111","2222")+"/branches",init());assert.equal(calls,2);
  await workspaceFetch(base+"/dashboard?branchId=x",init());assert.equal(calls,3);
  assert.deepEqual(readWorkspacePreview(base+"/dashboard?branchId=x",current).data,[3]);
  await workspaceFetch(base+"/dashboard?branchId=x",init());assert.equal(calls,4);
  await workspaceFetch(base+"/menu/catalog?branchId=x",{...init(),method:"POST"});
  assert.equal(readWorkspacePreview(base+"/dashboard?branchId=x",current),null);
  await workspaceFetch(base+"/branches",init());assert.equal(calls,6);
  current=token(2);await workspaceFetch(base+"/branches",init());assert.equal(calls,7);
  deny=true;await workspaceFetch(base+"/dashboard?branchId=x",init());deny=false;
  await workspaceFetch(base+"/branches",init());assert.equal(calls,9);
  await workspaceFetch(base+"/checkout?branchId=x",init());await workspaceFetch(base+"/checkout?branchId=x",init());assert.equal(calls,11);
  current="";assert.equal(readWorkspacePreview(base+"/dashboard?branchId=x",current),null);
 }finally{clearWorkspaceCache();globalThis.fetch=oldFetch;globalThis.window=oldWindow;}
});
