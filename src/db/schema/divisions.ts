import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { sports } from "./sports";

export const divisions = pgTable("divisions", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sportId: uuid("sport_id").notNull().references(() => sports.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("divisions_organization_id_idx").on(table.organizationId),
  index("divisions_sport_id_idx").on(table.sportId),
]);
