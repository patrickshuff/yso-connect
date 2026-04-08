import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { membershipRoleEnum } from "./enums";

export const memberships = pgTable("memberships", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
  role: membershipRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("memberships_organization_id_idx").on(table.organizationId),
  index("memberships_clerk_user_id_idx").on(table.clerkUserId),
]);
