package com.tapfinance.assistant

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

class TapFinanceAssistantActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    AssistantDiagnostics.record(this, "assistant bridge opened")

    val launchIntent = Intent(Intent.ACTION_VIEW, Uri.parse("tapfinance://quick-entry?assistant=1"))
      .setClassName(packageName, "$packageName.MainActivity")
      .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)

    try {
      startActivity(launchIntent)
      AssistantDiagnostics.record(this, "main activity requested")
    } catch (error: RuntimeException) {
      AssistantDiagnostics.record(this, "main activity launch failed", error)
    }
    finish()
  }
}
