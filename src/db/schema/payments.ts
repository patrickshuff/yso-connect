import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { paymentItems } from "./payment-items";
import { guardians } from "./guardians";
import { paymentStatusEnum } from "./enums";

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  paymentItemId: uuid("payment_item_id").notNull().references(() => paymentItems.id, { onDelete: "cascade" }),
  guardianId: uuid("guardian_id").references(() => guardians.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("usd"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  payerName: varchar("payer_name", { length: 255 }).notNull(),
  payerEmail: text("payer_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("payments_organization_id_idx").on(table.organizationId),
  index("payments_payment_item_id_idx").on(table.paymentItemId),
  index("payments_stripe_session_id_idx").on(table.stripeSessionId),
]);
