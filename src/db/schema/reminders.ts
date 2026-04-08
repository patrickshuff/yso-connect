import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { reminderTypeEnum } from "./enums";

export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    reminderTime: timestamp("reminder_time", { withTimezone: true }).notNull(),
    reminderType: reminderTypeEnum("reminder_type").notNull(),
    sent: boolean("sent").notNull().default(false),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("reminders_event_id_idx").on(table.eventId),
    index("reminders_reminder_time_idx").on(table.reminderTime),
    index("reminders_sent_idx").on(table.sent),
  ],
);
