package expo.modules.hydromatevoice

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

class VoiceAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val serviceIntent = when {
      intent.action == VoiceAlarmScheduler.ACTION_TEST_VOICE ->
        Intent(context, VoicePlaybackService::class.java).apply {
          action = VoicePlaybackService.ACTION_PLAY_TEST
        }

      intent.action?.startsWith(VoiceAlarmScheduler.ACTION_WATER_VOICE_PREFIX) == true -> {
        val identifier = intent.getStringExtra(
          VoiceAlarmScheduler.EXTRA_REMINDER_IDENTIFIER
        ) ?: return
        val expectedAtMillis = intent.getLongExtra(
          VoiceAlarmScheduler.EXTRA_EXPECTED_AT,
          0L
        )
        val reminderType = intent.getStringExtra(
          VoiceAlarmScheduler.EXTRA_REMINDER_TYPE
        )
        val amountMl = intent.getDoubleExtra(
          VoiceAlarmScheduler.EXTRA_AMOUNT_ML,
          0.0
        )

        if (reminderType != VoiceAlarmScheduler.REMINDER_TYPE_WATER) {
          return
        }

        if (BuildConfig.DEBUG) {
          Log.d(
            "HydroMateReminderSchedule",
            "stage=trigger receiverInvoked=true type=water id=$identifier expectedAt=$expectedAtMillis"
          )
        }
        val currentOccurrence = VoiceAlarmScheduler.isCurrentOccurrence(
            context,
            identifier,
            expectedAtMillis,
            amountMl
          )
        if (BuildConfig.DEBUG) {
          Log.d(
            "HydroMateReminderSchedule",
            "stage=trigger type=water id=$identifier stale=${!currentOccurrence}"
          )
        }
        if (!currentOccurrence) {
          return
        }

        val voiceEnabled = NativeVoicePreferences.read(context).enabled
        if (BuildConfig.DEBUG) {
          Log.d(
            "HydroMateReminderSchedule",
            "stage=trigger type=water id=$identifier voiceEnabled=$voiceEnabled"
          )
        }
        if (!voiceEnabled) {
          VoiceAlarmScheduler.cancelWater(context, identifier)
          return
        }

        if (VoiceAlarmScheduler.repeats(context, identifier)) {
          try {
            VoiceAlarmScheduler.scheduleNextWaterOccurrence(
              context,
              identifier,
              expectedAtMillis,
              amountMl
            )
          } catch (error: Exception) {
            Log.e("HydroMateVoice", "Unable to schedule next Water voice occurrence", error)
          }
        } else {
          VoiceAlarmScheduler.cancelWater(context, identifier)
        }

        Intent(context, VoicePlaybackService::class.java).apply {
          action = VoicePlaybackService.ACTION_PLAY_WATER
          putExtra(VoiceAlarmScheduler.EXTRA_REMINDER_IDENTIFIER, identifier)
          putExtra(VoiceAlarmScheduler.EXTRA_EXPECTED_AT, expectedAtMillis)
          putExtra(
            VoiceAlarmScheduler.EXTRA_REMINDER_TYPE,
            VoiceAlarmScheduler.REMINDER_TYPE_WATER
          )
          putExtra(VoiceAlarmScheduler.EXTRA_AMOUNT_ML, amountMl)
          if (BuildConfig.DEBUG) {
            Log.d(
              "HydroMateReminderSchedule",
              "stage=trigger type=water id=$identifier playbackDispatched=true"
            )
          }
        }
      }

      intent.action?.startsWith(VoiceAlarmScheduler.ACTION_MEDICINE_VOICE_PREFIX) == true -> {
        val identifier = intent.getStringExtra(
          VoiceAlarmScheduler.EXTRA_REMINDER_IDENTIFIER
        ) ?: return
        val expectedAtMillis = intent.getLongExtra(
          VoiceAlarmScheduler.EXTRA_EXPECTED_AT,
          0L
        )
        val reminderType = intent.getStringExtra(
          VoiceAlarmScheduler.EXTRA_REMINDER_TYPE
        )
        val medicineName = intent.getStringExtra(
          VoiceAlarmScheduler.EXTRA_MEDICINE_NAME
        ) ?: return

        if (reminderType != VoiceAlarmScheduler.REMINDER_TYPE_MEDICINE) {
          return
        }

        if (!VoiceAlarmScheduler.isCurrentMedicineOccurrence(
            context,
            identifier,
            expectedAtMillis,
            medicineName
          )
        ) {
          return
        }

        if (!NativeVoicePreferences.read(context).enabled) {
          VoiceAlarmScheduler.cancelMedicine(context, identifier)
          return
        }

        if (VoiceAlarmScheduler.repeats(context, identifier)) {
          try {
            VoiceAlarmScheduler.scheduleNextMedicineOccurrence(
              context,
              identifier,
              expectedAtMillis,
              medicineName
            )
          } catch (error: Exception) {
            Log.e(
              "HydroMateVoice",
              "Unable to schedule next Medicine voice occurrence",
              error
            )
          }
        } else {
          VoiceAlarmScheduler.cancelMedicine(context, identifier)
        }

        Intent(context, VoicePlaybackService::class.java).apply {
          action = VoicePlaybackService.ACTION_PLAY_MEDICINE
          putExtra(VoiceAlarmScheduler.EXTRA_REMINDER_IDENTIFIER, identifier)
          putExtra(VoiceAlarmScheduler.EXTRA_EXPECTED_AT, expectedAtMillis)
          putExtra(
            VoiceAlarmScheduler.EXTRA_REMINDER_TYPE,
            VoiceAlarmScheduler.REMINDER_TYPE_MEDICINE
          )
          putExtra(VoiceAlarmScheduler.EXTRA_MEDICINE_NAME, medicineName)
        }
      }

      intent.action?.startsWith(VoiceAlarmScheduler.ACTION_DATED_VOICE_PREFIX) == true -> {
        val identifier = intent.getStringExtra(
          VoiceAlarmScheduler.EXTRA_REMINDER_IDENTIFIER
        ) ?: return
        val expectedAtMillis = intent.getLongExtra(
          VoiceAlarmScheduler.EXTRA_EXPECTED_AT,
          0L
        )
        val reminderType = intent.getStringExtra(
          VoiceAlarmScheduler.EXTRA_REMINDER_TYPE
        ) ?: return
        val reminderText = intent.getStringExtra(
          VoiceAlarmScheduler.EXTRA_REMINDER_TEXT
        ) ?: return

        if (!VoiceAlarmScheduler.isCurrentDatedOccurrence(
            context,
            identifier,
            expectedAtMillis,
            reminderType,
            reminderText
          )
        ) {
          return
        }

        if (!NativeVoicePreferences.read(context).enabled) {
          VoiceAlarmScheduler.cancelDated(context, identifier, reminderType)
          return
        }

        if (VoiceAlarmScheduler.repeats(context, identifier)) {
          try {
            VoiceAlarmScheduler.scheduleNextDatedOccurrence(
              context,
              identifier,
              expectedAtMillis,
              reminderType,
              reminderText
            )
          } catch (error: Exception) {
            Log.e(
              "HydroMateVoice",
              "Unable to schedule next $reminderType voice occurrence",
              error
            )
          }
        } else {
          VoiceAlarmScheduler.cancelDated(context, identifier, reminderType)
        }

        Intent(context, VoicePlaybackService::class.java).apply {
          action = VoicePlaybackService.ACTION_PLAY_DATED
          putExtra(VoiceAlarmScheduler.EXTRA_REMINDER_IDENTIFIER, identifier)
          putExtra(VoiceAlarmScheduler.EXTRA_EXPECTED_AT, expectedAtMillis)
          putExtra(VoiceAlarmScheduler.EXTRA_REMINDER_TYPE, reminderType)
          putExtra(VoiceAlarmScheduler.EXTRA_REMINDER_TEXT, reminderText)
        }
      }

      else -> return
    }

    try {
      ContextCompat.startForegroundService(context, serviceIntent)
    } catch (error: RuntimeException) {
      Log.e("HydroMateVoice", "Unable to start voice playback service", error)
    }
  }
}
