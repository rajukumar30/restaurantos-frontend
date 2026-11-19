import type { ElementType } from "react";
import { ArrowUpRight, Bell, CircleDollarSign, ClipboardList, Clock3, Coffee, LayoutDashboard, MoreHorizontal, QrCode, Search, Settings2, ShoppingBag, Store, Users, Utensils } from "lucide-react";

const metrics = [
  { label: "Gross revenue", value: "₹48,290", change: "+12.8% vs last week", icon: CircleDollarSign },
  { label: "Orders today", value: "186", change: "+8.2% vs last week", icon: ShoppingBag },
  { label: "Avg. order value", value: "₹259.62", change: "+4.6% vs last week", icon: ClipboardList },
  { label: "Active tables", value: "12 / 18", change: "6 tables available", icon: Utensils },
];

const orders = [
  { id: "#RS-1048", table: "Table 08", items: "Paneer tikka, butter naan +2", amount: "₹740", status: "Preparing", tone: "blue", time: "2 min ago" },
  { id: "#RS-1047", table: "Table 03", items: "Masala dosa, filter coffee", amount: "₹310", status: "Ready", tone: "green", time: "5 min ago" },
  { id: "#RS-1046", table: "Takeaway", items: "Chicken biryani × 2", amount: "₹560", status: "New order", tone: "orange", time: "7 min ago" },
  { id: "#RS-1045", table: "Table 11", items: "Margherita pizza, iced tea", amount: "₹490", status: "Served", tone: "gray", time: "12 min ago" },
];

const popular = [
  { name: "Paneer Tikka", category: "Starters · Veg", sold: "84 sold", amount: "₹21,000", emoji: "🥘" },
  { name: "Chicken Biryani", category: "Main course · Non-veg", sold: "62 sold", amount: "₹18,600", emoji: "🍛" },
  { name: "Masala Dosa", category: "South Indian · Veg", sold: "51 sold", amount: "₹7,650", emoji: "🥞" },
];

function NavItem({ icon: Icon, label, active = false }: { icon: ElementType; label: string; active?: boolean }) {
  return <div className={"nav-link " + (active ? "active" : "")} aria-current={active ? "page" : undefined}><Icon className="nav-icon" strokeWidth={1.8}/><span className="nav-text">{label}</span></div>;
}

export default function Home() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="flex items-center gap-3 px-2">
          <div className="brand-mark">r.</div>
          <div className="brand-name"><div className="font-bold tracking-tight text-[17px]">restaurant<span className="text-[#E56A42]">os</span></div><div className="text-[9px] tracking-[.18em] text-[#8f9488] uppercase mt-0.5">Restaurant workspace</div></div>
        </div>
        <nav className="w-full">
          <div className="nav-label">Workspace</div>
          <NavItem icon={LayoutDashboard} label="Overview" active/>
          <NavItem icon={ClipboardList} label="Orders"/>
          <NavItem icon={Utensils} label="Menu"/>
          <NavItem icon={QrCode} label="Tables & QR"/>
          <NavItem icon={Users} label="Customers"/>
          <div className="nav-label">Manage</div>
          <NavItem icon={Store} label="Branches"/>
          <NavItem icon={Utensils} label="Kitchen"/>
          <NavItem icon={CircleDollarSign} label="Payments"/>
          <NavItem icon={Settings2} label="Settings"/>
        </nav>
        <div className="mt-auto w-full pt-8">
          <div className="rounded-2xl bg-[#252922] p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-[#83b88a]"/> All systems operational</div>
            <p className="text-[10px] text-[#a5aa9f] mt-2 leading-relaxed sidebar-footer-text">Your restaurant is online and accepting orders.</p>
          </div>
          <div className="flex items-center gap-3 mt-5 px-2">
            <div className="h-9 w-9 rounded-full bg-[#e7bca7] text-[#57372a] grid place-items-center text-xs font-bold">RK</div>
            <div className="sidebar-footer-text min-w-0"><div className="text-xs font-semibold">Restaurant Owner</div><div className="text-[10px] text-[#92978c]">Demo workspace</div></div>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div><div className="eyebrow">Thursday, November 19, 2026 · Noida</div><h1 className="page-title">Good afternoon<span className="text-[#E56A42]">.</span></h1><p className="text-[13px] text-[#77796f] mt-2">Here is what is happening at your restaurant today.</p></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div aria-label="Search coming soon" title="Search is coming soon" className="ghost-button !p-2.5 text-[#a5a195]"><Search size={16}/></div>
            <div aria-label="Notifications coming soon" title="Notifications are coming soon" className="ghost-button !p-2.5 relative text-[#a5a195]"><Bell size={16}/></div>
            <div className="ghost-button hidden sm:flex items-center gap-2 text-[#77796f]"><span className="h-2 w-2 rounded-full bg-[#527A5B]"/> Main branch</div>
          </div>
        </header>

        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3.5 mb-5">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return <div className="panel metric-card" key={metric.label}>
              <div className="flex justify-between items-start"><div className="metric-label">{metric.label}</div><div className="metric-icon"><Icon size={17}/></div></div>
              <div className="metric-value">{metric.value}</div>
              <div className="metric-foot flex items-center gap-1"><ArrowUpRight size={13}/>{metric.change}</div>
            </div>;
          })}
        </section>

        <section className="chart-grid mb-5">
          <div className="panel p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div><div className="section-title">Revenue overview</div><div className="section-subtitle">Your sales performance through the week</div><div className="text-[27px] font-bold tracking-[-.055em] mt-4">₹48,290 <span className="text-[11px] font-semibold tracking-normal text-[#527A5B]">↗ 12.8%</span></div></div>
              <div className="ghost-button flex items-center gap-2 text-[#77796f]">This week</div>
            </div>
            <div className="chart-bars">
              {[42,62,48,78,58,92,70].map((height,i)=><div className="chart-bar-wrap" key={i}><div className={"chart-bar " + (i===5 ? "highlight" : "")} style={{height:height + "%"}} title={"Day " + (i+1)}/></div>)}
            </div>
            <div className="chart-labels"><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span></div>
          </div>
          <div className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><div className="section-title">Order mix</div><div className="section-subtitle">How guests are ordering</div></div><MoreHorizontal size={18} className="text-[#99998f]"/></div>
            <div className="flex items-center justify-center py-5">
              <div className="relative h-36 w-36 rounded-full" style={{background:"conic-gradient(#E56A42 0 68%, #527A5B 68% 89%, #E6B85C 89% 100%)"}}>
                <div className="absolute inset-[13px] rounded-full bg-[#fffefa] flex flex-col items-center justify-center"><span className="text-[27px] font-bold tracking-tight">186</span><span className="text-[10px] text-[#77796f]">Total orders</span></div>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              {[["Dine-in","68%","#E56A42"],["Takeaway","21%","#527A5B"],["Other","11%","#E6B85C"]].map(([name,value,color])=><div className="flex items-center justify-between" key={name}><span className="flex items-center gap-2 text-[#77796f]"><span className="h-2 w-2 rounded-full" style={{background:color}}/>{name}</span><span className="font-semibold">{value}</span></div>)}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1.55fr_1fr] gap-5">
          <div className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4"><div><div className="section-title">Live orders</div><div className="section-subtitle">A quick look at what is moving in your restaurant</div></div><span className="text-xs font-semibold text-[#99998f]">Latest activity</span></div>
            <div className="table-row !border-0 !pt-1 !text-[10px] uppercase tracking-wider text-[#92938a] font-bold"><span>Order</span><span>Amount</span><span>Time</span><span>Status</span></div>
            {orders.map(order=><div className="table-row" key={order.id}>
              <div className="min-w-0"><div className="font-bold">{order.id}</div><div className="text-[10px] text-[#85867d] mt-1 truncate">{order.table} · {order.items}</div></div>
              <div className="font-semibold">{order.amount}</div><div className="text-[#85867d]">{order.time}</div>
              <span className={"status-pill " + (order.tone==="green" ? "bg-[#eaf2e9] text-[#527a5b]" : order.tone==="blue" ? "bg-[#eaf0f6] text-[#55799c]" : order.tone==="orange" ? "bg-[#fbede7] text-[#c65e3d]" : "bg-[#efeee9] text-[#77796f]")}><span className="status-dot"/>{order.status}</span>
            </div>)}
          </div>

          <div className="panel p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5"><div><div className="section-title">Guest favourites</div><div className="section-subtitle">Top sellers this week</div></div><Coffee size={18} className="text-[#a5a195]"/></div>
            <div className="space-y-4">
              {popular.map((item)=><div className="flex items-center gap-3" key={item.name}>
                <div className="food-thumb grid place-items-center text-xl">{item.emoji}</div>
                <div className="min-w-0 flex-1"><div className="text-xs font-bold truncate">{item.name}</div><div className="text-[10px] text-[#85867d] mt-1">{item.category} · {item.sold}</div></div>
                <div className="text-xs font-bold">{item.amount}</div>
              </div>)}
            </div>
            <div className="mt-6 rounded-xl bg-[#f6f1e7] p-4">
              <div className="flex items-center gap-2 text-xs font-bold"><Clock3 size={15} className="text-[#d36a45]"/> Peak hour insight</div>
              <p className="text-[11px] leading-relaxed text-[#77796f] mt-2">Your busiest window is <strong className="text-[#171916]">7 PM – 9 PM</strong>. Consider scheduling extra kitchen coverage.</p>
            </div>
          </div>
        </section>
        <footer className="flex items-center justify-between gap-3 mt-8 text-[10px] text-[#9a9a90]"><span>RestaurantOS · Demo data only</span><span>Built for the rhythm of restaurants.</span></footer>
      </main>
    </div>
  );
}
