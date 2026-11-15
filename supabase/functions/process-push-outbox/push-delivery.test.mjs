import assert from "node:assert/strict";
import test from "node:test";
import { sendValidatedPush, UntrustedPushEndpointError } from "./push-delivery.js";

test("invia soltanto ai servizi push supportati, con timeout", async () => {
  for (const endpoint of [
    "https://fcm.googleapis.com/wp/token",
    "https://updates.push.services.mozilla.com/wpush/v2/token",
    "https://web.push.apple.com/token",
    "https://wns2-region.notify.windows.com/w/?token=example",
    " HTTPS://FCM.GOOGLEAPIS.COM:443/wp/token ",
  ]) {
    let calls = 0;
    await sendValidatedPush({ endpoint, p256dh: "key", auth_secret: "auth" }, { title: "Test" }, async (subscription, payload, options) => {
      calls += 1;
      assert.equal(subscription.endpoint, new URL(endpoint).href);
      assert.equal(JSON.parse(payload).title, "Test");
      assert.equal(options.timeout, 10000);
    });
    assert.equal(calls, 1);
  }
});

test("non effettua richieste per endpoint arbitrari o URL ingannevoli", async () => {
  for (const endpoint of [
    null, "not a URL", "https://127.0.0.1/push", "https://[::1]/push",
    "https://169.254.169.254/latest", "https://internal.example/push",
    "http://fcm.googleapis.com/push", "https://fcm.googleapis.com:8443/push",
    "https://user:password@fcm.googleapis.com/push", "https://fcm.googleapis.com/push#fragment",
    "https://fcm.googleapis.com.evil.example/push", "https://evilpush.apple.com/push",
    "https://web.push.apple.com.evil.example/push", "https://fcm.googleapis.com@127.0.0.1/push",
  ]) {
    let called = false;
    await assert.rejects(
      sendValidatedPush({ endpoint }, {}, async () => { called = true; }),
      UntrustedPushEndpointError,
    );
    assert.equal(called, false);
  }
});
