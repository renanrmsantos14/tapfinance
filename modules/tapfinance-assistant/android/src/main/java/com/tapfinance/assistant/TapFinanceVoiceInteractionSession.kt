package com.tapfinance.assistant

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.service.voice.VoiceInteractionSession

class TapFinanceVoiceInteractionSession(context: android.content.Context) : VoiceInteractionSession(context) {
  override fun onPrepareShow(args: Bundle?, showFlags: Int) {
    super.onPrepareShow(args, showFlags)
    setUiEnabled(false)
  }

  override fun onShow(args: Bundle?, showFlags: Int) {
    super.onShow(args, showFlags)
    AssistantDiagnostics.record(context, "voice session shown")
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tapfinance://quick-entry?assistant=1"))
      .setClassName(context.packageName, "com.tapfinance.assistant.TapFinanceAssistantActivity")
      .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    try {
      startAssistantActivity(intent)
      AssistantDiagnostics.record(context, "assistant activity requested")
    } catch (error: RuntimeException) {
      AssistantDiagnostics.record(context, "assistant activity launch failed", error)
    }
  }
}
