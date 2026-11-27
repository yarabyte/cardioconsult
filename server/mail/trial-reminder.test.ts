import { describe, expect, it } from "vitest";
import { buildTrialReminderMail, billingSettingsUrl } from "./trial-reminder";

describe("Rappels essai", () => {
  it("template J-7 sans contenu clinique", () => {
    const mail = buildTrialReminderMail({
      kind: "d7",
      cabinetName: "Cabinet Demo",
      adminPrenom: "Alice",
      trialEndsAt: new Date("2026-12-25T12:00:00Z"),
      billingUrl: "https://demo.cardiosoins.com/parametres/abonnement",
    });
    expect(mail.subject).toContain("7 jours");
    expect(mail.text).toContain("Solo");
    expect(mail.text).toMatch(/Bonjour Alice/);
    expect(mail.text.toLowerCase()).not.toMatch(/patient|févg|nt-probnp|dossier médical/);
    expect(mail.html).toContain("parametres/abonnement");
  });

  it("template J-1", () => {
    const mail = buildTrialReminderMail({
      kind: "d1",
      cabinetName: "Cabinet Demo",
      adminPrenom: null,
      trialEndsAt: new Date("2026-12-25T12:00:00Z"),
      billingUrl: "https://demo.cardiosoins.com/parametres/abonnement",
    });
    expect(mail.subject).toContain("demain");
    expect(mail.text).toMatch(/Bonjour,/);
  });

  it("URL abonnement tenant", () => {
    expect(billingSettingsUrl("dr-martin")).toMatch(/dr-martin/);
    expect(billingSettingsUrl("dr-martin")).toContain("/parametres/abonnement");
  });
});
