/**
 * Shared input validation utilities for server actions and API routes.
 */

/** Maximum lengths for common text fields. */
export const MAX_LENGTHS = {
  title: 256,
  description: 2048,
  body: 10_000,
  content: 50_000,
  csvText: 500_000,
  name: 128,
  message: 5_000,
  phone: 20,
  email: 320,
  url: 2048,
  slug: 128,
  generic: 1024,
} as const;

/** Validates that a string does not exceed a maximum length. Returns the trimmed string or null. */
export function validateLength(
  value: string | null | undefined,
  maxLength: number,
): { valid: true; value: string } | { valid: false; error: string } {
  if (!value) {
    return { valid: false, error: "Value is required" };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Value is required" };
  }
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Value exceeds maximum length of ${maxLength} characters` };
  }
  return { valid: true, value: trimmed };
}

/** Validates that a value is one of the allowed enum values. */
export function validateEnum<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): { valid: true; value: T } | { valid: false; error: string } {
  if (!value || !allowed.includes(value as T)) {
    return { valid: false, error: `Invalid value. Allowed: ${allowed.join(", ")}` };
  }
  return { valid: true, value: value as T };
}

const VALID_FORM_TYPES = ["waiver", "medical", "permission", "registration", "custom"] as const;
const VALID_ASSIGNMENT_TYPES = ["organization", "team", "player"] as const;
const VALID_PAYMENT_TYPES = ["fee", "fundraiser", "donation", "other"] as const;

export { VALID_FORM_TYPES, VALID_ASSIGNMENT_TYPES, VALID_PAYMENT_TYPES };
