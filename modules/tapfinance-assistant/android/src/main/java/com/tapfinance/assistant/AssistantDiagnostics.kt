package com.tapfinance.assistant

import android.content.Context
import android.os.Build
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

internal object AssistantDiagnostics {
  private const val TAG = "TapFinanceAssist"
  private const val PREFS = "assistant_diagnostics"
  private const val EVENTS = "events"

  @Synchronized
  fun startTest(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(EVENTS, "").commit()
    record(context, "manual test started")
  }

  @Synchronized
  fun record(context: Context, event: String, error: Throwable? = null) {
    if (error == null) Log.i(TAG, event) else Log.e(TAG, event, error)
    val timestamp = SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS 'UTC'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date())
    val entry = "$timestamp | $event" + (error?.let { " | ${it.javaClass.simpleName}" } ?: "")
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val entries = prefs.getString(EVENTS, "").orEmpty().lines().filter { it.isNotBlank() }
    prefs.edit().putString(EVENTS, (entries + entry).takeLast(30).joinToString("\n")).commit()
  }

  fun events(context: Context): String =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(EVENTS, "").orEmpty()

  fun device(): String = "${Build.MANUFACTURER} ${Build.MODEL} | Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
}
