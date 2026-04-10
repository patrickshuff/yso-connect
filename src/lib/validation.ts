export const MAX_LENGTHS = {
  title: 255,
  content: 50000,
  description: 1000,
} as const;

export const VALID_FORM_TYPES = [
  "waiver",
  "medical",
  "permission",
  "registration",
  "custom",
] as const;

interface ValidResult<T> {
  valid: true;
  value: T;
}

interface InvalidResult {
  valid: false;
  error: string;
}

type ValidationResult<T> = ValidResult<T> | InvalidResult;

export function validateLength(
  value: string | null | undefined,
  maxLength: number,
): ValidationResult<string> {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: "This field is required" };
  }
  if (value.length > maxLength) {
    return {
      valid: false,
      error: `Exceeds maximum length of ${maxLength} characters`,
    };
  }
  return { valid: true, value: value.trim() };
}

export function validateEnum<T extends string>(
  value: string | null | undefined,
  validValues: readonly T[],
): ValidationResult<T> {
  if (!value) {
    return { valid: false, error: "This field is required" };
  }
  if (!validValues.includes(value as T)) {
    return {
      valid: false,
      error: `Must be one of: ${validValues.join(", ")}`,
    };
  }
  return { valid: true, value: value as T };
}
