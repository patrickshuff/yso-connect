/**
 * Shared input validation utilities for server actions.
 *
 * Provides typed validation results so callers can handle errors uniformly
 * without throwing exceptions for user-input problems.
 */

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_LENGTHS = {
  title: 200,
  description: 1000,
  content: 50_000,
} as const;

export const VALID_FORM_TYPES = [
  "waiver",
  "medical",
  "permission",
  "registration",
  "custom",
] as const;

export type ValidFormType = (typeof VALID_FORM_TYPES)[number];

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

interface ValidationSuccess<T> {
  valid: true;
  value: T;
}

interface ValidationFailure {
  valid: false;
  error: string;
}

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Validates that a string field is present and within the allowed length.
 * Trims whitespace before checking.
 */
export function validateLength(
  raw: string | null | undefined,
  maxLength: number,
): ValidationResult<string> {
  const value = raw?.trim() ?? "";

  if (!value) {
    logger.debug("validateLength: empty value", { maxLength });
    return { valid: false, error: "This field is required" };
  }

  if (value.length > maxLength) {
    logger.debug("validateLength: value too long", { length: value.length, maxLength });
    return { valid: false, error: `Must be ${maxLength} characters or fewer` };
  }

  return { valid: true, value };
}

/**
 * Validates that a string value is one of the accepted enum members.
 */
export function validateEnum<const T extends readonly string[]>(
  raw: string | null | undefined,
  validValues: T,
): ValidationResult<T[number]> {
  const value = raw?.trim() ?? "";

  if (!value) {
    return { valid: false, error: "This field is required" };
  }

  if (!(validValues as readonly string[]).includes(value)) {
    logger.debug("validateEnum: invalid value", { value, validValues });
    return {
      valid: false,
      error: `Must be one of: ${validValues.join(", ")}`,
    };
  }

  return { valid: true, value: value as T[number] };
}
