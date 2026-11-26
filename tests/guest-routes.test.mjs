import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import Module from "node:module";
const m=new Module("guest-routes");m._compile(ts.transpileModule(fs.readFileSync("src/lib/guest-routes.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,"guest-routes.js");
const {guestViewHref,guestViewFromUrl,trackingOrderFromUrl,guestTrackingHref,guestViews}=m.exports;
test("all guest pages and tracking share a single workspace pathname",()=>{for(const v of guestViews){const u=new URL(guestViewHref("qr-table",v),"https://example.com");assert.equal(u.pathname,"/order/qr-table");assert.equal(guestViewFromUrl(u.search),v);}const id="12345678-abcd-1234-1234-123456789abc";const u=new URL(guestTrackingHref("qr-table",id),"https://example.com");assert.equal(u.pathname,"/order/qr-table");assert.equal(guestViewFromUrl(u.search),"orders");assert.equal(trackingOrderFromUrl(u.search),id);});
test("invalid or absent tracking IDs cannot trigger tracking requests",()=>{for(const search of ["","?view=orders&orderId=x","?view=tracking&orderId=bad","?view=tracking"])assert.equal(trackingOrderFromUrl(search),null);assert.equal(guestViewFromUrl("","#guest-menu"),"menu");});
