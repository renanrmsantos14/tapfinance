package com.tapfinance.assistant

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import java.text.NumberFormat
import java.util.Locale

internal object BankNotificationAccess {
  fun canRead(context: Context): Boolean = NotificationManagerCompat.getEnabledListenerPackages(context)
    .contains(context.packageName)

  fun canAlert(context: Context): Boolean {
    val manager = context.getSystemService(NotificationManager::class.java)
    val channelEnabled = Build.VERSION.SDK_INT < 26 || manager.getNotificationChannel(BankNotificationListener.CHANNEL)?.importance != NotificationManager.IMPORTANCE_NONE
    return channelEnabled && NotificationManagerCompat.from(context).areNotificationsEnabled() &&
      (Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)
  }
}

class BankNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (!BankNotificationParser.isSupportedBank(sbn.packageName) || sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    if (!BankNotificationAccess.canAlert(this)) return
    val extras = sbn.notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val body = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
    val parsed = BankNotificationParser.parse(sbn.packageName, title, body, sbn.postTime) ?: return
    val id = BankSuggestionStore.add(this, "${sbn.packageName}|${sbn.key}|${sbn.postTime}", parsed) ?: return

    try {
      val manager = getSystemService(NotificationManager::class.java)
      if (Build.VERSION.SDK_INT >= 26) {
        manager.createNotificationChannel(NotificationChannel(CHANNEL, "Lançamentos sugeridos", NotificationManager.IMPORTANCE_DEFAULT))
      }
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tapfinance://quick-entry?bankSuggestion=$id")).apply {
        setClassName(packageName, "$packageName.MainActivity")
        addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
      }
      val pendingIntent = PendingIntent.getActivity(this, id.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val amount = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("pt-BR")).format(parsed.amountCents / 100.0)
      val direction = if (parsed.type == "income") "Receita" else "Despesa"
      val notification = NotificationCompat.Builder(this, CHANNEL)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle("$direction sugerida: $amount")
        .setContentText("${parsed.description} · Confira antes de salvar.")
        .setContentIntent(pendingIntent)
        .setAutoCancel(true)
        .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
        .build()
      manager.notify(id.hashCode(), notification)
    } catch (_: SecurityException) {
      BankSuggestionStore.discard(this, id)
    }
  }

  companion object { const val CHANNEL = "bank_suggestions" }
}
