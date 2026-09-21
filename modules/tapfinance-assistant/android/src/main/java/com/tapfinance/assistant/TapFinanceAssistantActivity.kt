package com.tapfinance.assistant

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle

class TapFinanceAssistantActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val launchIntent = Intent(Intent.ACTION_VIEW, Uri.parse("tapfinance://quick-entry?assistant=1"))
      .setClassName(packageName, "$packageName.MainActivity")
      .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)

    startActivity(launchIntent)
    finish()
  }
}
