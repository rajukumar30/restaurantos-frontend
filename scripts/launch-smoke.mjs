/**
 * Read-only production smoke test.
 * Run: BACKEND_URL=https://... FRONTEND_URL=https://... node scripts/launch-smoke.mjs
 * Does not create orders, tenants or payments.
 */
const backend=(process.env.BACKEND_URL||"https://restaurantos-backend-kz2r.onrender.com").replace(/\/$/,"");
const frontend=(process.env.FRONTEND_URL||"https://restaurantos-frontend-git-5b3cfe-hypertextrjgmailcoms-projects.vercel.app").replace(/\/$/,"");
const cases=[
  {name:"Backend health",url:backend+"/actuator/health",allowed:[200],check:async r=>{
    const data=await r.json();return data.status==="UP";
  }},
  {name:"Platform invoices require authentication",url:backend+"/api/v1/platform/invoices",allowed:[401,403]},
  {name:"Platform email audit requires authentication",url:backend+"/api/v1/platform/billing/email/status",allowed:[401,403]},
  {name:"Tenant billing requires authentication",url:backend+"/api/v1/tenants/00000000-0000-0000-0000-000000000001/billing",allowed:[401,403]},
  {name:"Frontend homepage",url:frontend,allowed:[200]},
  {name:"Admin billing page",url:frontend+"/admin/billing",allowed:[200,307,308]},
];
let failed=0;
for(const c of cases){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(c.url,{redirect:"manual",signal:controller.signal,headers:{Accept:"application/json,text/html"}});
    const passed=c.allowed.includes(response.status)&&(!c.check||await c.check(response));
    console.log(`${passed?"PASS":"FAIL"} ${c.name} (HTTP ${response.status})`);
    if(!passed)failed++;
  }catch(e){console.error(`FAIL ${c.name}: ${e instanceof Error?e.message:String(e)}`);failed++;}
  finally{clearTimeout(timeout);}
}
if(failed){console.error(`${failed} launch smoke check(s) failed`);process.exitCode=1;}
else console.log("Public availability and anonymous-access smoke checks passed. Authenticated ordering flows still require E2E testing.");
