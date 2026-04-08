import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { formTypeEnum } from "./enums";

export const forms = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  formType: formTypeEnum("form_type").notNull(),
  content: text("content").notNull(),
  requiresSignature: boolean("requires_signature").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("forms_organization_id_idx").on(table.organizationId),
]);
