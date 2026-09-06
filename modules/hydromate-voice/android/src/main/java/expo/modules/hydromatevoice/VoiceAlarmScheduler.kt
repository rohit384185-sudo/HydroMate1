package expo.modules.hydromatevoice

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

internal object VoiceAlarmScheduler {
  const val ACTION_TEST_VOICE = "expo.modules.hydromatevoice.action.TEST_VOICE"
  const val ACTION_WATER_VOICE_PREFIX =
    "expo.modules.hydromatevoice.action.WATER_VOICE."
  const val ACTION_MEDICINE_VOICE_PREFIX =
    "expo.modules.hydromatevoice.action.MEDICINE_VOICE."
  const val ACTION_DATED_VOICE_PREFIX =
    "expo.modules.hydromatevoice.action.DATED_VOICE."
  const val EXTRA_EXPECTED_AT = "expectedAt"
  const val EXTRA_REMINDER_IDENTIFIER = "reminderIdentifier"
  const val EXTRA_REMINDER_TYPE = "reminderType"
  const val EXTRA_AMOUNT_ML = "amountMl"
  const val EXTRA_MEDICINE_NAME = "medicineName"
  const val EXTRA_REMINDER_TEXT = "reminderText"
  const val EXTRA_REPEATS = "repeats"
  const val REMINDER_TYPE_WATER = "water"
  const val REMINDER_TYPE_MEDICINE = "medicine"
  const val REMINDER_TYPE_BIRTHDAY = "birthday"
  const val REMINDER_TYPE_ANNIVERSARY = "anniversary"
  const val REMINDER_TYPE_CUSTOM = "custom"
  private const val TEST_REQUEST_CODE = 94030
  private const val WATER_REQUEST_CODE = 0
  private const val STORE_NAME = "hydromate_native_water_voice_alarms"
  private const val KEY_IDENTIFIERS = "scheduled_identifiers"
  private const val KEY_MEDICINE_IDENTIFIERS = "scheduled_medicine_identifiers"
  private const val KEY_DATED_IDENTIFIERS_PREFIX = "scheduled_dated_identifiers:"
  private const val KEY_EXPECTED_PREFIX = "expected_at:"
  private const val KEY_AMOUNT_PREFIX = "amount_ml:"
  private const val KEY_MEDICINE_NAME_PREFIX = "medicine_name:"
  private const val KEY_REMINDER_TEXT_PREFIX = "reminder_text:"
  private const val KEY_REMINDER_TYPE_PREFIX = "reminder_type:"
  private const val KEY_REPEATS_PREFIX = "repeats:"
  private const val KEY_LAST_SPOKEN_PREFIX = "last_spoken_at:"

  fun scheduleTest(context: Context, secondsFromNow: Int): Long {
    val safeDelaySeconds = secondsFromNow.coerceIn(1, 3_600)
    val triggerAtMillis = System.currentTimeMillis() + safeDelaySeconds * 1_000L
    scheduleExact(
      context,
      triggerAtMillis,
      PendingIntent.getBroadcast(
        context,
        TEST_REQUEST_CODE,
        Intent(context, VoiceAlarmReceiver::class.java).apply {
          action = ACTION_TEST_VOICE
          putExtra(EXTRA_EXPECTED_AT, triggerAtMillis)
        },
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    )
    return triggerAtMillis
  }

  fun scheduleWater(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    amountMl: Double,
    repeatsDaily: Boolean = true
  ): Long {
    require(identifier.startsWith("hydromate-water-")) {
      "Only HydroMate Water identifiers can schedule native voice alarms"
    }
    require(expectedAtMillis > System.currentTimeMillis()) {
      "Water voice alarm time must be in the future"
    }
    require(amountMl.isFinite() && amountMl > 0) {
      "Water voice alarm amount must be greater than zero"
    }

    storeSchedule(context, identifier, expectedAtMillis, amountMl, repeatsDaily)
    try {
      scheduleExact(
        context,
        expectedAtMillis,
        waterPendingIntent(context, identifier, expectedAtMillis, amountMl, repeatsDaily)
          ?: throw IllegalStateException("Unable to create Water voice alarm")
      )
    } catch (error: Exception) {
      removeSchedule(context, identifier)
      throw error
    }
    return expectedAtMillis
  }

  fun scheduleNextWaterOccurrence(
    context: Context,
    identifier: String,
    previousExpectedAtMillis: Long,
    amountMl: Double
  ) {
    val nextExpectedAtMillis = Calendar.getInstance().run {
      timeInMillis = previousExpectedAtMillis
      do {
        add(Calendar.DAY_OF_YEAR, 1)
      } while (timeInMillis <= System.currentTimeMillis())
      timeInMillis
    }
    scheduleWater(context, identifier, nextExpectedAtMillis, amountMl, true)
  }

  fun scheduleMedicine(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    medicineName: String,
    repeatsDaily: Boolean = true
  ): Long {
    require(identifier.startsWith("hydromate-medicine-")) {
      "Only HydroMate Medicine identifiers can schedule native voice alarms"
    }
    require(expectedAtMillis > System.currentTimeMillis()) {
      "Medicine voice alarm time must be in the future"
    }
    require(medicineName.isNotEmpty()) {
      "Medicine voice alarm name must not be empty"
    }

    storeMedicineSchedule(
      context,
      identifier,
      expectedAtMillis,
      medicineName,
      repeatsDaily
    )
    try {
      scheduleExact(
        context,
        expectedAtMillis,
        medicinePendingIntent(
          context,
          identifier,
          expectedAtMillis,
          medicineName,
          repeatsDaily
        ) ?: throw IllegalStateException("Unable to create Medicine voice alarm")
      )
    } catch (error: Exception) {
      removeMedicineSchedule(context, identifier)
      throw error
    }
    return expectedAtMillis
  }

  fun scheduleNextMedicineOccurrence(
    context: Context,
    identifier: String,
    previousExpectedAtMillis: Long,
    medicineName: String
  ) {
    scheduleMedicine(
      context,
      identifier,
      nextDailyOccurrence(previousExpectedAtMillis),
      medicineName,
      true
    )
  }

  fun scheduleDated(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    reminderType: String,
    reminderText: String,
    repeatsYearly: Boolean = true
  ): Long {
    validateDatedReminderType(reminderType)
    require(identifier.startsWith("hydromate-$reminderType-")) {
      "The native voice identifier does not match its reminder type"
    }
    require(expectedAtMillis > System.currentTimeMillis()) {
      "Dated voice alarm time must be in the future"
    }
    require(reminderText.isNotEmpty()) {
      "Dated voice reminder text must not be empty"
    }

    storeDatedSchedule(
      context,
      identifier,
      expectedAtMillis,
      reminderType,
      reminderText,
      repeatsYearly
    )
    try {
      scheduleExact(
        context,
        expectedAtMillis,
        datedPendingIntent(
          context,
          identifier,
          expectedAtMillis,
          reminderType,
          reminderText,
          repeatsYearly
        ) ?: throw IllegalStateException("Unable to create dated voice alarm")
      )
    } catch (error: Exception) {
      removeDatedSchedule(context, identifier, reminderType)
      throw error
    }
    return expectedAtMillis
  }

  fun scheduleNextDatedOccurrence(
    context: Context,
    identifier: String,
    previousExpectedAtMillis: Long,
    reminderType: String,
    reminderText: String
  ) {
    scheduleDated(
      context,
      identifier,
      nextYearlyOccurrence(previousExpectedAtMillis),
      reminderType,
      reminderText,
      true
    )
  }

  fun cancelWater(context: Context, identifier: String) {
    val expectedAtMillis = expectedAt(context, identifier)
    val amountMl = amount(context, identifier)
    val pendingIntent = waterPendingIntent(
      context,
      identifier,
      expectedAtMillis ?: 0L,
      amountMl ?: 0.0,
      repeats(context, identifier),
      PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
    )
    if (pendingIntent != null) {
      alarmManager(context).cancel(pendingIntent)
      pendingIntent.cancel()
    }
    removeSchedule(context, identifier)
  }

  fun cancelAllWater(context: Context) {
    scheduledIdentifiers(context).forEach { identifier ->
      cancelWater(context, identifier)
    }
  }

  fun cancelMedicine(context: Context, identifier: String) {
    val pendingIntent = medicinePendingIntent(
      context,
      identifier,
      expectedAt(context, identifier) ?: 0L,
      medicineName(context, identifier).orEmpty(),
      repeats(context, identifier),
      PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
    )
    if (pendingIntent != null) {
      alarmManager(context).cancel(pendingIntent)
      pendingIntent.cancel()
    }
    removeMedicineSchedule(context, identifier)
  }

  fun cancelAllMedicine(context: Context) {
    scheduledMedicineIdentifiers(context).forEach { identifier ->
      cancelMedicine(context, identifier)
    }
  }

  fun cancelDated(context: Context, identifier: String, reminderType: String) {
    validateDatedReminderType(reminderType)
    val pendingIntent = datedPendingIntent(
      context,
      identifier,
      expectedAt(context, identifier) ?: 0L,
      reminderType,
      reminderText(context, identifier).orEmpty(),
      repeats(context, identifier),
      PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
    )
    if (pendingIntent != null) {
      alarmManager(context).cancel(pendingIntent)
      pendingIntent.cancel()
    }
    removeDatedSchedule(context, identifier, reminderType)
  }

  fun cancelAllDated(context: Context, reminderType: String) {
    validateDatedReminderType(reminderType)
    scheduledDatedIdentifiers(context, reminderType).forEach { identifier ->
      cancelDated(context, identifier, reminderType)
    }
  }

  fun isCurrentOccurrence(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    amountMl: Double
  ) = expectedAt(context, identifier) == expectedAtMillis &&
    amount(context, identifier) == amountMl

  fun isCurrentMedicineOccurrence(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    medicineName: String
  ) = expectedAt(context, identifier) == expectedAtMillis &&
    medicineName(context, identifier) == medicineName

  fun isCurrentDatedOccurrence(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    reminderType: String,
    expectedReminderText: String
  ) = expectedAt(context, identifier) == expectedAtMillis &&
    storedReminderType(context, identifier) == reminderType &&
    reminderText(context, identifier) == expectedReminderText

  fun repeats(context: Context, identifier: String) =
    store(context).getBoolean("$KEY_REPEATS_PREFIX$identifier", true)

  @Synchronized
  fun claimSpeechOccurrence(
    context: Context,
    identifier: String,
    expectedAtMillis: Long
  ): Boolean {
    val preferences = store(context)
    val key = "$KEY_LAST_SPOKEN_PREFIX$identifier"
    if (preferences.getLong(key, Long.MIN_VALUE) == expectedAtMillis) {
      return false
    }
    return preferences.edit().putLong(key, expectedAtMillis).commit()
  }

  private fun scheduleExact(
    context: Context,
    triggerAtMillis: Long,
    pendingIntent: PendingIntent
  ) {
    val alarmManager = alarmManager(context)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      !alarmManager.canScheduleExactAlarms()
    ) {
      throw IllegalStateException("Exact alarm access is required for native voice alarms")
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      alarmManager.setExactAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        triggerAtMillis,
        pendingIntent
      )
    } else {
      alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
    }
  }

  private fun waterPendingIntent(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    amountMl: Double,
    repeatsDaily: Boolean,
    flags: Int = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  ): PendingIntent? = PendingIntent.getBroadcast(
    context,
    WATER_REQUEST_CODE,
    Intent(context, VoiceAlarmReceiver::class.java).apply {
      action = "$ACTION_WATER_VOICE_PREFIX$identifier"
      putExtra(EXTRA_REMINDER_IDENTIFIER, identifier)
      putExtra(EXTRA_EXPECTED_AT, expectedAtMillis)
      putExtra(EXTRA_REMINDER_TYPE, REMINDER_TYPE_WATER)
      putExtra(EXTRA_AMOUNT_ML, amountMl)
      putExtra(EXTRA_REPEATS, repeatsDaily)
    },
    flags
  )

  private fun medicinePendingIntent(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    medicineName: String,
    repeatsDaily: Boolean,
    flags: Int = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  ): PendingIntent? = PendingIntent.getBroadcast(
    context,
    WATER_REQUEST_CODE,
    Intent(context, VoiceAlarmReceiver::class.java).apply {
      action = "$ACTION_MEDICINE_VOICE_PREFIX$identifier"
      putExtra(EXTRA_REMINDER_IDENTIFIER, identifier)
      putExtra(EXTRA_EXPECTED_AT, expectedAtMillis)
      putExtra(EXTRA_REMINDER_TYPE, REMINDER_TYPE_MEDICINE)
      putExtra(EXTRA_MEDICINE_NAME, medicineName)
      putExtra(EXTRA_REPEATS, repeatsDaily)
    },
    flags
  )

  private fun datedPendingIntent(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    reminderType: String,
    reminderText: String,
    repeatsYearly: Boolean,
    flags: Int = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  ): PendingIntent? = PendingIntent.getBroadcast(
    context,
    WATER_REQUEST_CODE,
    Intent(context, VoiceAlarmReceiver::class.java).apply {
      action = "$ACTION_DATED_VOICE_PREFIX$identifier"
      putExtra(EXTRA_REMINDER_IDENTIFIER, identifier)
      putExtra(EXTRA_EXPECTED_AT, expectedAtMillis)
      putExtra(EXTRA_REMINDER_TYPE, reminderType)
      putExtra(EXTRA_REMINDER_TEXT, reminderText)
      putExtra(EXTRA_REPEATS, repeatsYearly)
    },
    flags
  )

  @Synchronized
  private fun storeSchedule(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    amountMl: Double,
    repeatsDaily: Boolean
  ) {
    val preferences = store(context)
    val identifiers = preferences
      .getStringSet(KEY_IDENTIFIERS, emptySet())
      .orEmpty()
      .toMutableSet()
      .apply { add(identifier) }
    preferences.edit()
      .putStringSet(KEY_IDENTIFIERS, identifiers)
      .putLong("$KEY_EXPECTED_PREFIX$identifier", expectedAtMillis)
      .putString("$KEY_AMOUNT_PREFIX$identifier", amountMl.toString())
      .putBoolean("$KEY_REPEATS_PREFIX$identifier", repeatsDaily)
      .commit()
  }

  @Synchronized
  private fun removeSchedule(context: Context, identifier: String) {
    val preferences = store(context)
    val identifiers = preferences
      .getStringSet(KEY_IDENTIFIERS, emptySet())
      .orEmpty()
      .toMutableSet()
      .apply { remove(identifier) }
    preferences.edit()
      .putStringSet(KEY_IDENTIFIERS, identifiers)
      .remove("$KEY_EXPECTED_PREFIX$identifier")
      .remove("$KEY_AMOUNT_PREFIX$identifier")
      .remove("$KEY_REPEATS_PREFIX$identifier")
      .apply()
  }

  @Synchronized
  private fun storeMedicineSchedule(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    medicineName: String,
    repeatsDaily: Boolean
  ) {
    val preferences = store(context)
    val identifiers = preferences
      .getStringSet(KEY_MEDICINE_IDENTIFIERS, emptySet())
      .orEmpty()
      .toMutableSet()
      .apply { add(identifier) }
    preferences.edit()
      .putStringSet(KEY_MEDICINE_IDENTIFIERS, identifiers)
      .putLong("$KEY_EXPECTED_PREFIX$identifier", expectedAtMillis)
      .putString("$KEY_MEDICINE_NAME_PREFIX$identifier", medicineName)
      .putBoolean("$KEY_REPEATS_PREFIX$identifier", repeatsDaily)
      .commit()
  }

  @Synchronized
  private fun removeMedicineSchedule(context: Context, identifier: String) {
    val preferences = store(context)
    val identifiers = preferences
      .getStringSet(KEY_MEDICINE_IDENTIFIERS, emptySet())
      .orEmpty()
      .toMutableSet()
      .apply { remove(identifier) }
    preferences.edit()
      .putStringSet(KEY_MEDICINE_IDENTIFIERS, identifiers)
      .remove("$KEY_EXPECTED_PREFIX$identifier")
      .remove("$KEY_MEDICINE_NAME_PREFIX$identifier")
      .remove("$KEY_REPEATS_PREFIX$identifier")
      .apply()
  }

  @Synchronized
  private fun storeDatedSchedule(
    context: Context,
    identifier: String,
    expectedAtMillis: Long,
    reminderType: String,
    reminderText: String,
    repeatsYearly: Boolean
  ) {
    val preferences = store(context)
    val identifiers = preferences
      .getStringSet("$KEY_DATED_IDENTIFIERS_PREFIX$reminderType", emptySet())
      .orEmpty()
      .toMutableSet()
      .apply { add(identifier) }
    preferences.edit()
      .putStringSet("$KEY_DATED_IDENTIFIERS_PREFIX$reminderType", identifiers)
      .putLong("$KEY_EXPECTED_PREFIX$identifier", expectedAtMillis)
      .putString("$KEY_REMINDER_TYPE_PREFIX$identifier", reminderType)
      .putString("$KEY_REMINDER_TEXT_PREFIX$identifier", reminderText)
      .putBoolean("$KEY_REPEATS_PREFIX$identifier", repeatsYearly)
      .commit()
  }

  @Synchronized
  private fun removeDatedSchedule(
    context: Context,
    identifier: String,
    reminderType: String
  ) {
    val preferences = store(context)
    val identifiers = preferences
      .getStringSet("$KEY_DATED_IDENTIFIERS_PREFIX$reminderType", emptySet())
      .orEmpty()
      .toMutableSet()
      .apply { remove(identifier) }
    preferences.edit()
      .putStringSet("$KEY_DATED_IDENTIFIERS_PREFIX$reminderType", identifiers)
      .remove("$KEY_EXPECTED_PREFIX$identifier")
      .remove("$KEY_REMINDER_TYPE_PREFIX$identifier")
      .remove("$KEY_REMINDER_TEXT_PREFIX$identifier")
      .remove("$KEY_REPEATS_PREFIX$identifier")
      .apply()
  }

  private fun expectedAt(context: Context, identifier: String): Long? {
    val preferences = store(context)
    val key = "$KEY_EXPECTED_PREFIX$identifier"
    return if (preferences.contains(key)) preferences.getLong(key, 0L) else null
  }

  private fun amount(context: Context, identifier: String): Double? {
    val preferences = store(context)
    val key = "$KEY_AMOUNT_PREFIX$identifier"
    return preferences.getString(key, null)?.toDoubleOrNull()
  }

  private fun medicineName(context: Context, identifier: String) =
    store(context).getString("$KEY_MEDICINE_NAME_PREFIX$identifier", null)

  private fun reminderText(context: Context, identifier: String) =
    store(context).getString("$KEY_REMINDER_TEXT_PREFIX$identifier", null)

  private fun storedReminderType(context: Context, identifier: String) =
    store(context).getString("$KEY_REMINDER_TYPE_PREFIX$identifier", null)

  private fun scheduledIdentifiers(context: Context) =
    store(context).getStringSet(KEY_IDENTIFIERS, emptySet()).orEmpty().toSet()

  private fun scheduledMedicineIdentifiers(context: Context) =
    store(context)
      .getStringSet(KEY_MEDICINE_IDENTIFIERS, emptySet())
      .orEmpty()
      .toSet()

  private fun scheduledDatedIdentifiers(context: Context, reminderType: String) =
    store(context)
      .getStringSet("$KEY_DATED_IDENTIFIERS_PREFIX$reminderType", emptySet())
      .orEmpty()
      .toSet()

  private fun nextDailyOccurrence(previousExpectedAtMillis: Long) =
    Calendar.getInstance().run {
      timeInMillis = previousExpectedAtMillis
      do {
        add(Calendar.DAY_OF_YEAR, 1)
      } while (timeInMillis <= System.currentTimeMillis())
      timeInMillis
    }

  private fun nextYearlyOccurrence(previousExpectedAtMillis: Long): Long {
    val previous = Calendar.getInstance().apply {
      timeInMillis = previousExpectedAtMillis
    }
    val month = previous.get(Calendar.MONTH)
    val day = previous.get(Calendar.DAY_OF_MONTH)
    val hour = previous.get(Calendar.HOUR_OF_DAY)
    val minute = previous.get(Calendar.MINUTE)
    var year = previous.get(Calendar.YEAR) + 1
    val now = System.currentTimeMillis()

    repeat(32) {
      val candidate = Calendar.getInstance().apply {
        isLenient = false
        clear()
        set(year, month, day, hour, minute, 0)
      }
      val candidateMillis = try {
        candidate.timeInMillis
      } catch (_: IllegalArgumentException) {
        Long.MIN_VALUE
      }
      if (candidateMillis > now) {
        return candidateMillis
      }
      year += 1
    }

    throw IllegalStateException("Unable to calculate the next yearly occurrence")
  }

  private fun validateDatedReminderType(reminderType: String) {
    require(
      reminderType == REMINDER_TYPE_BIRTHDAY ||
        reminderType == REMINDER_TYPE_ANNIVERSARY ||
        reminderType == REMINDER_TYPE_CUSTOM
    ) {
      "Unsupported dated voice reminder type"
    }
  }

  private fun store(context: Context) =
    context.getSharedPreferences(STORE_NAME, Context.MODE_PRIVATE)

  private fun alarmManager(context: Context) =
    context.getSystemService(AlarmManager::class.java)
      ?: throw IllegalStateException("Android AlarmManager is unavailable")
}
