package expo.modules.hydromatevoice

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

internal data class VoicePreferencesConfiguration(
  @Field val enabled: Boolean = false,
  @Field val language: String = "en",
  @Field val selectedVoiceIdentifier: String? = null,
  @Field val waterSpeechTemplate: String = "",
  @Field val medicineSpeechTemplate: String = "",
  @Field val lockedMedicineSpeechTemplate: String = "",
  @Field val birthdaySpeechTemplate: String = "",
  @Field val lockedBirthdaySpeechTemplate: String = "",
  @Field val anniversarySpeechTemplate: String = "",
  @Field val lockedAnniversarySpeechTemplate: String = "",
  @Field val customSpeechTemplate: String = "",
  @Field val lockedCustomSpeechTemplate: String = "",
  @Field val localeCandidates: List<String> = emptyList()
) : Record

class HydroMateVoiceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HydroMateVoice")

    AsyncFunction("scheduleVoiceTest") { secondsFromNow: Int ->
      val context = appContext.reactContext?.applicationContext
        ?: throw IllegalStateException("Android application context is unavailable")

      VoiceAlarmScheduler.scheduleTest(context, secondsFromNow).toDouble()
    }

    AsyncFunction("scheduleWaterVoiceAlarm") {
      identifier: String,
      expectedAtMillis: Double,
      amountMl: Double,
      repeatsDaily: Boolean ->
      val context = applicationContext()
      VoiceAlarmScheduler.scheduleWater(
        context,
        identifier,
        expectedAtMillis.toLong(),
        amountMl,
        repeatsDaily
      ).toDouble()
    }

    AsyncFunction("cancelWaterVoiceAlarm") { identifier: String ->
      VoiceAlarmScheduler.cancelWater(applicationContext(), identifier)
    }

    AsyncFunction("cancelAllWaterVoiceAlarms") {
      VoiceAlarmScheduler.cancelAllWater(applicationContext())
    }

    AsyncFunction("scheduleMedicineVoiceAlarm") {
      identifier: String,
      expectedAtMillis: Double,
      medicineName: String,
      repeatsDaily: Boolean ->
      VoiceAlarmScheduler.scheduleMedicine(
        applicationContext(),
        identifier,
        expectedAtMillis.toLong(),
        medicineName,
        repeatsDaily
      ).toDouble()
    }

    AsyncFunction("cancelMedicineVoiceAlarm") { identifier: String ->
      VoiceAlarmScheduler.cancelMedicine(applicationContext(), identifier)
    }

    AsyncFunction("cancelAllMedicineVoiceAlarms") {
      VoiceAlarmScheduler.cancelAllMedicine(applicationContext())
    }

    AsyncFunction("scheduleDatedVoiceAlarm") {
      identifier: String,
      expectedAtMillis: Double,
      reminderType: String,
      reminderText: String,
      repeatsYearly: Boolean ->
      VoiceAlarmScheduler.scheduleDated(
        applicationContext(),
        identifier,
        expectedAtMillis.toLong(),
        reminderType,
        reminderText,
        repeatsYearly
      ).toDouble()
    }

    AsyncFunction("cancelDatedVoiceAlarm") {
      identifier: String,
      reminderType: String ->
      VoiceAlarmScheduler.cancelDated(
        applicationContext(),
        identifier,
        reminderType
      )
    }

    AsyncFunction("cancelAllDatedVoiceAlarms") { reminderType: String ->
      VoiceAlarmScheduler.cancelAllDated(applicationContext(), reminderType)
    }

    AsyncFunction("syncVoicePreferences") {
      configuration: VoicePreferencesConfiguration ->
      NativeVoicePreferences.sync(
        applicationContext(),
        configuration.enabled,
        configuration.language,
        configuration.selectedVoiceIdentifier,
        configuration.waterSpeechTemplate,
        configuration.medicineSpeechTemplate,
        configuration.lockedMedicineSpeechTemplate,
        configuration.birthdaySpeechTemplate,
        configuration.lockedBirthdaySpeechTemplate,
        configuration.anniversarySpeechTemplate,
        configuration.lockedAnniversarySpeechTemplate,
        configuration.customSpeechTemplate,
        configuration.lockedCustomSpeechTemplate,
        configuration.localeCandidates
      )
    }

    AsyncFunction("setVoiceRemindersEnabled") { enabled: Boolean ->
      NativeVoicePreferences.setEnabled(applicationContext(), enabled)
    }

    AsyncFunction("setSelectedVoiceIdentifier") {
      language: String,
      identifier: String? ->
      NativeVoicePreferences.setSelectedVoice(
        applicationContext(),
        language,
        identifier
      )
    }
  }

  private fun applicationContext() =
    appContext.reactContext?.applicationContext
      ?: throw IllegalStateException("Android application context is unavailable")
}
