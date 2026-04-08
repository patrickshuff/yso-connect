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
