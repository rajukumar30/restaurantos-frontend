import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import Module from "node:module";
const m=new Module("guest-order-progress");m._compile(ts.transpileModule(fs.readFileSync("src/lib/guest-order-progress.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,"guest-order-progress.js");
const {orderProgress,orderStages}=m.exports;
test("only the actual stage is current and later stages use pending language",()=>{for(let i=0;i<orderStages.length;i++){const p=orderProgress(orderStages[i].key);assert.equal(p.index,i);assert.equal(p.stages.filter(s=>s.state==="current").length,1);p.stages.forEach((s,j)=>{assert.equal(s.state,j<i?"complete":j===i?"current":"pending");assert.equal(s.description,j<=i?s.done:s.pending);});}});
test("cancelled or unknown order cannot show a completed stage",()=>{for(const key of ["CANCELLED","UNKNOWN"]){const p=orderProgress(key);assert.ok(p.stages.every(s=>s.state==="pending"));}assert.equal(orderProgress("CANCELLED").cancelled,true);});
