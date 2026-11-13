import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses NEXT_PUBLIC_SITE_URL when it is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://stretch.example");
    expect(getSiteUrl("http://localhost:3000")).toBe("https://stretch.example");
  });

  it("removes trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://stretch.example//");
    expect(getSiteUrl()).toBe("https://stretch.example");
  });

  it("falls back to the given address when the variable is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "  ");
    expect(getSiteUrl("https://preview.example")).toBe("https://preview.example");
  });

  it("falls back to the current browser address when nothing is given", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteUrl()).toBe(window.location.origin);
  });
});
