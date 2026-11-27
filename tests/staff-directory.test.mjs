import {test} from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import ts from "typescript";import Module from "node:module";
const m=new Module("staff-directory");m._compile(ts.transpileModule(fs.readFileSync("src/lib/staff-directory.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,"staff-directory.js");
const {filterStaff,staffSummary,editableRole,roleNames}=m.exports;
const rows=[{name:"Zed",email:"z@example.com",roles:"Kitchen Staff",accountStatus:"ACTIVE"},{name:"Amy",email:"a@example.com",roles:"Waiter",accountStatus:"INACTIVE"},{name:"Ben",email:"b@example.com",roles:"Restaurant Owner",accountStatus:"LOCKED"}];
test("combines search status and role",()=>{assert.equal(filterStaff(rows,"z@","active","KITCHEN","name").length,1);assert.equal(filterStaff(rows,"z@","inactive","KITCHEN","name").length,0);});
test("summaries distinguish inactive and locked",()=>assert.deepEqual(staffSummary(rows),{total:3,active:1,inactive:1,other:1}));
test("protected roles are not editable",()=>{assert.equal(editableRole("Restaurant Owner"),null);assert.equal(editableRole("Waiter, Kitchen Staff"),null);assert.equal(editableRole("Branch Manager"),"MANAGER");assert.deepEqual(roleNames("Restaurant Owner"),["OWNER"]);});
test("sort does not mutate input",()=>{assert.equal(filterStaff(rows,"","all","all","name")[0].name,"Amy");assert.equal(rows[0].name,"Zed");});
