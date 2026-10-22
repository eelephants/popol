import { describe, it, expect } from "vitest";
import { adsenseClient, adsTxt } from "@/lib/ads";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/site";

describe("adsenseClient", () => {
  it("accepts a well-formed publisher id, trimmed", () => {
    expect(adsenseClient(" ca-pub-1234567890123456 ")).toBe("ca-pub-1234567890123456");
  });
  it("ignores missing or malformed ids so no broken ad tag ships", () => {
    expect(adsenseClient(undefined)).toBeNull();
    expect(adsenseClient("")).toBeNull();
    expect(adsenseClient("pub-1234567890123456")).toBeNull();
    expect(adsenseClient("ca-pub-123")).toBeNull();
  });
});

describe("adsTxt", () => {
  it("writes Google's seller line with the pub- id", () => {
    expect(adsTxt("ca-pub-1234567890123456")).toBe("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
  });
  it("returns nothing without an id", () => {
    expect(adsTxt(null)).toBeNull();
  });
});

describe("privacy page", () => {
  it("is in the sitemap", () => {
    expect(sitemap().map((e) => e.url)).toContain(`${SITE_URL}/privacy`);
  });
});
