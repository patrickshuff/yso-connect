import { index, integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { teams } from "./teams";
import { players } from "./players";

export const teamPlayers = pgTable("team_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  jerseyNumber: integer("jersey_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("team_players_team_id_idx").on(table.teamId),
  index("team_players_player_id_idx").on(table.playerId),
]);
