import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import Module from "node:module";
const m=new Module("order-dates");m._compile(ts.transpileModule(fs.readFileSync("src/lib/order-dates.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,"order-dates.js");
const {localDay,prettyDay,offsetDay,orderTime}=m.exports;
test("order timestamps include the actual day component and render in history",()=>{
 const date=localDay("2026-11-26T18:45:00Z","Asia/Kolkata");
 assert.equal(date,"2026-11-27");assert.match(prettyDay(date),/27 Nov 2026/);
 assert.notEqual(orderTime("2026-11-26T18:45:00Z","Asia/Kolkata"),"Time unavailable");
});
test("branch-local date remains correct across timezone boundaries",()=>{
 assert.equal(localDay("2026-11-27T01:00:00Z","America/New_York"),"2026-11-26");
 assert.equal(localDay("2026-11-27T01:00:00Z","Asia/Kolkata"),"2026-11-27");
});
test("date navigation crosses month, year and leap-day boundaries",()=>{
 assert.equal(offsetDay("2026-01-01",-1),"2025-12-31");
 assert.equal(offsetDay("2024-02-28",1),"2024-02-29");
 assert.equal(offsetDay("2024-02-29",1),"2024-03-01");
});
test("malformed date or timezone cannot crash a rendered order",()=>{
 for(const date of ["","2026-11-","2026-02-30","invalid"]){assert.equal(prettyDay(date),"Date unavailable");assert.equal(offsetDay(date,1),"");}
 assert.equal(localDay("invalid","Asia/Kolkata"),"");
 assert.equal(localDay("2026-11-27T00:00:00Z","Invalid/Zone"),"");
 assert.equal(orderTime("invalid","Asia/Kolkata"),"Time unavailable");
});
