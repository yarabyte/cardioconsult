import { expect, test } from "@playwright/test";

test.describe("En-têtes de sécurité", () => {
  test("CSP, HSTS (prod), X-Content-Type-Options et Referrer-Policy sont présents", async ({
    request,
  }) => {
    const response = await request.get("/");
    expect(response.ok()).toBeTruthy();

    const csp = response.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src[^;]*'nonce-/);
    expect(csp).toContain("frame-ancestors 'none'");

    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(response.headers()["strict-transport-security"]).toContain("max-age=63072000");
  });

  test("un en-tête x-cc-tenant envoyé par le client est ignoré", async ({ request }) => {
    const forged = await request.get("/", {
      headers: {
        "x-cc-tenant": "forged-evil-tenant",
        "x-tenant-slug": "forged-evil-tenant",
        "x-host-kind": "tenant",
      },
    });
    expect(forged.ok()).toBeTruthy();
    // Jamais reflété vers le client.
    expect(forged.headers()["x-cc-tenant"]).toBeUndefined();
    expect(forged.headers()["x-tenant-slug"]).toBeUndefined();
    expect(forged.headers()["x-host-kind"]).toBeUndefined();

    // Même forgery sur un hôte tenant : pas d'écho, pas d'erreur serveur.
    const tenantHost = await request.get("/", {
      headers: {
        Host: "dr-martin.localhost:3000",
        "x-cc-tenant": "forged-evil-tenant",
      },
    });
    expect(tenantHost.status()).toBeLessThan(500);
    expect(tenantHost.headers()["x-cc-tenant"]).toBeUndefined();
  });
});
