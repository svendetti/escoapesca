import assert from "node:assert/strict";
import test from "node:test";
import { buildPushContent, SUPPORTED_PUSH_EVENTS } from "./push-content.js";

test("copre inviti, flusso uscite e prova push", () => {
  assert.ok(SUPPORTED_PUSH_EVENTS.includes("trip_invitation_sent"));
  assert.ok(SUPPORTED_PUSH_EVENTS.includes("push_test"));
  assert.ok(SUPPORTED_PUSH_EVENTS.includes("trip_private_details_updated"));
});

test("l’invito apre la scheda senza dati privati nel payload", () => {
  const content = buildPushContent({
    delivery_id: "delivery-1",
    notification_type: "trip_invitation_sent",
    trip_id: "trip-1",
    trip_title: "Spinning al porto",
    actor_name: "Ada",
  });
  assert.equal(content.url, "/uscite/trip-1");
  assert.match(content.body, /Ada/);
  assert.doesNotMatch(JSON.stringify(content), /coordinate|latitude|longitude|private_notes/i);
});

test("il test push apre le notifiche", () => {
  const content = buildPushContent({
    delivery_id: "delivery-2",
    notification_type: "push_test",
    trip_id: null,
  });
  assert.equal(content.url, "/notifiche");
});
