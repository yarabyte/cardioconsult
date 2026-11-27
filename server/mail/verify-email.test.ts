import { describe, expect, it } from "vitest";
import { buildVerifyEmailMail } from "./verify-email";

describe("buildVerifyEmailMail", () => {
  it("inclut le lien et exclut toute donnée clinique", () => {
    const mail = buildVerifyEmailMail({
      firstName: "Alice",
      verifyUrl: "http://localhost:3000/api/auth/verify-email?token=abc",
    });
    expect(mail.subject).toMatch(/e-mail/i);
    expect(mail.text).toContain("http://localhost:3000/api/auth/verify-email?token=abc");
    expect(mail.html).toContain("Confirmer mon adresse e-mail");
    expect(mail.text.toLowerCase()).not.toMatch(/patient|dossier|diagnostic/);
  });
});
