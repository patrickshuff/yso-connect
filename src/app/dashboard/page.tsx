import { redirect } from "next/navigation";
import { getCurrentUserOrganizations } from "@/lib/auth";

export default async function DashboardPage() {
  const orgs = await getCurrentUserOrganizations();

  if (orgs.length === 0) {
    redirect("/dashboard/onboarding");
  }

  redirect(`/dashboard/${orgs[0].id}`);
}
