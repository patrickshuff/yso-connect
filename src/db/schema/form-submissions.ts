import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { formAssignments } from "./form-assignments";
import { guardians } from "./guardians";
import { players } from "./players";
import { formSubmissionStatusEnum } from "./enums";

export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  formAssignmentId: uuid("form_assignment_id").notNull().references(() => formAssignments.id, { onDelete: "cascade" }),
  guardianId: uuid("guardian_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
  playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  status: formSubmissionStatusEnum("status").notNull().default("pending"),
  signatureName: text("signature_name"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("form_submissions_form_assignment_id_idx").on(table.formAssignmentId),
  index("form_submissions_guardian_id_idx").on(table.guardianId),
  index("form_submissions_player_id_idx").on(table.playerId),
]);
