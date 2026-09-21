package com.tapfinance.assistant

import android.content.Intent
import android.speech.RecognitionService
import android.speech.SpeechRecognizer

/**
 * A capability stub required by Android's Assistant role qualification.
 * TapFinance does not implement voice recognition or access the microphone.
 */
class TapFinanceRecognitionService : RecognitionService() {
  override fun onStartListening(recognizerIntent: Intent, listener: Callback) {
    listener.error(SpeechRecognizer.ERROR_CLIENT)
  }

  override fun onStopListening(listener: Callback) = Unit

  override fun onCancel(listener: Callback) = Unit
}
