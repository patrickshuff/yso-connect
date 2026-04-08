import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { seasons } from "./seasons";
import { divisions } from "./divisions";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  seasonId: uuid("season_id").notNull().references(() => seasons.id, { onDelete: "cascade" }),
  divisionId: uuid("division_id").references(() => divisions.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("teams_organization_id_idx").on(table.organizationId),
  index("teams_season_id_idx").on(table.seasonId),
  index("teams_division_id_idx").on(table.divisionId),
]);
