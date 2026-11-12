import { UsageDashboard } from "@/components/usage-dashboard";
import { getUsageData } from "@/lib/usage-data";

export default async function Home() {
  const data = await getUsageData();
  return <UsageDashboard data={data} />;
}
