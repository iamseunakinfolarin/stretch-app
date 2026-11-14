import { describe, expect, it } from "vitest";
import {
  cleanDisplayName,
  cleanEmail,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  validatePassword,
} from "./validation";

describe("email", () => {
  it("trims and lowercases", () => {
    expect(cleanEmail("  Grace@Example.COM ")).toBe("grace@example.com");
  });
  it("accepts a normal address", () => {
    expect(validateEmail("grace@example.com")).toBeNull();
  });
  it.each(["", "   ", "grace", "grace@", "grace@example", "gra ce@example.com"])("refuses %j", (value) => {
    expect(validateEmail(value)).toEqual(expect.any(String));
  });
});

describe("password", () => {
  it("needs something to sign in", () => {
    expect(validatePassword("")).toEqual(expect.any(String));
    expect(validatePassword("x")).toBeNull();
  });
  it("needs 8 characters for a new password", () => {
    expect(validateNewPassword("")).toEqual(expect.any(String));
    expect(validateNewPassword("1234567")).toEqual(expect.any(String));
    expect(validateNewPassword("12345678")).toBeNull();
  });
  it("refuses more than 72 bytes", () => {
    expect(validateNewPassword("a".repeat(72))).toBeNull();
    expect(validateNewPassword("a".repeat(73))).toEqual(expect.any(String));
  });
});

describe("display name", () => {
  it("trims and collapses spaces", () => {
    expect(cleanDisplayName("  Grace   Hopper ")).toBe("Grace Hopper");
  });
  it("refuses empty and blank names", () => {
    expect(validateDisplayName("")).toEqual(expect.any(String));
    expect(validateDisplayName("   ")).toEqual(expect.any(String));
  });
  it("accepts 1 to 40 characters, as the database does", () => {
    expect(validateDisplayName("G")).toBeNull();
    expect(validateDisplayName("x".repeat(40))).toBeNull();
    expect(validateDisplayName("x".repeat(41))).toEqual(expect.any(String));
  });
  it("counts an emoji as one character", () => {
    expect(validateDisplayName("🙏".repeat(40))).toBeNull();
  });
});
