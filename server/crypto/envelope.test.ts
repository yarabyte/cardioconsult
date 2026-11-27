import { describe, expect, it } from "vitest";
import { decryptAesGcm, encryptAesGcm, generateDek } from "./envelope";
import { LocalDevKeyManager } from "./local-dev-key-manager";
import { blindIndexHmac, normalizeForBlindIndex } from "./blind-index";
import { encryptDbPassword, decryptDbPassword } from "./db-password";

describe("chiffrement enveloppe", () => {
  it("fait un aller-retour AES-GCM", () => {
    const dek = generateDek();
    const cipher = encryptAesGcm(dek, "Jeanne Dupont");
    expect(cipher.startsWith("encv1.")).toBe(true);
    expect(decryptAesGcm(dek, cipher)).toBe("Jeanne Dupont");
  });

  it("chiffre et déchiffre une chaîne vide (posologie non renseignée)", () => {
    const dek = generateDek();
    const cipher = encryptAesGcm(dek, "");
    expect(cipher.startsWith("encv1.")).toBe(true);
    expect(decryptAesGcm(dek, cipher)).toBe("");
  });

  it("détecte une altération du texte chiffré (GCM)", () => {
    const dek = generateDek();
    const cipher = encryptAesGcm(dek, "secret clinique");
    const parts = cipher.split(".");
    // Altère un octet du ciphertext
    const data = Buffer.from(parts[2]!, "base64url");
    data[0] = data[0]! ^ 0xff;
    parts[2] = data.toString("base64url");
    expect(() => decryptAesGcm(dek, parts.join("."))).toThrow();
  });

  it("ré-enveloppe une DEK après « rotation » KEK (même secret → wrap distinct)", async () => {
    const km = new LocalDevKeyManager("dev-only-change-me-32chars-minimum!!");
    const dek = generateDek();
    const wrapped1 = await km.wrapDek(dek);
    const wrapped2 = await km.rewrapDek(wrapped1);
    expect(wrapped2.ciphertext).not.toBe(wrapped1.ciphertext);
    const unwrapped = await km.unwrapDek(wrapped2);
    expect(unwrapped.equals(dek)).toBe(true);
  });

  it("produit un index aveugle stable après normalisation", () => {
    const key = generateDek();
    const a = blindIndexHmac(key, "  Dupont ");
    const b = blindIndexHmac(key, "dupont");
    expect(a).toBe(b);
    expect(normalizeForBlindIndex("Émilie")).toBe("emilie");
  });

  it("chiffre les mots de passe DB au repos", () => {
    const secret = "dev-only-change-me-32chars-minimum!!";
    const enc = encryptDbPassword(secret, "s3cret-db-pass");
    expect(enc).not.toContain("s3cret");
    expect(decryptDbPassword(secret, enc)).toBe("s3cret-db-pass");
  });
});
