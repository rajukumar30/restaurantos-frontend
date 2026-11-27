import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import Module from "node:module";
const clients=[];
class FakeClient{
 constructor(config){this.config=config;this.connected=false;this.subs=new Map();clients.push(this);}
 activate(){this.connected=true;this.config.onConnect();}
 subscribe(destination,cb){this.subs.set(destination,cb);return {unsubscribe:()=>this.subs.delete(destination)};}
 async deactivate(){this.connected=false;this.subs.clear();this.deactivated=true;}
}
const m=new Module("workspace-socket");
const original=m.require.bind(m);m.require=id=>id==="@stomp/stompjs"?{Client:FakeClient}:original(id);
m._compile(ts.transpileModule(fs.readFileSync("src/lib/realtime/workspace-socket.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,"workspace-socket.js");
const {subscribeWorkspace,closeWorkspaceSocket}=m.exports;
const jwt=n=>"a."+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+600,n})).toString("base64url")+".b";
const tenant="11111111-1111-1111-1111-111111111111",branch="22222222-2222-2222-2222-222222222222";
test("one transport across pages; scoped topic fanout, deduplication, reconnect and logout",()=>{
 const prev=globalThis.window;let current=jwt(1),events=0,refreshes=0;
 globalThis.window={localStorage:{getItem:()=>current},addEventListener(){},removeEventListener(){}};
 const l={event:()=>events++,status:()=>{},reconcile:()=>refreshes++};
 try{
  const off=subscribeWorkspace(current,tenant,branch,"orders",l);
  const off2=subscribeWorkspace(current,tenant,branch,"orders",{...l});
  assert.equal(clients.length,1);assert.equal(clients[0].subs.size,1);
  const dest="/topic/tenants/"+tenant+"/branches/"+branch+"/orders";
  const send=e=>clients[0].subs.get(dest)({body:JSON.stringify(e)});
  send({eventId:"1",tenantId:tenant,branchId:branch});send({eventId:"1",tenantId:tenant,branchId:branch});
  send({eventId:"2",tenantId:tenant,branchId:tenant});assert.equal(events,2);
  off();off2();assert.equal(clients[0].subs.size,0);
  const off3=subscribeWorkspace(current,tenant,branch,"floor",l);assert.equal(clients.length,1);
  clients[0].config.onWebSocketClose();clients[0].subs.clear();clients[0].config.onConnect();assert.equal(clients[0].subs.size,1);assert.equal(refreshes,4);
  current=jwt(2);const off4=subscribeWorkspace(current,tenant,branch,"orders",l);
  assert.equal(clients.length,2);assert.equal(clients[0].deactivated,true);
  off3();off4();closeWorkspaceSocket();assert.equal(clients[1].deactivated,true);
 }finally{closeWorkspaceSocket();globalThis.window=prev;}
});
