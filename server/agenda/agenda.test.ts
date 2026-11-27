import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/agenda/status";
import { hasTimeOverlap } from "./service";

describe("agenda status machine", () => {
  it("autorise prevu → arrive, refuse prevu → pret", () => {
    expect(canTransition("prevu", "arrive")).toBe(true);
    expect(canTransition("prevu", "pret")).toBe(false);
    expect(canTransition("en_preparation", "pret")).toBe(true);
  });
});

describe("chevauchement créneaux", () => {
  it("détecte un chevauchement temporel", () => {
    const existing = [
      {
        id: "a2",
        physicianId: "demo-medecin",
        startsAt: new Date("2026-11-23T09:00:00+01:00"),
        endsAt: new Date("2026-11-23T09:30:00+01:00"),
        status: "pret",
        waitlist: false,
      },
    ];
    const overlap = hasTimeOverlap(
      existing,
      "demo-medecin",
      new Date("2026-11-23T09:00:00+01:00"),
      new Date("2026-11-23T09:20:00+01:00"),
    );
    expect(overlap).toBe(true);
  });

  it("ignore les RDV en liste d'attente", () => {
    const existing = [
      {
        id: "w1",
        physicianId: "demo-medecin",
        startsAt: new Date("2026-11-23T15:00:00+01:00"),
        endsAt: new Date("2026-11-23T15:20:00+01:00"),
        status: "prevu",
        waitlist: true,
      },
    ];
    const overlap = hasTimeOverlap(
      existing,
      "demo-medecin",
      new Date("2026-11-23T15:00:00+01:00"),
      new Date("2026-11-23T15:20:00+01:00"),
    );
    expect(overlap).toBe(false);
  });
});
