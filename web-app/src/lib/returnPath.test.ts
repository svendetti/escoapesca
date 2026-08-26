import { describe, expect, it } from "vitest";
import {
  decodeStoredReturnPath,
  encodeStoredReturnPath,
  normalizeInternalReturnPath,
  withReturnPath,
} from "./returnPath";

describe("return path", () => {
  it("accetta soltanto path interni", () => {
    expect(normalizeInternalReturnPath("/u/123?source=share#details")).toBe(
      "/u/123?source=share#details",
    );
    expect(normalizeInternalReturnPath("https://evil.example/path")).toBeNull();
    expect(normalizeInternalReturnPath("//evil.example/path")).toBeNull();
    expect(normalizeInternalReturnPath("/\\evil.example/path")).toBeNull();
    expect(normalizeInternalReturnPath("javascript:alert(1)")).toBeNull();
  });

  it("scarta valori scaduti o alterati", () => {
    const encoded = encodeStoredReturnPath("/u/abc", 1_000);
    expect(decodeStoredReturnPath(encoded, 1_001)).toBe("/u/abc");
    expect(decodeStoredReturnPath(encoded, 8 * 24 * 60 * 60 * 1000)).toBeNull();
    expect(decodeStoredReturnPath("{not-json")).toBeNull();
  });

  it("propaga il returnTo codificato sulle route auth", () => {
    expect(withReturnPath("/accedi", "/u/a?x=1")).toBe(
      "/accedi?returnTo=%2Fu%2Fa%3Fx%3D1",
    );
    expect(withReturnPath("/registrati", null)).toBe("/registrati");
  });
});
