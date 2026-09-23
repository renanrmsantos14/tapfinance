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
      .setClassName(context.packageName, "${context.packageName}.MainActivity")
      .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    try {
      startVoiceActivity(intent)
      AssistantDiagnostics.record(context, "main voice activity requested")
    } catch (error: RuntimeException) {
      AssistantDiagnostics.record(context, "voice activity launch failed", error)
      try {
        context.startActivity(Intent(intent).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        AssistantDiagnostics.record(context, "normal activity requested")
      } catch (fallbackError: RuntimeException) {
        AssistantDiagnostics.record(context, "normal activity launch failed", fallbackError)
      }
    }
  }

  override fun onTaskStarted(intent: Intent?, taskId: Int) {
    super.onTaskStarted(intent, taskId)
    AssistantDiagnostics.record(context, "voice task started: $taskId")
  }
}
