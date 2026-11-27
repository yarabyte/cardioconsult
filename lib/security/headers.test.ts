import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  INTERNAL_REQUEST_HEADERS,
  stripInternalRequestHeaders,
} from "./headers";

describe("buildSecurityHeaders", () => {
  it("inclut CSP avec nonce et les en-têtes de base", () => {
    const headers = buildSecurityHeaders({ nonce: "abc123", isProduction: false });
    expect(headers["Content-Security-Policy"]).toContain("nonce-abc123");
    expect(headers["Content-Security-Policy"]).toMatch(/script-src[^;]*'nonce-abc123'/);
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("ajoute HSTS uniquement en production", () => {
    const headers = buildSecurityHeaders({ nonce: "xyz", isProduction: true });
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
  });

  it("n'autorise pas unsafe-inline sur script-src", () => {
    const csp = buildContentSecurityPolicy("n", { isProduction: true });
    const scriptSrc = csp.split("; ").find((d) => d.startsWith("script-src"));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("autorise unsafe-eval uniquement hors production (React / Next.js debug)", () => {
    const prod = buildContentSecurityPolicy("n", { isProduction: true });
    const prodScript = prod.split("; ").find((d) => d.startsWith("script-src"));
    expect(prodScript).not.toContain("'unsafe-eval'");

    const dev = buildContentSecurityPolicy("n", { isProduction: false });
    const devScript = dev.split("; ").find((d) => d.startsWith("script-src"));
    expect(devScript).toContain("'unsafe-eval'");

    const headersDev = buildSecurityHeaders({ nonce: "n", isProduction: false });
    expect(headersDev["Content-Security-Policy"]).toContain("'unsafe-eval'");
  });

  it("n'impose pas upgrade-insecure-requests hors production (HTTP local)", () => {
    const prod = buildContentSecurityPolicy("n", { isProduction: true });
    expect(prod).toContain("upgrade-insecure-requests");

    const dev = buildContentSecurityPolicy("n", { isProduction: false });
    expect(dev).not.toContain("upgrade-insecure-requests");
    expect(dev).toMatch(/connect-src[^;]*ws:/);
  });
});

describe("stripInternalRequestHeaders", () => {
  it("supprime x-cc-tenant et les autres en-têtes internes forgés", () => {
    const headers = new Headers({
      "x-cc-tenant": "evil-tenant",
      "x-tenant-slug": "evil",
      "x-host-kind": "console",
      host: "dr-martin.localhost:3000",
    });
    stripInternalRequestHeaders(headers);
    for (const name of INTERNAL_REQUEST_HEADERS) {
      expect(headers.get(name)).toBeNull();
    }
    expect(headers.get("host")).toBe("dr-martin.localhost:3000");
  });
});
