import { boolean, index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { players } from "./players";
import { guardians } from "./guardians";
import { relationshipTypeEnum } from "./enums";

export const playerGuardians = pgTable("player_guardians", {
  id: uuid("id").primaryKey().defaultRandom(),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  guardianId: uuid("guardian_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
  relationship: relationshipTypeEnum("relationship").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("player_guardians_player_id_idx").on(table.playerId),
  index("player_guardians_guardian_id_idx").on(table.guardianId),
]);
