const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withAssistant(config) {
  return withAndroidManifest(config, (modConfig) => {
    const app = modConfig.modResults.manifest.application?.[0];
    if (!app) return modConfig;
    const services = app.service ?? [];
    const hasVoiceService = services.some((service) => service.$?.["android:name"] === "com.tapfinance.assistant.TapFinanceVoiceInteractionService");
    if (!hasVoiceService) {
      services.push({
        $: {
          "android:name": "com.tapfinance.assistant.TapFinanceVoiceInteractionService",
          "android:exported": "true",
          "android:permission": "android.permission.BIND_VOICE_INTERACTION",
        },
        "intent-filter": [{ action: [{ $: { "android:name": "android.service.voice.VoiceInteractionService" } }] }],
        "meta-data": [{ $: { "android:name": "android.voice_interaction", "android:resource": "@xml/voice_interaction_service" } }],
      });
    }
    app.service = services;
    return modConfig;
  });
};
