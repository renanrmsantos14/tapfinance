package com.tapfinance.assistant

import android.app.Activity
import android.app.role.RoleManager
import android.content.Intent
import android.os.Build
import android.provider.Settings
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
