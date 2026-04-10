import { describe, expect, it, vi } from "vitest";

const { insertValuesMock, insertMock, headersMock } = vi.hoisted(() => {
  const insertValuesMock = vi.fn();
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));
  const headersMock = vi.fn();
  return { insertValuesMock, insertMock, headersMock };
});

vi.mock("@/db", () => ({
  db: {
    insert: insertMock,
  },
}));

vi.mock("@/db/schema", () => ({
  smsConsents: {},
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import { submitGeneralSmsConsent } from "./actions";

describe("submitGeneralSmsConsent", () => {
  it("accepts valid consent submissions", async () => {
    headersMock.mockResolvedValue(
      new Headers({
        "x-forwarded-for": "1.2.3.4",
        "user-agent": "vitest",
      }),
    );
    insertValuesMock.mockResolvedValue(undefined);

    const formData = new FormData();
    formData.set("phoneNumber", "(415) 555-1212");
    formData.set("consentChecked", "on");
    formData.set("consentText", "I agree");
    formData.set("guardianName", "Jamie Doe");

    const result = await submitGeneralSmsConsent(
      { success: false, error: null },
      formData,
    );

    expect(result).toEqual({ success: true, error: null });
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
  });

  it("rejects missing phone input", async () => {
    const formData = new FormData();
    formData.set("consentChecked", "on");
    formData.set("consentText", "I agree");

    const result = await submitGeneralSmsConsent(
      { success: false, error: null },
      formData,
    );

    expect(result).toEqual({
      success: false,
      error: "Phone number is required.",
    });
  });

  it("rejects when checkbox is not checked", async () => {
    const formData = new FormData();
    formData.set("phoneNumber", "4155551212");
    formData.set("consentText", "I agree");

    const result = await submitGeneralSmsConsent(
      { success: false, error: null },
      formData,
    );

    expect(result).toEqual({
      success: false,
      error: "You must agree to receive text messages.",
    });
  });

  it("rejects invalid phone numbers", async () => {
    const formData = new FormData();
    formData.set("phoneNumber", "not-a-phone");
    formData.set("consentChecked", "on");
    formData.set("consentText", "I agree");

    const result = await submitGeneralSmsConsent(
      { success: false, error: null },
      formData,
    );

    expect(result).toEqual({
      success: false,
      error:
        "Please enter a valid phone number (10-15 digits, US or international).",
    });
  });
});
