import { describe, expect, it } from "vitest";
import { containsHomoglyphs, sanitizeSlugInput } from "./slug-homoglyphs";

describe("slug homoglyphs", () => {
  it("accepte un slug ASCII", () => {
    expect(containsHomoglyphs("cabinet-martin")).toBe(false);
  });

  it("détecte le cyrillique", () => {
    expect(containsHomoglyphs("cаbinet")).toBe(true); // а cyrillique
  });

  it("sanitize normalise", () => {
    expect(sanitizeSlugInput("Cabinet Martin!!")).toBe("cabinet-martin");
  });
});
