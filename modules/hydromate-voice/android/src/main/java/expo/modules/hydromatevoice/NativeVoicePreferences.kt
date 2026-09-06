package expo.modules.hydromatevoice

import android.content.Context
import org.json.JSONArray

internal data class NativeVoiceSettings(
  val enabled: Boolean,
  val language: String,
  val selectedVoiceIdentifier: String?,
  val waterSpeechTemplate: String,
  val medicineSpeechTemplate: String,
  val lockedMedicineSpeechTemplate: String,
  val birthdaySpeechTemplate: String,
  val lockedBirthdaySpeechTemplate: String,
  val anniversarySpeechTemplate: String,
  val lockedAnniversarySpeechTemplate: String,
  val customSpeechTemplate: String,
  val lockedCustomSpeechTemplate: String,
  val localeCandidates: List<String>
)

internal object NativeVoicePreferences {
  private const val PREFERENCES_NAME = "hydromate_native_voice_preferences"
  private const val KEY_ENABLED = "voice_reminders_enabled"
  private const val KEY_LANGUAGE = "app_language"
  private const val KEY_SELECTED_VOICE = "selected_voice_identifier"
  private const val KEY_WATER_SPEECH_TEMPLATE = "water_speech_template"
  private const val KEY_MEDICINE_SPEECH_TEMPLATE = "medicine_speech_template"
  private const val KEY_LOCKED_MEDICINE_SPEECH_TEMPLATE =
    "locked_medicine_speech_template"
  private const val KEY_BIRTHDAY_SPEECH_TEMPLATE = "birthday_speech_template"
  private const val KEY_LOCKED_BIRTHDAY_SPEECH_TEMPLATE =
    "locked_birthday_speech_template"
  private const val KEY_ANNIVERSARY_SPEECH_TEMPLATE =
    "anniversary_speech_template"
  private const val KEY_LOCKED_ANNIVERSARY_SPEECH_TEMPLATE =
    "locked_anniversary_speech_template"
  private const val KEY_CUSTOM_SPEECH_TEMPLATE = "custom_speech_template"
  private const val KEY_LOCKED_CUSTOM_SPEECH_TEMPLATE =
    "locked_custom_speech_template"
  private const val KEY_LOCALE_CANDIDATES = "tts_locale_candidates"

  fun sync(
    context: Context,
    enabled: Boolean,
    language: String,
    selectedVoiceIdentifier: String?,
    waterSpeechTemplate: String,
    medicineSpeechTemplate: String,
    lockedMedicineSpeechTemplate: String,
    birthdaySpeechTemplate: String,
    lockedBirthdaySpeechTemplate: String,
    anniversarySpeechTemplate: String,
    lockedAnniversarySpeechTemplate: String,
    customSpeechTemplate: String,
    lockedCustomSpeechTemplate: String,
    localeCandidates: List<String>
  ) {
    val editor = preferences(context).edit()
      .putBoolean(KEY_ENABLED, enabled)
      .putString(KEY_LANGUAGE, language)
      .putString(KEY_WATER_SPEECH_TEMPLATE, waterSpeechTemplate)
      .putString(KEY_MEDICINE_SPEECH_TEMPLATE, medicineSpeechTemplate)
      .putString(
        KEY_LOCKED_MEDICINE_SPEECH_TEMPLATE,
        lockedMedicineSpeechTemplate
      )
      .putString(KEY_BIRTHDAY_SPEECH_TEMPLATE, birthdaySpeechTemplate)
      .putString(
        KEY_LOCKED_BIRTHDAY_SPEECH_TEMPLATE,
        lockedBirthdaySpeechTemplate
      )
      .putString(KEY_ANNIVERSARY_SPEECH_TEMPLATE, anniversarySpeechTemplate)
      .putString(
        KEY_LOCKED_ANNIVERSARY_SPEECH_TEMPLATE,
        lockedAnniversarySpeechTemplate
      )
      .putString(KEY_CUSTOM_SPEECH_TEMPLATE, customSpeechTemplate)
      .putString(
        KEY_LOCKED_CUSTOM_SPEECH_TEMPLATE,
        lockedCustomSpeechTemplate
      )
      .putString(KEY_LOCALE_CANDIDATES, JSONArray(localeCandidates).toString())

    if (selectedVoiceIdentifier.isNullOrBlank()) {
      editor.remove(KEY_SELECTED_VOICE)
    } else {
      editor.putString(KEY_SELECTED_VOICE, selectedVoiceIdentifier)
    }

    editor.apply()
  }

  fun setEnabled(context: Context, enabled: Boolean) {
    preferences(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
  }

  fun setSelectedVoice(
    context: Context,
    language: String,
    identifier: String?
  ) {
    val editor = preferences(context).edit().putString(KEY_LANGUAGE, language)
    if (identifier.isNullOrBlank()) {
      editor.remove(KEY_SELECTED_VOICE)
    } else {
      editor.putString(KEY_SELECTED_VOICE, identifier)
    }
    editor.apply()
  }

  fun read(context: Context): NativeVoiceSettings {
    val preferences = preferences(context)
    val localeCandidates = try {
      val json = JSONArray(preferences.getString(KEY_LOCALE_CANDIDATES, "[]"))
      buildList {
        for (index in 0 until json.length()) {
          json.optString(index).takeIf(String::isNotBlank)?.let(::add)
        }
      }
    } catch (_: Exception) {
      emptyList()
    }

    return NativeVoiceSettings(
      enabled = preferences.getBoolean(KEY_ENABLED, false),
      language = preferences.getString(KEY_LANGUAGE, "en") ?: "en",
      selectedVoiceIdentifier = preferences.getString(KEY_SELECTED_VOICE, null),
      waterSpeechTemplate =
        preferences.getString(KEY_WATER_SPEECH_TEMPLATE, "") ?: "",
      medicineSpeechTemplate =
        preferences.getString(KEY_MEDICINE_SPEECH_TEMPLATE, "") ?: "",
      lockedMedicineSpeechTemplate = preferences.getString(
        KEY_LOCKED_MEDICINE_SPEECH_TEMPLATE,
        ""
      ) ?: "",
      birthdaySpeechTemplate =
        preferences.getString(KEY_BIRTHDAY_SPEECH_TEMPLATE, "") ?: "",
      lockedBirthdaySpeechTemplate = preferences.getString(
        KEY_LOCKED_BIRTHDAY_SPEECH_TEMPLATE,
        ""
      ) ?: "",
      anniversarySpeechTemplate =
        preferences.getString(KEY_ANNIVERSARY_SPEECH_TEMPLATE, "") ?: "",
      lockedAnniversarySpeechTemplate = preferences.getString(
        KEY_LOCKED_ANNIVERSARY_SPEECH_TEMPLATE,
        ""
      ) ?: "",
      customSpeechTemplate =
        preferences.getString(KEY_CUSTOM_SPEECH_TEMPLATE, "") ?: "",
      lockedCustomSpeechTemplate = preferences.getString(
        KEY_LOCKED_CUSTOM_SPEECH_TEMPLATE,
        ""
      ) ?: "",
      localeCandidates = localeCandidates
    )
  }

  private fun preferences(context: Context) =
    context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
}
