import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { interestSubmissionStatusEnum } from "./enums";

export const interestSubmissions = pgTable(
  "interest_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    parentName: varchar("parent_name", { length: 255 }).notNull(),
    parentEmail: varchar("parent_email", { length: 255 }).notNull(),
    parentPhone: varchar("parent_phone", { length: 50 }),
    childName: varchar("child_name", { length: 255 }),
    childAge: integer("child_age"),
    sportInterest: text("sport_interest"),
    message: text("message"),
    status: interestSubmissionStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("interest_submissions_organization_id_idx").on(table.organizationId),
    index("interest_submissions_status_idx").on(table.status),
  ],
);
