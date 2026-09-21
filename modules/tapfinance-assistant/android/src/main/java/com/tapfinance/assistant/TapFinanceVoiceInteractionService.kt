package com.tapfinance.assistant

import android.os.Bundle
import android.service.voice.VoiceInteractionService
import android.service.voice.VoiceInteractionSession

class TapFinanceVoiceInteractionService : VoiceInteractionService() {
  override fun onReady() {
    super.onReady()
    setDisabledShowContext(VoiceInteractionSession.SHOW_WITH_ASSIST or VoiceInteractionSession.SHOW_WITH_SCREENSHOT)
  }
}
