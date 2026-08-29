import { describe, expect, it } from "vitest";
import {
  decodeStoredReturnPath,
  encodeStoredReturnPath,
  normalizeAppReturnUrl,
  normalizeInternalReturnPath,
  postAuthPath,
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

  it("converte soltanto URL di ritorno appartenenti all'app", () => {
    expect(normalizeAppReturnUrl(
      "https://app.escoapesca.it/profilo?returnTo=%2Fu%2Ftrip-1",
    )).toBe("/profilo?returnTo=%2Fu%2Ftrip-1");
    expect(normalizeAppReturnUrl("/profilo")).toBe("/profilo");
    expect(normalizeAppReturnUrl("https://evil.example/profilo")).toBeNull();
  });

  it("propaga il returnTo codificato sulle route auth", () => {
    expect(withReturnPath("/accedi", "/u/a?x=1")).toBe(
      "/accedi?returnTo=%2Fu%2Fa%3Fx%3D1",
    );
    expect(withReturnPath("/registrati", null)).toBe("/registrati");
  });

  it("torna al deep-link dopo il login se il profilo è completo", () => {
    expect(postAuthPath("/uscite/trip-1", true)).toBe("/uscite/trip-1");
  });

  it("preserva il deep-link durante il completamento obbligatorio del profilo", () => {
    expect(postAuthPath("/uscite/trip-1", false)).toBe(
      "/profilo?returnTo=%2Fuscite%2Ftrip-1",
    );
  });

  it("non produce redirect esterni dopo il login", () => {
    expect(postAuthPath("https://evil.example/path", true)).toBe("/");
    expect(postAuthPath(null, true)).toBe("/");
    expect(postAuthPath(null, false)).toBe("/profilo");
  });
});
