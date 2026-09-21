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
