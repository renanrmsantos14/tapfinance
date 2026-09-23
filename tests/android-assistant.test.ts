import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = join(import.meta.dirname, "..");

test("Android Assistant metadata includes every ROLE_ASSISTANT requirement", () => {
  const metadata = readFileSync(join(root, "modules/tapfinance-assistant/android/src/main/res/xml/voice_interaction_service.xml"), "utf8");
  const manifest = readFileSync(join(root, "modules/tapfinance-assistant/android/src/main/AndroidManifest.xml"), "utf8");

  assert.match(metadata, /android:sessionService="com\.tapfinance\.assistant\.TapFinanceVoiceInteractionSessionService"/);
  assert.match(metadata, /android:recognitionService="com\.tapfinance\.assistant\.TapFinanceRecognitionService"/);
  assert.match(metadata, /android:supportsAssist="true"/);
  assert.match(manifest, /android:name="com\.tapfinance\.assistant\.TapFinanceRecognitionService"/);
  assert.match(manifest, /android:name="android\.speech\.RecognitionService"/);
  assert.match(manifest, /android:name="android\.speech"/);
  assert.match(manifest, /android:resource="@xml\/recognition_service"/);
});

test("Android manifest also exposes the compatibility ACTION_ASSIST entry point", () => {
  const manifest = readFileSync(join(root, "modules/tapfinance-assistant/android/src/main/AndroidManifest.xml"), "utf8");
  assert.match(manifest, /android:name="android\.intent\.action\.ASSIST"/);
  assert.match(manifest, /android:name="android\.intent\.category\.DEFAULT"/);
  assert.match(manifest, /android:name="com\.tapfinance\.assistant\.TapFinanceAssistantActivity"/);
});

test("assistant cold start opens the main activity through the voice session", () => {
  const session = readFileSync(join(root, "modules/tapfinance-assistant/android/src/main/java/com/tapfinance/assistant/TapFinanceVoiceInteractionSession.kt"), "utf8");

  assert.match(session, /setClassName\(context\.packageName, "\$\{context\.packageName\}\.MainActivity"\)/);
  assert.match(session, /startVoiceActivity\(intent\)/);
  assert.match(session, /onTaskStarted/);
});
