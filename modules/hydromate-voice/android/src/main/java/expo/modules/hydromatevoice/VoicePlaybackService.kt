package expo.modules.hydromatevoice

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.KeyguardManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

class VoicePlaybackService : Service(), TextToSpeech.OnInitListener {
  private var textToSpeech: TextToSpeech? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var audioFocusRequest: AudioFocusRequest? = null
  private var hasAudioFocus = false
  private val finished = AtomicBoolean(false)
  private val started = AtomicBoolean(false)
  private val currentPlaybackFinished = AtomicBoolean(false)
  private val mainHandler = Handler(Looper.getMainLooper())
  private var timeoutRunnable: Runnable? = null
  private var playbackConfiguration: PlaybackConfiguration? = null
  private var currentUtteranceId: String? = null
  private val pendingConfigurations = ArrayDeque<PlaybackConfiguration>()
  private var utteranceSequence = 0L

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action != ACTION_PLAY_TEST &&
      intent?.action != ACTION_PLAY_WATER &&
      intent?.action != ACTION_PLAY_MEDICINE &&
      intent?.action != ACTION_PLAY_DATED
    ) {
      stopSelf(startId)
      return START_NOT_STICKY
    }

    val configuration = createPlaybackConfiguration(intent)
    if (configuration == null) {
      if (!started.get()) {
        stopSelf(startId)
      }
      return START_NOT_STICKY
    }

    if (started.compareAndSet(false, true)) {
      startAsForeground()
      acquireBoundedWakeLock()
      beginPlayback(configuration)
    } else {
      pendingConfigurations.addLast(configuration)
    }
    return START_NOT_STICKY
  }

  override fun onInit(status: Int) {
    val tts = textToSpeech
    val configuration = playbackConfiguration
    val utteranceId = currentUtteranceId
    if (status != TextToSpeech.SUCCESS ||
      tts == null ||
      configuration == null ||
      utteranceId == null
    ) {
      Log.e(TAG, "Native TextToSpeech initialization failed")
      utteranceId?.let(::finishCurrentPlayback) ?: finishService()
      return
    }

    if (!configureVoice(tts, configuration)) {
      Log.e(TAG, "A compatible TextToSpeech voice is unavailable")
      finishCurrentPlayback(utteranceId)
      return
    }

    tts.setAudioAttributes(
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
        .build()
    )
    tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
      override fun onStart(utteranceId: String?) = Unit
      override fun onDone(completedUtteranceId: String?) {
        if (completedUtteranceId == utteranceId) finishCurrentPlayback(utteranceId)
      }
      @Deprecated("Deprecated in Java")
      override fun onError(failedUtteranceId: String?) {
        if (failedUtteranceId == utteranceId) finishCurrentPlayback(utteranceId)
      }
      override fun onError(failedUtteranceId: String?, errorCode: Int) {
        if (failedUtteranceId == utteranceId) finishCurrentPlayback(utteranceId)
      }
      override fun onStop(stoppedUtteranceId: String?, interrupted: Boolean) {
        if (stoppedUtteranceId == utteranceId) finishCurrentPlayback(utteranceId)
      }
    })

    requestTransientAudioFocus()
    val result = tts.speak(
      configuration.message,
      TextToSpeech.QUEUE_FLUSH,
      null,
      utteranceId
    )
    if (BuildConfig.DEBUG && configuration.debugReminderType == VoiceAlarmScheduler.REMINDER_TYPE_WATER) {
      Log.d(
        "HydroMateReminderSchedule",
        "stage=tts type=water id=${configuration.debugIdentifier} voiceEmitted=${result != TextToSpeech.ERROR}"
      )
    }
    if (result == TextToSpeech.ERROR) {
      finishCurrentPlayback(utteranceId)
    }
  }

  override fun onDestroy() {
    releaseResources()
    super.onDestroy()
  }

  override fun onTimeout(startId: Int, fgsType: Int) {
    finishService()
  }

  private fun startAsForeground() {
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          CHANNEL_ID,
          "HydroMate voice playback",
          NotificationManager.IMPORTANCE_LOW
        ).apply {
          description = "Temporary playback status for voice reminder tests"
          setSound(null, null)
          enableVibration(false)
        }
      )
    }

    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.hydromate_voice_notification)
      .setContentTitle("HydroMate")
      .setContentText("HydroMate is playing a voice reminder")
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setSilent(true)
      .setOngoing(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .build()

    val foregroundType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE
    } else {
      0
    }
    ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, foregroundType)
  }

  private fun createPlaybackConfiguration(intent: Intent): PlaybackConfiguration? {
    if (intent.action == ACTION_PLAY_TEST) {
      return PlaybackConfiguration(
        message = TEST_MESSAGE,
        localeCandidates = listOf("en-US", "en-IN"),
        selectedVoiceIdentifier = null
      )
    }

    val identifier = intent.getStringExtra(
      VoiceAlarmScheduler.EXTRA_REMINDER_IDENTIFIER
    ) ?: return null
    val expectedAtMillis = intent.getLongExtra(
      VoiceAlarmScheduler.EXTRA_EXPECTED_AT,
      0L
    )
    val reminderType = intent.getStringExtra(
      VoiceAlarmScheduler.EXTRA_REMINDER_TYPE
    )
    val settings = NativeVoicePreferences.read(this)

    if (reminderType == VoiceAlarmScheduler.REMINDER_TYPE_MEDICINE) {
      val medicineName = intent.getStringExtra(
        VoiceAlarmScheduler.EXTRA_MEDICINE_NAME
      ) ?: return null
      val isLocked = getSystemService(KeyguardManager::class.java)
        ?.isDeviceLocked == true
      val template = if (isLocked) {
        settings.lockedMedicineSpeechTemplate
      } else {
        settings.medicineSpeechTemplate
      }

      if (!settings.enabled ||
        medicineName.isEmpty() ||
        template.isBlank() ||
        (!isLocked && !template.contains("{name}")) ||
        (isLocked && SENSITIVE_PLACEHOLDERS.any(template::contains)) ||
        settings.localeCandidates.isEmpty() ||
        !VoiceAlarmScheduler.claimSpeechOccurrence(this, identifier, expectedAtMillis)
      ) {
        return null
      }

      return PlaybackConfiguration(
        message = if (isLocked) template else template.replace("{name}", medicineName),
        localeCandidates = settings.localeCandidates,
        selectedVoiceIdentifier = settings.selectedVoiceIdentifier
      )
    }

    if (reminderType == VoiceAlarmScheduler.REMINDER_TYPE_BIRTHDAY ||
      reminderType == VoiceAlarmScheduler.REMINDER_TYPE_ANNIVERSARY ||
      reminderType == VoiceAlarmScheduler.REMINDER_TYPE_CUSTOM
    ) {
      val reminderText = intent.getStringExtra(
        VoiceAlarmScheduler.EXTRA_REMINDER_TEXT
      ) ?: return null
      val detailedTemplate: String
      val lockedTemplate: String
      val detailedPlaceholder: String

      when (reminderType) {
        VoiceAlarmScheduler.REMINDER_TYPE_BIRTHDAY -> {
          detailedTemplate = settings.birthdaySpeechTemplate
          lockedTemplate = settings.lockedBirthdaySpeechTemplate
          detailedPlaceholder = "{name}"
        }
        VoiceAlarmScheduler.REMINDER_TYPE_ANNIVERSARY -> {
          detailedTemplate = settings.anniversarySpeechTemplate
          lockedTemplate = settings.lockedAnniversarySpeechTemplate
          detailedPlaceholder = "{name}"
        }
        else -> {
          detailedTemplate = settings.customSpeechTemplate
          lockedTemplate = settings.lockedCustomSpeechTemplate
          detailedPlaceholder = "{message}"
        }
      }

      val isLocked = getSystemService(KeyguardManager::class.java)
        ?.isDeviceLocked == true
      val template = if (isLocked) lockedTemplate else detailedTemplate

      if (!settings.enabled ||
        reminderText.isEmpty() ||
        template.isBlank() ||
        (!isLocked && !template.contains(detailedPlaceholder)) ||
        (isLocked && SENSITIVE_PLACEHOLDERS.any(template::contains)) ||
        settings.localeCandidates.isEmpty() ||
        !VoiceAlarmScheduler.claimSpeechOccurrence(this, identifier, expectedAtMillis)
      ) {
        return null
      }

      return PlaybackConfiguration(
        message = if (isLocked) {
          template
        } else {
          template.replace(detailedPlaceholder, reminderText)
        },
        localeCandidates = settings.localeCandidates,
        selectedVoiceIdentifier = settings.selectedVoiceIdentifier
      )
    }

    val amountMl = intent.getDoubleExtra(
      VoiceAlarmScheduler.EXTRA_AMOUNT_ML,
      0.0
    )

    val waterEligible = reminderType == VoiceAlarmScheduler.REMINDER_TYPE_WATER &&
      amountMl.isFinite() &&
      amountMl > 0 &&
      settings.enabled &&
      settings.waterSpeechTemplate.contains("{amount}") &&
      settings.localeCandidates.isNotEmpty()
    val occurrenceClaimed = waterEligible &&
      VoiceAlarmScheduler.claimSpeechOccurrence(this, identifier, expectedAtMillis)
    if (BuildConfig.DEBUG) {
      Log.d(
        "HydroMateReminderSchedule",
        "stage=playback type=water id=$identifier eligible=$waterEligible occurrenceClaimed=$occurrenceClaimed playbackAccepted=$occurrenceClaimed"
      )
    }

    if (!waterEligible || !occurrenceClaimed) {
      return null
    }

    return PlaybackConfiguration(
      message = settings.waterSpeechTemplate.replace(
        "{amount}",
        if (amountMl % 1.0 == 0.0) amountMl.toLong().toString() else amountMl.toString()
      ),
      localeCandidates = settings.localeCandidates,
      selectedVoiceIdentifier = settings.selectedVoiceIdentifier,
      debugReminderType = reminderType,
      debugIdentifier = identifier
    )
  }

  private fun configureVoice(
    textToSpeech: TextToSpeech,
    configuration: PlaybackConfiguration
  ): Boolean {
    val voices = try {
      textToSpeech.voices.orEmpty()
    } catch (_: Exception) {
      emptySet<Voice>()
    }
    val compatibleVoices = configuration.localeCandidates.flatMap { candidate ->
      val normalizedCandidate = normalizeLanguageTag(candidate)
      val baseLanguage = normalizedCandidate.substringBefore("-")
      voices
        .filter { voice ->
          val voiceLanguage = normalizeLanguageTag(voice.locale.toLanguageTag())
          voiceLanguage == normalizedCandidate ||
            voiceLanguage.substringBefore("-") == baseLanguage
        }
        .sortedByDescending { voice ->
          normalizeLanguageTag(voice.locale.toLanguageTag()) == normalizedCandidate
        }
    }.distinctBy { voice -> voice.name }

    val selectedVoice = configuration.selectedVoiceIdentifier?.let { identifier ->
      compatibleVoices.firstOrNull { voice -> voice.name == identifier }
    }
    val compatibleVoice = selectedVoice ?: compatibleVoices.firstOrNull()

    if (compatibleVoice != null) {
      return textToSpeech.setVoice(compatibleVoice) == TextToSpeech.SUCCESS
    }

    for (candidate in configuration.localeCandidates) {
      val locale = Locale.forLanguageTag(candidate.replace('_', '-'))
      val result = textToSpeech.setLanguage(locale)
      if (result != TextToSpeech.LANG_MISSING_DATA &&
        result != TextToSpeech.LANG_NOT_SUPPORTED
      ) {
        return true
      }
    }

    return false
  }

  private fun normalizeLanguageTag(languageTag: String) =
    languageTag.replace('_', '-').lowercase(Locale.ROOT)

  private fun acquireBoundedWakeLock() {
    val powerManager = getSystemService(PowerManager::class.java)
    wakeLock = powerManager
      .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "$packageName:voice-test")
      .apply {
        setReferenceCounted(false)
        acquire(WAKE_LOCK_TIMEOUT_MILLIS)
      }
  }

  @Suppress("DEPRECATION")
  private fun requestTransientAudioFocus(): Boolean {
    val audioManager = getSystemService(AudioManager::class.java)
    val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        .setOnAudioFocusChangeListener { }
        .build()
      audioFocusRequest = request
      audioManager.requestAudioFocus(request) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    } else {
      audioManager.requestAudioFocus(
        null,
        AudioManager.STREAM_MUSIC,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
      ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }
    hasAudioFocus = granted
    return granted
  }

  private fun beginPlayback(configuration: PlaybackConfiguration) {
    playbackConfiguration = configuration
    currentPlaybackFinished.set(false)
    utteranceSequence += 1
    val utteranceId = "$UTTERANCE_ID_PREFIX-$utteranceSequence"
    currentUtteranceId = utteranceId
    timeoutRunnable = Runnable { finishCurrentPlayback(utteranceId) }.also {
      mainHandler.postDelayed(it, PLAYBACK_TIMEOUT_MILLIS)
    }
    textToSpeech = TextToSpeech(applicationContext, this)
  }

  private fun finishCurrentPlayback(utteranceId: String) {
    if (currentUtteranceId != utteranceId ||
      !currentPlaybackFinished.compareAndSet(false, true)
    ) {
      return
    }

    mainHandler.post {
      releaseCurrentSpeechResources()
      val nextConfiguration = pendingConfigurations.removeFirstOrNull()
      if (nextConfiguration == null) {
        finishService()
      } else {
        beginPlayback(nextConfiguration)
      }
    }
  }

  private fun finishService() {
    if (!finished.compareAndSet(false, true)) {
      return
    }

    mainHandler.post {
      releaseResources()
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
      stopSelf()
    }
  }

  @Suppress("DEPRECATION")
  private fun releaseCurrentSpeechResources() {
    timeoutRunnable?.let(mainHandler::removeCallbacks)
    timeoutRunnable = null
    textToSpeech?.stop()
    textToSpeech?.shutdown()
    textToSpeech = null
    playbackConfiguration = null
    currentUtteranceId = null

    val audioManager = getSystemService(AudioManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      audioFocusRequest?.let(audioManager::abandonAudioFocusRequest)
    } else if (hasAudioFocus) {
      audioManager.abandonAudioFocus(null)
    }
    audioFocusRequest = null
    hasAudioFocus = false
  }

  private fun releaseResources() {
    releaseCurrentSpeechResources()
    pendingConfigurations.clear()

    wakeLock?.let { lock ->
      if (lock.isHeld) {
        lock.release()
      }
    }
    wakeLock = null
  }

  companion object {
    const val ACTION_PLAY_TEST = "expo.modules.hydromatevoice.action.PLAY_TEST"
    const val ACTION_PLAY_WATER = "expo.modules.hydromatevoice.action.PLAY_WATER"
    const val ACTION_PLAY_MEDICINE =
      "expo.modules.hydromatevoice.action.PLAY_MEDICINE"
    const val ACTION_PLAY_DATED =
      "expo.modules.hydromatevoice.action.PLAY_DATED"
    private const val TAG = "HydroMateVoice"
    private const val CHANNEL_ID = "hydromate_voice_playback"
    private const val NOTIFICATION_ID = 94_030
    private const val TEST_MESSAGE = "It is time to drink water."
    private const val UTTERANCE_ID_PREFIX = "hydromate-native-voice"
    private const val PLAYBACK_TIMEOUT_MILLIS = 30_000L
    private const val WAKE_LOCK_TIMEOUT_MILLIS = 35_000L
    private val SENSITIVE_PLACEHOLDERS =
      listOf("{name}", "{title}", "{message}")
  }

  private data class PlaybackConfiguration(
    val message: String,
    val localeCandidates: List<String>,
    val selectedVoiceIdentifier: String?,
    val debugReminderType: String? = null,
    val debugIdentifier: String? = null
  )
}
