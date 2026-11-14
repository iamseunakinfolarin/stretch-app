import { describe, expect, it } from "vitest";
import { authErrorMessage, dataErrorMessage } from "./messages";

describe("authErrorMessage", () => {
  it("explains a wrong email or password without saying which", () => {
    expect(authErrorMessage({ code: "invalid_credentials" })).toMatch(/don't match/);
    expect(authErrorMessage({ message: "Invalid login credentials" })).toMatch(/don't match/);
  });
  it("points an existing account to sign-in", () => {
    expect(authErrorMessage({ code: "user_already_exists" })).toMatch(/Sign in instead/);
    expect(authErrorMessage({ message: "User already registered" })).toMatch(/Sign in instead/);
  });
  it("recognises being offline", () => {
    expect(authErrorMessage({ name: "AuthRetryableFetchError", message: "Failed to fetch" })).toMatch(/connection/);
    expect(authErrorMessage(new TypeError("Failed to fetch"))).toMatch(/connection/);
  });
  it("explains the email confirmation setting", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" })).toMatch(/confirmation/);
  });
  it("never shows a raw technical message", () => {
    expect(authErrorMessage({ code: "unexpected_failure", message: "pq: deadlock detected" })).toBe(
      "Something went wrong. Please try again.",
    );
    expect(authErrorMessage(null)).toBe("Something went wrong. Please try again.");
  });
});

describe("dataErrorMessage", () => {
  it("maps database rule and permission errors", () => {
    expect(dataErrorMessage({ code: "23514" })).toMatch(/isn't allowed/);
    expect(dataErrorMessage({ code: "42501" })).toMatch(/can't change this/);
    expect(dataErrorMessage({ code: "28000" })).toMatch(/sign in again/);
    expect(dataErrorMessage({ code: "22023" })).toMatch(/20 prayer points/);
    expect(dataErrorMessage({ message: "Failed to fetch" })).toMatch(/connection/);
  });
});
