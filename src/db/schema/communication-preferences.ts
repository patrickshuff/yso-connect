import { boolean, index, pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { guardians } from "./guardians";
import { organizations } from "./organizations";

export const communicationPreferences = pgTable("communication_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  guardianId: uuid("guardian_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  smsOptIn: boolean("sms_opt_in").notNull().default(true),
  emailOptIn: boolean("email_opt_in").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  unique("communication_preferences_guardian_org_unique").on(table.guardianId, table.organizationId),
  index("communication_preferences_guardian_id_idx").on(table.guardianId),
  index("communication_preferences_organization_id_idx").on(table.organizationId),
]);
