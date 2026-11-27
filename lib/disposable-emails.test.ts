import { describe, expect, it } from "vitest";
import { isDisposableEmail } from "./disposable-emails";

describe("isDisposableEmail", () => {
  it("refuse yopmail", () => {
    expect(isDisposableEmail("doc@yopmail.com")).toBe(true);
  });

  it("accepte un domaine pro", () => {
    expect(isDisposableEmail("c.martin@cabinet-martin.fr")).toBe(false);
  });
});
