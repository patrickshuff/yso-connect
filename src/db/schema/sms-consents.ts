import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { guardians } from "./guardians";
import { consentMethodEnum } from "./enums";

export const smsConsents = pgTable("sms_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  guardianId: uuid("guardian_id").references(() => guardians.id, { onDelete: "set null" }),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  phoneNumber: text("phone_number").notNull(),
  consentGiven: boolean("consent_given").notNull(),
  consentMethod: consentMethodEnum("consent_method").notNull(),
  consentText: text("consent_text").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  guardianName: text("guardian_name"),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("sms_consents_organization_id_idx").on(table.organizationId),
  index("sms_consents_guardian_id_idx").on(table.guardianId),
  index("sms_consents_phone_number_idx").on(table.phoneNumber),
]);
