package expo.modules.hydromatewakeword

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

internal data class WakeWordConfiguration(
  @Field val threshold: Double = WakeWordEngine.DEFAULT_THRESHOLD,
  @Field val releaseThreshold: Double = WakeWordEngine.DEFAULT_RELEASE_THRESHOLD,
  @Field val consecutiveFrames: Int = WakeWordEngine.DEFAULT_CONSECUTIVE_FRAMES,
  @Field val cooldownMillis: Int = WakeWordEngine.DEFAULT_COOLDOWN_MILLIS,
  @Field val diagnosticIntervalMillis: Int = WakeWordEngine.DEFAULT_DIAGNOSTIC_INTERVAL_MILLIS,
  @Field val diagnosticsEnabled: Boolean = false,
  @Field val calibrationOnly: Boolean = false,
  @Field val speakerVerificationEnabled: Boolean = false,
  @Field val speakerVerificationSensitivity: String = SpeakerVerifier.DEFAULT_SENSITIVITY
) : Record

class HydroMateWakeWordModule : Module() {
  private var engine: WakeWordEngine? = null
  private var speakerEnrollmentRecorder: SpeakerEnrollmentRecorder? = null
  private var speakerVerifier: SpeakerVerifier? = null
  private var debugCandidateAudioCaptureEnabled = false

  override fun definition() = ModuleDefinition {
    Name("HydroMateWakeWord")
    Events("onWakeWordDetected", "onWakeWordDiagnostic", "onWakeWordError")

    AsyncFunction("startWakeWordListening") { configuration: WakeWordConfiguration ->
      val wakeEngine = engine ?: WakeWordEngine(
        applicationContext(),
        speakerVerifier(),
        onDetected = { score, detectedAtMillis ->
          sendEvent(
            "onWakeWordDetected",
            mapOf(
              "score" to score.toDouble(),
              "detectedAtMillis" to detectedAtMillis.toDouble()
            )
          )
        },
        onDiagnostic = { score, peakScore, consecutiveFrames, state, observedAtMillis ->
          sendEvent(
            "onWakeWordDiagnostic",
            mapOf(
              "score" to score.toDouble(),
              "peakScore" to peakScore.toDouble(),
              "consecutiveFrames" to consecutiveFrames,
              "state" to state,
              "observedAtMillis" to observedAtMillis.toDouble()
            )
          )
        },
        onError = { message ->
          sendEvent("onWakeWordError", mapOf("message" to message))
        }
      ).also {
        it.setDebugCandidateAudioCaptureEnabled(debugCandidateAudioCaptureEnabled)
        engine = it
      }

      wakeEngine.setCalibrationOnly(configuration.calibrationOnly)
      wakeEngine.configureSpeakerVerification(
        configuration.speakerVerificationEnabled,
        configuration.speakerVerificationSensitivity
      )
      wakeEngine.start(
        configuration.threshold.toFloat(),
        configuration.releaseThreshold.toFloat(),
        configuration.consecutiveFrames,
        configuration.cooldownMillis.toLong(),
        configuration.diagnosticIntervalMillis.toLong(),
        configuration.diagnosticsEnabled,
        configuration.calibrationOnly
      )
    }

    AsyncFunction("stopWakeWordListening") {
      engine?.stop()
    }

    Function("isWakeWordListening") {
      engine?.isListening() == true
    }

    Function("setDebugCandidateAudioCaptureEnabled") { enabled: Boolean ->
      val allowed = WakeWordEngine.isDebugBuild(applicationContext())
      debugCandidateAudioCaptureEnabled = enabled && allowed
      engine?.setDebugCandidateAudioCaptureEnabled(debugCandidateAudioCaptureEnabled)
      debugCandidateAudioCaptureEnabled
    }

    AsyncFunction("listDebugWakeAudioFiles") {
      WakeWordEngine.listDebugWakeAudioFiles(applicationContext())
    }

    AsyncFunction("clearDebugWakeAudioFiles") {
      WakeWordEngine.clearDebugWakeAudioFiles(applicationContext())
    }

    AsyncFunction("beginSpeakerEnrollment") {
      enrollmentRecorder().beginEnrollment()
    }

    AsyncFunction("recordSpeakerEnrollmentSample") { sampleNumber: Int, promise: Promise ->
      enrollmentRecorder().recordSample(
        sampleNumber,
        onSuccess = { sample ->
          promise.resolve(
            mapOf(
              "filename" to sample.filename,
              "path" to sample.path,
              "durationMillis" to sample.durationMillis.toDouble()
            )
          )
        },
        onError = { error ->
          promise.reject(
            "ERR_SPEAKER_ENROLLMENT_RECORDING",
            error.message ?: "Speaker enrollment recording failed",
            error
          )
        }
      )
    }

    AsyncFunction("commitSpeakerEnrollment") {
      val recorder = enrollmentRecorder()
      val verifier = speakerVerifier()
      try {
        verifier.stageProfileFromPendingSamples(recorder.pendingSampleFiles())
        val samples = recorder.commitEnrollment()
        verifier.activateStagedProfile()
        samples
      } catch (error: Exception) {
        verifier.discardStagedProfile()
        throw error
      }
    }

    AsyncFunction("ensureSpeakerProfile") {
      speakerVerifier().ensureProfile()
    }

    Function("cancelSpeakerEnrollment") {
      speakerEnrollmentRecorder?.cancelEnrollment() ?: false
    }

    OnActivityEntersBackground {
      engine?.stop()
      speakerEnrollmentRecorder?.cancelEnrollment()
    }

    OnDestroy {
      debugCandidateAudioCaptureEnabled = false
      engine?.destroy()
      engine = null
      speakerEnrollmentRecorder?.destroy()
      speakerEnrollmentRecorder = null
      speakerVerifier?.destroy()
      speakerVerifier = null
    }
  }

  private fun applicationContext() =
    appContext.reactContext?.applicationContext
      ?: throw IllegalStateException("Android application context is unavailable")

  private fun enrollmentRecorder() =
    speakerEnrollmentRecorder ?: SpeakerEnrollmentRecorder(applicationContext()).also {
      speakerEnrollmentRecorder = it
    }

  private fun speakerVerifier() =
    speakerVerifier ?: SpeakerVerifier(applicationContext()).also {
      speakerVerifier = it
    }
}
