import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import Module from "node:module";
const source=fs.readFileSync("src/lib/guest-branding.ts","utf8");
const m=new Module("guest-branding");m._compile(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,"guest-branding.js");
const {palette,presets,defaultBranding,contrast}=m.exports;
test("default palette matches existing Krlio brand",()=>{const p=palette(defaultBranding("Restaurant"));assert.equal(p.primary,"#213D32");assert.equal(p.accent,"#B64D32");assert.equal(p.background,"#FAF7F2");});
test("derived foregrounds, muted text and links meet WCAG AA contrast across themes and custom colours",()=>{
 const choices=["#000000","#FFFFFF","#777777","#808080","#213D32","#B64D32","#C8A46B","#151825","#FF0000","#00FF00","#0000FF","#FFF6EB"];
 const inputs=Object.entries(presets).map(([theme,p])=>({...defaultBranding("Restaurant"),theme,...p}));
 for(const primary of choices)for(const accent of choices)for(const background of choices)inputs.push({...defaultBranding("Restaurant"),primaryColor:primary,accentColor:accent,backgroundColor:background});
 for(const b of inputs){const p=palette(b);for(const bg of [p.background,p.surface,p.soft,p.tint])for(const fg of [p.text,p.muted,p.link,p.primaryLink])assert.ok(contrast(fg,bg)>=4.5,JSON.stringify({b,fg,bg,ratio:contrast(fg,bg)}));assert.ok(contrast(p.danger,p.errorSurface)>=4.5);assert.ok(contrast(p.success,p.successSurface)>=4.5);assert.ok(contrast(p.danger,p.background)>=4.5);assert.ok(contrast(p.success,p.background)>=4.5);assert.ok(contrast(p.accentText,p.accent)>=4.5);assert.ok(contrast(p.primaryText,p.primary)>=4.5);}
});
