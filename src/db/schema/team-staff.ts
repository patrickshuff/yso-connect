import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { teams } from "./teams";
import { memberships } from "./memberships";
import { teamStaffRoleEnum } from "./enums";

export const teamStaff = pgTable("team_staff", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  membershipId: uuid("membership_id").notNull().references(() => memberships.id, { onDelete: "cascade" }),
  role: teamStaffRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("team_staff_team_id_idx").on(table.teamId),
  index("team_staff_membership_id_idx").on(table.membershipId),
]);
