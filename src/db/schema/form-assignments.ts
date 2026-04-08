import { date, index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { forms } from "./forms";
import { organizations } from "./organizations";
import { formAssignmentTypeEnum } from "./enums";

export const formAssignments = pgTable("form_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  formId: uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  assignmentType: formAssignmentTypeEnum("assignment_type").notNull(),
  assignmentTargetId: uuid("assignment_target_id"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("form_assignments_form_id_idx").on(table.formId),
  index("form_assignments_organization_id_idx").on(table.organizationId),
]);
