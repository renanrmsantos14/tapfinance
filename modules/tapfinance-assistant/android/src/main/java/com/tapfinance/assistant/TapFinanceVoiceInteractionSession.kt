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
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tapfinance://quick-entry?assistant=1"))
      .setClassName(context.packageName, "${context.packageName}.MainActivity")
      .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    startAssistantActivity(intent)
    finish()
  }
}
