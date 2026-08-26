import { describe, expect, it, vi } from "vitest";
import {
  copyPublicTripLink,
  publicTripUrl,
  tripWhatsAppMessage,
  whatsappShareUrl,
  type TripShareData,
} from "./tripShare";

const shareData: TripShareData = {
  tripId: "27be0ea7-abce-4b4a-a445-b4a6043a0b1c",
  title: "Spinning domenica mattina",
  techniqueName: "Spinning",
  publicZone: "Fiumicino",
  startsAt: "2030-01-06T08:00:00+01:00",
  availablePlaces: 2,
  tripType: "protected",
};

describe("trip sharing", () => {
  it("usa esclusivamente la route pubblica stabile", () => {
    expect(publicTripUrl(shareData.tripId)).toBe(
      "https://app.escoapesca.it/u/27be0ea7-abce-4b4a-a445-b4a6043a0b1c",
    );
  });

  it("genera un messaggio WhatsApp solo da dati pubblici", () => {
    const message = tripWhatsAppMessage(shareData);
    expect(message).toContain("Spinning");
    expect(message).toContain("Fiumicino");
    expect(message).toContain("2 posti disponibili");
    expect(message).toContain("Spot protetto");
    expect(message).toContain(publicTripUrl(shareData.tripId));
    expect(decodeURIComponent(whatsappShareUrl(shareData))).toContain(message);
  });

  it("copia il link tramite Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(copyPublicTripLink(shareData.tripId, { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(publicTripUrl(shareData.tripId));
  });
});
