import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEmailContent,
  escapeHtml,
  SUPPORTED_EMAIL_EVENTS,
} from "./email-content.js";

const delivery = {
  event_type: "participation_requested",
  trip_id: "27be0ea7-abce-4b4a-a445-b4a6043a0b1c",
  trip_title: "Spinning <al porto>",
  actor_name: "Ada & Luca",
};

test("copre gli otto eventi critici", () => {
  assert.deepEqual([...SUPPORTED_EMAIL_EVENTS].sort(), [
    "participation_accepted",
    "participation_cancelled",
    "participation_rejected",
    "participation_requested",
    "trip_cancelled",
    "trip_confirmed",
    "trip_private_details_updated",
    "trip_updated",
  ]);
});

test("genera il deep-link autenticato e una CTA operativa", () => {
  const content = buildEmailContent(delivery);
  assert.equal(content.ctaUrl, "https://app.escoapesca.it/uscite/27be0ea7-abce-4b4a-a445-b4a6043a0b1c");
  assert.match(content.text, /Vedi l’uscita/);
  assert.match(content.html, /Vedi l’uscita/);
});

test("escapa i valori dinamici nell'HTML", () => {
  const content = buildEmailContent(delivery);
  assert.doesNotMatch(content.html, /<al porto>/);
  assert.match(content.html, /&lt;al porto&gt;/);
  assert.match(content.html, /Ada &amp; Luca/);
  assert.equal(escapeHtml("<b>ciao</b>"), "&lt;b&gt;ciao&lt;/b&gt;");
});

test("non include dettagli privati nell'email di aggiornamento incontro", () => {
  const content = buildEmailContent({
    ...delivery,
    event_type: "trip_private_details_updated",
  });
  assert.match(content.text, /disponibili su EscoAPesca/);
  assert.doesNotMatch(content.text.toLowerCase(), /coordinate|latitudine|longitudine|punto preciso|note private/);
});
