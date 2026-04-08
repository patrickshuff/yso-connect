import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { messageTargetTypeEnum, messageChannelEnum } from "./enums";

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  senderId: varchar("sender_id", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  targetType: messageTargetTypeEnum("target_type").notNull(),
  targetId: uuid("target_id"),
  channel: messageChannelEnum("channel").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("messages_organization_id_idx").on(table.organizationId),
  index("messages_sender_id_idx").on(table.senderId),
]);
