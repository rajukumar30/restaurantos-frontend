import { OverviewDashboard } from "@/components/platform-overview";
import SubscriptionHealth from "@/components/platform-subscription-health";

export default function PlatformDashboard() {
  return <><OverviewDashboard /><div className="px-4 pb-8 sm:px-8"><SubscriptionHealth /></div></>;
}
