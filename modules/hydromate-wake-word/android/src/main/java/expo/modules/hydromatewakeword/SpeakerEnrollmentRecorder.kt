package expo.modules.hydromatewakeword

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

internal data class SpeakerEnrollmentSample(
  val filename: String,
  val path: String,
  val durationMillis: Long
)

internal class SpeakerEnrollmentRecorder(private val context: Context) {
  private val lock = Any()
  private val fileLock = Any()
  private val executor = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "HydroMateSpeakerEnrollment").apply { isDaemon = true }
  }
  private val recordingCancelled = AtomicBoolean(false)

  private var sessionId = 0L
  private var sessionActive = false
  private var recording = false
  private var recorder: AudioRecord? = null

  fun beginEnrollment(): Boolean {
    requireMicrophonePermission()
    cancelCurrentRecording()

    synchronized(lock) {
      sessionId += 1
      sessionActive = true
      recording = false
      recordingCancelled.set(false)
    }
    synchronized(fileLock) {
      pendingDirectory().deleteRecursively()
      check(pendingDirectory().mkdirs()) {
        "Unable to create the private speaker enrollment directory"
      }
    }
    debugLog("Speaker enrollment started")
    return true
  }

  fun recordSample(
    sampleNumber: Int,
    onSuccess: (SpeakerEnrollmentSample) -> Unit,
    onError: (Exception) -> Unit
  ) {
    require(sampleNumber in 1..REQUIRED_SAMPLE_COUNT) {
      "Speaker enrollment sample number must be between 1 and $REQUIRED_SAMPLE_COUNT"
    }

    val activeSessionId = synchronized(lock) {
      check(sessionActive) { "Speaker enrollment has not been started" }
      check(!recording) { "A speaker enrollment sample is already recording" }
      recording = true
      recordingCancelled.set(false)
      sessionId
    }

    executor.execute {
      try {
        debugLog("Speaker enrollment sample=$sampleNumber recording started")
        val samples = capturePcm16(activeSessionId)
        checkSession(activeSessionId)
        val filename = "sample_${sampleNumber.toString().padStart(2, '0')}.wav"
        val target = File(pendingDirectory(), filename)
        val temporary = File(pendingDirectory(), "$filename.tmp")

        synchronized(fileLock) {
          checkSession(activeSessionId)
          temporary.delete()
          writePcm16Wave(temporary, samples)
          if (target.exists()) check(target.delete()) { "Unable to replace $filename" }
          check(temporary.renameTo(target)) { "Unable to finalize $filename" }
        }

        val durationMillis = samples.size * 1_000L / SAMPLE_RATE
        debugLog(
          "Speaker enrollment sample=$sampleNumber saved path=${target.absolutePath} " +
            "duration=${durationMillis}ms"
        )
        onSuccess(
          SpeakerEnrollmentSample(
            filename = filename,
            path = target.absolutePath,
            durationMillis = durationMillis
          )
        )
      } catch (error: Exception) {
        if (!recordingCancelled.get()) {
          debugLog("Speaker enrollment error=${error.message ?: "unknown"}")
        }
        onError(error)
      } finally {
        synchronized(lock) {
          if (sessionId == activeSessionId) recording = false
        }
      }
    }
  }

  fun commitEnrollment(): List<String> {
    val completed = completedDirectory()
    synchronized(lock) {
      check(sessionActive) { "Speaker enrollment has not been started" }
      check(!recording) { "Wait for the current sample recording to finish" }
      val pending = pendingDirectory()
      val backup = backupDirectory()
      val expectedFiles = (1..REQUIRED_SAMPLE_COUNT).map { sampleNumber ->
        File(pending, "sample_${sampleNumber.toString().padStart(2, '0')}.wav")
      }
      check(expectedFiles.all { it.isFile && it.length() > WAV_HEADER_BYTES }) {
        "All five speaker enrollment samples are required"
      }

      synchronized(fileLock) {
        backup.deleteRecursively()
        if (completed.exists()) {
          check(completed.renameTo(backup)) {
            "Unable to preserve the existing speaker enrollment"
          }
        }
        try {
          check(pending.renameTo(completed)) {
            "Unable to activate the new speaker enrollment"
          }
          backup.deleteRecursively()
        } catch (error: Exception) {
          completed.deleteRecursively()
          if (backup.exists()) backup.renameTo(completed)
          throw error
        }
      }
      sessionActive = false
      sessionId += 1
    }
    debugLog("Speaker enrollment completed")
    return (1..REQUIRED_SAMPLE_COUNT).map { sampleNumber ->
      File(completed, "sample_${sampleNumber.toString().padStart(2, '0')}.wav").absolutePath
    }
  }

  fun pendingSampleFiles(): List<File> = synchronized(lock) {
    check(sessionActive) { "Speaker enrollment has not been started" }
    check(!recording) { "Wait for the current sample recording to finish" }
    (1..REQUIRED_SAMPLE_COUNT).map { sampleNumber ->
      File(pendingDirectory(), "sample_${sampleNumber.toString().padStart(2, '0')}.wav")
    }.also { files ->
      check(files.all { it.isFile && it.length() > WAV_HEADER_BYTES }) {
        "All five speaker enrollment samples are required"
      }
    }
  }

  fun cancelEnrollment(): Boolean {
    val hadActiveSession = synchronized(lock) {
      val wasActive = sessionActive || recording
      sessionActive = false
      sessionId += 1
      recordingCancelled.set(true)
      wasActive
    }
    cancelCurrentRecording()
    synchronized(fileLock) {
      pendingDirectory().deleteRecursively()
    }
    if (hadActiveSession) debugLog("Speaker enrollment cancelled")
    return hadActiveSession
  }

  fun destroy() {
    cancelEnrollment()
    executor.shutdownNow()
  }

  private fun capturePcm16(activeSessionId: Long): ShortArray {
    requireMicrophonePermission()
    val minBufferBytes = AudioRecord.getMinBufferSize(
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    )
    check(minBufferBytes > 0) {
      "This device cannot create a 16 kHz mono PCM recorder"
    }

    val audioRecord = AudioRecord(
      MediaRecorder.AudioSource.VOICE_RECOGNITION,
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      maxOf(minBufferBytes, READ_BUFFER_SAMPLES * Short.SIZE_BYTES * 2)
    )
    check(audioRecord.state == AudioRecord.STATE_INITIALIZED) {
      audioRecord.release()
      "Speaker enrollment microphone initialization failed"
    }

    synchronized(lock) {
      checkSession(activeSessionId)
      recorder = audioRecord
    }

    try {
      audioRecord.startRecording()
      check(audioRecord.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
        "Speaker enrollment microphone is unavailable or already in use"
      }
      val samples = ShortArray(SAMPLE_RATE * RECORDING_SECONDS_NUMERATOR / RECORDING_SECONDS_DENOMINATOR)
      var offset = 0
      while (offset < samples.size) {
        checkSession(activeSessionId)
        val count = audioRecord.read(
          samples,
          offset,
          minOf(READ_BUFFER_SAMPLES, samples.size - offset),
          AudioRecord.READ_BLOCKING
        )
        check(count > 0) { "Speaker enrollment microphone read failed: $count" }
        offset += count
      }
      return samples
    } finally {
      synchronized(lock) {
        if (recorder === audioRecord) recorder = null
      }
      releaseRecorder(audioRecord)
    }
  }

  private fun checkSession(activeSessionId: Long) {
    check(
      !recordingCancelled.get() &&
        synchronized(lock) { sessionActive && sessionId == activeSessionId }
    ) { "Speaker enrollment recording was cancelled" }
  }

  private fun cancelCurrentRecording() {
    val current = synchronized(lock) {
      recorder.also { recorder = null }
    }
    releaseRecorder(current)
  }

  private fun releaseRecorder(audioRecord: AudioRecord?) {
    if (audioRecord == null) return
    try {
      if (audioRecord.recordingState == AudioRecord.RECORDSTATE_RECORDING) audioRecord.stop()
    } catch (_: Exception) {
      // Cancellation may race a blocking read or an already released recorder.
    }
    try {
      audioRecord.release()
    } catch (_: Exception) {
      // Safe cleanup after cancellation or completion.
    }
  }

  private fun writePcm16Wave(file: File, samples: ShortArray) {
    val dataSize = samples.size * Short.SIZE_BYTES
    FileOutputStream(file).use { output ->
      output.write("RIFF".toByteArray(Charsets.US_ASCII))
      writeLittleEndianInt(output, 36 + dataSize)
      output.write("WAVE".toByteArray(Charsets.US_ASCII))
      output.write("fmt ".toByteArray(Charsets.US_ASCII))
      writeLittleEndianInt(output, 16)
      writeLittleEndianShort(output, 1)
      writeLittleEndianShort(output, 1)
      writeLittleEndianInt(output, SAMPLE_RATE)
      writeLittleEndianInt(output, SAMPLE_RATE * Short.SIZE_BYTES)
      writeLittleEndianShort(output, Short.SIZE_BYTES)
      writeLittleEndianShort(output, 16)
      output.write("data".toByteArray(Charsets.US_ASCII))
      writeLittleEndianInt(output, dataSize)
      samples.forEach { sample -> writeLittleEndianShort(output, sample.toInt()) }
    }
  }

  private fun writeLittleEndianInt(output: FileOutputStream, value: Int) {
    output.write(value and 0xff)
    output.write(value shr 8 and 0xff)
    output.write(value shr 16 and 0xff)
    output.write(value shr 24 and 0xff)
  }

  private fun writeLittleEndianShort(output: FileOutputStream, value: Int) {
    output.write(value and 0xff)
    output.write(value shr 8 and 0xff)
  }

  private fun requireMicrophonePermission() {
    check(
      context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) ==
        PackageManager.PERMISSION_GRANTED
    ) { "Microphone permission is required for speaker enrollment" }
  }

  private fun pendingDirectory() = File(context.filesDir, PENDING_DIRECTORY)
  private fun completedDirectory() = File(context.filesDir, COMPLETED_DIRECTORY)
  private fun backupDirectory() = File(context.filesDir, BACKUP_DIRECTORY)

  private fun debugLog(message: String) {
    if (WakeWordEngine.isDebugBuild(context)) Log.d(TAG, message)
  }

  companion object {
    private const val TAG = "HydroMateSpeaker"
    private const val SAMPLE_RATE = 16_000
    private const val READ_BUFFER_SAMPLES = 1_280
    private const val RECORDING_SECONDS_NUMERATOR = 5
    private const val RECORDING_SECONDS_DENOMINATOR = 2
    private const val REQUIRED_SAMPLE_COUNT = 5
    private const val WAV_HEADER_BYTES = 44L
    private const val COMPLETED_DIRECTORY = "speaker_enrollment"
    private const val PENDING_DIRECTORY = "speaker_enrollment_pending"
    private const val BACKUP_DIRECTORY = "speaker_enrollment_backup"
  }
}
