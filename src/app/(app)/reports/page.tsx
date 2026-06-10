import { requireOwner } from "@/lib/auth-utils";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  await requireOwner();
  return <ReportsClient />;
}
