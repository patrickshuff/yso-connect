import { pgEnum } from "drizzle-orm/pg-core";

export const contactPreferenceEnum = pgEnum("contact_preference", [
  "sms",
  "email",
  "both",
]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "owner",
  "admin",
  "coach",
  "guardian",
]);

export const teamStaffRoleEnum = pgEnum("team_staff_role", [
  "head_coach",
  "assistant_coach",
  "manager",
]);

export const relationshipTypeEnum = pgEnum("relationship_type", [
  "mother",
  "father",
  "guardian",
  "grandparent",
  "other",
]);

export const messageTargetTypeEnum = pgEnum("message_target_type", [
  "team",
  "organization",
  "custom",
]);

export const messageChannelEnum = pgEnum("message_channel", [
  "sms",
  "email",
  "both",
]);

export const deliveryChannelEnum = pgEnum("delivery_channel", [
  "sms",
  "email",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "game",
  "practice",
  "event",
  "meeting",
]);

export const reminderTypeEnum = pgEnum("reminder_type", [
  "24h_before",
  "2h_before",
  "custom",
]);

export const formTypeEnum = pgEnum("form_type", [
  "waiver",
  "medical",
  "permission",
  "registration",
  "custom",
]);

export const formAssignmentTypeEnum = pgEnum("form_assignment_type", [
  "organization",
  "team",
  "player",
]);

export const formSubmissionStatusEnum = pgEnum("form_submission_status", [
  "pending",
  "completed",
]);

export const interestSubmissionStatusEnum = pgEnum(
  "interest_submission_status",
  ["new", "contacted", "enrolled", "declined"],
);
