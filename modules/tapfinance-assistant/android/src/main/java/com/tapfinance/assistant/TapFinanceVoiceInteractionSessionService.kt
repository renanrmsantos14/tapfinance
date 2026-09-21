package com.tapfinance.assistant

import android.os.Bundle
import android.service.voice.VoiceInteractionSession
import android.service.voice.VoiceInteractionSessionService

class TapFinanceVoiceInteractionSessionService : VoiceInteractionSessionService() {
  override fun onNewSession(args: Bundle): VoiceInteractionSession = TapFinanceVoiceInteractionSession(this)
}
