import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { memberships, organizations } from "@/db/schema";

export type MembershipRole = "owner" | "admin" | "coach" | "guardian";

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  owner: 4,
  admin: 3,
  coach: 2,
  guardian: 1,
};

export async function createMembership(
  orgId: string,
  clerkUserId: string,
  role: MembershipRole,
) {
  const [membership] = await db
    .insert(memberships)
    .values({
      organizationId: orgId,
      clerkUserId,
      role,
    })
    .returning();
  return membership;
}

export async function getMembership(orgId: string, clerkUserId: string) {
  const [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, orgId),
        eq(memberships.clerkUserId, clerkUserId),
      ),
    );
  return membership ?? null;
}

export async function getUserOrganizations(clerkUserId: string) {
  const rows = await db
    .select({
      membership: memberships,
      organization: organizations,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.clerkUserId, clerkUserId));

  return rows.map((row) => ({
    ...row.organization,
    role: row.membership.role,
  }));
}

export async function requireRole(
  orgId: string,
  clerkUserId: string,
  minimumRole: MembershipRole,
): Promise<typeof memberships.$inferSelect> {
  const membership = await getMembership(orgId, clerkUserId);

  if (!membership) {
    throw new AuthorizationError("Not a member of this organization", 403);
  }

  const userLevel = ROLE_HIERARCHY[membership.role];
  const requiredLevel = ROLE_HIERARCHY[minimumRole];

  if (userLevel < requiredLevel) {
    throw new AuthorizationError("Insufficient permissions", 403);
  }

  return membership;
}

export class AuthorizationError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}
