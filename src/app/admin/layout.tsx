import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrganizations } from "@/lib/memberships";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    // Middleware handles the primary redirect with UTM preservation.
    throw new Error("Unauthorized");
  }

  const orgs = await getUserOrganizations(userId);
  const isOwner = orgs.some((org) => org.role === "owner");
  if (!isOwner) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
