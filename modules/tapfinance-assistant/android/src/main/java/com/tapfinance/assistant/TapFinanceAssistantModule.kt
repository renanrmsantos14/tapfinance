package com.tapfinance.assistant

import android.app.Activity
import android.app.role.RoleManager
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class TapFinanceAssistantModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TapFinanceAssistant")

    Function("isAssistantRoleAvailable") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return@Function false
      val roleManager = appContext.reactContext?.getSystemService(RoleManager::class.java)
      roleManager?.isRoleAvailable(RoleManager.ROLE_ASSISTANT) == true
    }

    Function("isAssistantRoleHeld") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return@Function false
      val roleManager = appContext.reactContext?.getSystemService(RoleManager::class.java)
      roleManager?.isRoleHeld(RoleManager.ROLE_ASSISTANT) == true
    }

    Function("startDiagnosticTest") {
      val context = appContext.reactContext ?: return@Function false
      AssistantDiagnostics.startTest(context)
      true
    }

    Function("recordQuickEntryOpened") {
      appContext.reactContext?.let { AssistantDiagnostics.record(it, "quick-entry route opened") }
    }

    Function("getDiagnosticReport") {
      val context = appContext.reactContext ?: return@Function "TapFinance: módulo nativo indisponível"
      val roleManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) context.getSystemService(RoleManager::class.java) else null
      val roleAvailable = roleManager?.isRoleAvailable(RoleManager.ROLE_ASSISTANT) == true
      val roleHeld = roleManager?.isRoleHeld(RoleManager.ROLE_ASSISTANT) == true
      val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
      "TapFinance ${packageInfo.versionName} | build ${if (Build.VERSION.SDK_INT >= 28) packageInfo.longVersionCode else packageInfo.versionCode.toLong()}\n" +
        "${AssistantDiagnostics.device()}\n" +
        "Pacote: ${context.packageName}\n" +
        "Papel de assistente disponível: $roleAvailable\n" +
        "Papel de assistente ativo: $roleHeld\n" +
        "Eventos (UTC):\n${AssistantDiagnostics.events(context).ifBlank { "Nenhum evento registrado" }}"
    }

    AsyncFunction("installUpdate") { downloadUrl: String, expectedDigest: String ->
      val context = requireNotNull(appContext.reactContext)
      require(downloadUrl.startsWith("https://github.com/renanrmsantos14/tapfinance/releases/download/")) { "Origem de atualização inválida" }
      require(Regex("sha256:[0-9a-fA-F]{64}").matches(expectedDigest)) { "Checksum da release ausente" }
      val updates = File(context.cacheDir, "updates").apply { mkdirs() }
      val apk = File(updates, "tapfinance-update.apk")
      val digest = MessageDigest.getInstance("SHA-256")
      try {
        val connection = URL(downloadUrl).openConnection() as HttpURLConnection
        connection.connectTimeout = 15_000
        connection.readTimeout = 30_000
        connection.setRequestProperty("User-Agent", "TapFinance-Android-Updater")
        try {
          check(connection.responseCode == HttpURLConnection.HTTP_OK) { "Download HTTP ${connection.responseCode}" }
          check(connection.contentLengthLong in 1..200_000_000) { "Tamanho do APK inválido" }
          connection.inputStream.use { input ->
            apk.outputStream().use { output ->
              val buffer = ByteArray(8192)
              var total = 0L
              while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                total += count
                check(total <= 200_000_000) { "APK excede o tamanho permitido" }
                digest.update(buffer, 0, count)
                output.write(buffer, 0, count)
              }
              check(total == connection.contentLengthLong) { "Download incompleto" }
            }
          }
        } finally {
          connection.disconnect()
        }
        val actual = digest.digest().joinToString("") { "%02x".format(it) }
        check(actual.equals(expectedDigest.removePrefix("sha256:"), ignoreCase = true)) { "Checksum do APK divergente" }
        val activity = requireNotNull(appContext.currentActivity) { "Abra o app para instalar a atualização" }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.updates", apk)
        val intent = Intent(Intent.ACTION_INSTALL_PACKAGE).apply {
          data = uri
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        activity.runOnUiThread { activity.startActivity(intent) }
        true
      } catch (error: Exception) {
        apk.delete()
        throw error
      }
    }

    AsyncFunction("requestAssistantRole") { promise: Promise ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        promise.resolve(false)
        return@AsyncFunction
      }
      val activity = appContext.currentActivity
      val roleManager = appContext.reactContext?.getSystemService(RoleManager::class.java)
      if (activity == null || roleManager == null || !roleManager.isRoleAvailable(RoleManager.ROLE_ASSISTANT)) {
        promise.resolve(false)
        return@AsyncFunction
      }
      activity.startActivityForResult(roleManager.createRequestRoleIntent(RoleManager.ROLE_ASSISTANT), REQUEST_CODE)
      promise.resolve(true)
    }

    AsyncFunction("openAssistantSettings") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(false)
        return@AsyncFunction
      }
      val intent = Intent(Settings.ACTION_VOICE_INPUT_SETTINGS)
      activity.startActivity(intent)
      promise.resolve(true)
    }
  }

  private companion object { const val REQUEST_CODE = 4107 }
}
