import { describe, expect, it } from "vitest";

import {
  participationProgressNotice,
  privateDetailsUnavailableMessage,
} from "./participationProgress";

describe("participation progress", () => {
  it("distingue una richiesta accettata dalla conferma definitiva", () => {
    expect(participationProgressNotice("accepted")).toMatchObject({
      kind: "info",
      message: expect.stringContaining("deve ancora confermare"),
    });
    expect(participationProgressNotice("confirmed")).toMatchObject({
      kind: "success",
      message: expect.stringContaining("partecipazione è confermata"),
    });
  });

  it("non mostra uno stato di partecipazione a chi non ne ha uno", () => {
    expect(participationProgressNotice(null)).toBeNull();
  });

  it("spiega perché i dettagli sono nascosti prima della conferma", () => {
    expect(privateDetailsUnavailableMessage("accepted", "open")).toContain(
      "confermerà definitivamente",
    );
  });

  it("distingue i dettagli non inseriti dopo una conferma", () => {
    expect(privateDetailsUnavailableMessage("confirmed", "confirmed")).toContain(
      "non ha ancora pubblicato",
    );
  });
});
