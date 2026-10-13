import { describe, it, expect, vi, afterEach } from "vitest";
import { getYahooData } from "@/lib/providers/yahoo";

const respond = (status: number, body: unknown = {}) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe("getYahooData", () => {
  it("returns null when Yahoo says the ticker doesn't exist", async () => {
    vi.stubGlobal("fetch", respond(404, { chart: { result: null, error: { code: "Not Found" } } }));
    await expect(getYahooData("NOPE")).resolves.toBeNull();
  });

  // A rate limit must not look like "unknown ticker" — callers would 404 a real page.
  it("throws when every endpoint fails transiently", async () => {
    vi.stubGlobal("fetch", respond(429));
    await expect(getYahooData("AAPL")).rejects.toThrow();
  });

  it("returns null when a 200 response has no price", async () => {
    vi.stubGlobal("fetch", respond(200, { chart: { result: [{ meta: {} }] } }));
    await expect(getYahooData("NOPE")).resolves.toBeNull();
  });

  it("returns null when one base is rate-limited and the other says unknown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(new Response("", { status: 429 }))
        .mockResolvedValueOnce(new Response("", { status: 404 })),
    );
    await expect(getYahooData("NOPE")).resolves.toBeNull();
  });

  it("throws on network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ETIMEDOUT")));
    await expect(getYahooData("AAPL")).rejects.toThrow();
  });
});
