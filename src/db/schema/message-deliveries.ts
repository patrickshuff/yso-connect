import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { messages } from "./messages";
import { guardians } from "./guardians";
import { deliveryChannelEnum, deliveryStatusEnum } from "./enums";

export const messageDeliveries = pgTable("message_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  guardianId: uuid("guardian_id").notNull().references(() => guardians.id, { onDelete: "cascade" }),
  channel: deliveryChannelEnum("channel").notNull(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  externalId: varchar("external_id", { length: 255 }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("message_deliveries_message_id_idx").on(table.messageId),
  index("message_deliveries_guardian_id_idx").on(table.guardianId),
]);
