import { requireOwner } from "@/lib/auth-utils";
import { AnalyticsClient } from "./AnalyticsClient";

export default async function AnalyticsPage() {
  await requireOwner();
  return <AnalyticsClient />;
}
