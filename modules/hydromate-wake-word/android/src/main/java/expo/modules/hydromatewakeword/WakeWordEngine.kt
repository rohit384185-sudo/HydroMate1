package expo.modules.hydromatewakeword

import android.Manifest
import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.util.ArrayDeque
import java.util.Collections
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

internal class WakeWordEngine(
  private val context: Context,
  private val speakerVerifier: SpeakerVerifier,
  private val onDetected: (Float, Long) -> Unit,
  private val onDiagnostic: (Float, Float, Int, String, Long) -> Unit,
  private val onError: (String) -> Unit
) {
  private val lock = Any()
  private val running = AtomicBoolean(false)
  private val executor = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "HydroMateWakeWord").apply { isDaemon = true }
  }
  private val debugFileExecutor = Executors.newSingleThreadExecutor { runnable ->
    Thread(runnable, "HydroMateWakeWordDebugFile").apply { isDaemon = true }
  }
  private val debugFileWritePending = AtomicBoolean(false)
  private val environment = OrtEnvironment.getEnvironment()

  private var recorder: AudioRecord? = null
  private var melSession: OrtSession? = null
  private var embeddingSession: OrtSession? = null
  private var classifierSession: OrtSession? = null
  private var threshold = DEFAULT_THRESHOLD.toFloat()
  private var releaseThreshold = DEFAULT_RELEASE_THRESHOLD.toFloat()
  private var requiredConsecutiveFrames = DEFAULT_CONSECUTIVE_FRAMES
  private var cooldownMillis = DEFAULT_COOLDOWN_MILLIS.toLong()
  private var diagnosticIntervalMillis = DEFAULT_DIAGNOSTIC_INTERVAL_MILLIS.toLong()
  private var diagnosticsEnabled = false
  @Volatile
  private var calibrationOnly = false
  @Volatile
  private var debugCandidateAudioCaptureEnabled = false
  private var lastDetectionAtMillis = 0L
  private var lastDiagnosticAtMillis = 0L

  fun isListening() = running.get()

  fun setDebugCandidateAudioCaptureEnabled(enabled: Boolean): Boolean {
    debugCandidateAudioCaptureEnabled = enabled && isDebugBuild(context)
    return debugCandidateAudioCaptureEnabled
  }

  fun setCalibrationOnly(enabled: Boolean) {
    calibrationOnly = enabled && isDebugBuild(context)
  }

  fun configureSpeakerVerification(enabled: Boolean, sensitivity: String) {
    speakerVerifier.configure(enabled, sensitivity)
  }

  fun start(
    requestedThreshold: Float,
    requestedReleaseThreshold: Float,
    requestedConsecutiveFrames: Int,
    requestedCooldownMillis: Long,
    requestedDiagnosticIntervalMillis: Long,
    requestedDiagnosticsEnabled: Boolean,
    requestedCalibrationOnly: Boolean
  ): Boolean {
    synchronized(lock) {
      if (running.get()) return true
      if (context.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        throw SecurityException("Microphone permission is required for wake-word listening")
      }

      threshold = requestedThreshold.coerceIn(0.01f, 0.99f)
      releaseThreshold = requestedReleaseThreshold.coerceIn(0f, threshold)
      requiredConsecutiveFrames = requestedConsecutiveFrames.coerceIn(1, MAX_CONSECUTIVE_FRAMES)
      cooldownMillis = requestedCooldownMillis.coerceAtLeast(MIN_COOLDOWN_MILLIS)
      diagnosticIntervalMillis = requestedDiagnosticIntervalMillis.coerceIn(
        MIN_DIAGNOSTIC_INTERVAL_MILLIS,
        MAX_DIAGNOSTIC_INTERVAL_MILLIS
      )
      diagnosticsEnabled = requestedDiagnosticsEnabled &&
        (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
      calibrationOnly = requestedCalibrationOnly && diagnosticsEnabled
      ensureSessions()

      val minBufferBytes = AudioRecord.getMinBufferSize(
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
      )
      if (minBufferBytes <= 0) {
        throw IllegalStateException("This device cannot create a 16 kHz mono PCM recorder")
      }

      val audioRecord = AudioRecord(
        MediaRecorder.AudioSource.VOICE_RECOGNITION,
        SAMPLE_RATE,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        maxOf(minBufferBytes, AUDIO_CHUNK_SAMPLES * 4)
      )
      if (audioRecord.state != AudioRecord.STATE_INITIALIZED) {
        audioRecord.release()
        throw IllegalStateException("Wake-word microphone initialization failed")
      }

      audioRecord.startRecording()
      if (audioRecord.recordingState != AudioRecord.RECORDSTATE_RECORDING) {
        audioRecord.release()
        throw IllegalStateException("Wake-word microphone is unavailable or already in use")
      }

      recorder = audioRecord
      lastDiagnosticAtMillis = 0L
      running.set(true)
      executor.execute { captureLoop(audioRecord) }
      Log.d(TAG, "Wake-word listener started")
      return true
    }
  }

  fun stop() {
    val current = synchronized(lock) {
      if (!running.getAndSet(false)) return
      recorder.also { recorder = null }
    }
    releaseRecorder(current)
    Log.d(TAG, "Wake-word listener stopped")
  }

  fun destroy() {
    stop()
    debugCandidateAudioCaptureEnabled = false
    executor.shutdownNow()
    try {
      executor.awaitTermination(2, TimeUnit.SECONDS)
    } catch (_: InterruptedException) {
      Thread.currentThread().interrupt()
    }
    debugFileExecutor.shutdown()
    try {
      if (!debugFileExecutor.awaitTermination(2, TimeUnit.SECONDS)) {
        debugFileExecutor.shutdownNow()
      }
    } catch (_: InterruptedException) {
      debugFileExecutor.shutdownNow()
      Thread.currentThread().interrupt()
    }
    synchronized(lock) {
      melSession?.close()
      embeddingSession?.close()
      classifierSession?.close()
      melSession = null
      embeddingSession = null
      classifierSession = null
    }
  }

  private fun captureLoop(audioRecord: AudioRecord) {
    val chunk = ShortArray(AUDIO_CHUNK_SAMPLES)
    var chunkOffset = 0
    var overlap = ShortArray(0)
    val melFrames = ArrayDeque<FloatArray>()
    repeat(EMBEDDING_MEL_FRAMES) {
      melFrames.addLast(FloatArray(MEL_BINS) { 1f })
    }
    val embeddings = ArrayDeque<FloatArray>()
    var armed = true
    var consecutiveStrongFrames = 0
    var candidatePeak = 0f
    var diagnosticWindowPeak = 0f
    var lastClassifierScore = 0f

    // Bounded PCM16 pre-roll shared by local speaker verification and DEV debug capture.
    val debugPcmBuffer = ShortArray(DEBUG_ROLLING_BUFFER_SAMPLES)
    var debugPcmWriteIndex = 0
    var debugPcmSampleCount = 0

    fun appendDebugPcm(samples: ShortArray) {
      samples.forEach { sample ->
        debugPcmBuffer[debugPcmWriteIndex] = sample
        debugPcmWriteIndex = (debugPcmWriteIndex + 1) % debugPcmBuffer.size
        debugPcmSampleCount = minOf(debugPcmSampleCount + 1, debugPcmBuffer.size)
      }
    }

    fun snapshotDebugPcm(): ShortArray {
      if (debugPcmSampleCount == 0) return ShortArray(0)
      val snapshot = ShortArray(debugPcmSampleCount)
      val startIndex = if (debugPcmSampleCount == debugPcmBuffer.size) debugPcmWriteIndex else 0
      snapshot.indices.forEach { index ->
        snapshot[index] = debugPcmBuffer[(startIndex + index) % debugPcmBuffer.size]
      }
      return snapshot
    }

    try {
      while (running.get() && recorder === audioRecord) {
        val count = audioRecord.read(
          chunk,
          chunkOffset,
          AUDIO_CHUNK_SAMPLES - chunkOffset,
          AudioRecord.READ_BLOCKING
        )
        if (count <= 0) {
          if (running.get()) {
            throw IllegalStateException("Wake-word microphone read failed: $count")
          }
          break
        }
        chunkOffset += count
        if (chunkOffset < AUDIO_CHUNK_SAMPLES) continue
        if (!running.get() || recorder !== audioRecord) break

        val melInput = ShortArray(overlap.size + AUDIO_CHUNK_SAMPLES)
        overlap.copyInto(melInput)
        chunk.copyInto(melInput, overlap.size)
        overlap = melInput.copyOfRange(
          maxOf(0, melInput.size - MEL_OVERLAP_SAMPLES),
          melInput.size
        )
        chunkOffset = 0
        appendDebugPcm(chunk)

        appendMelFrames(melFrames, runMelModel(melInput))
        if (melFrames.size < EMBEDDING_MEL_FRAMES) continue

        val embedding = runEmbeddingModel(melFrames.toList().takeLast(EMBEDDING_MEL_FRAMES))
        embeddings.addLast(embedding)
        while (embeddings.size > CLASSIFIER_EMBEDDINGS) embeddings.removeFirst()
        if (embeddings.size < CLASSIFIER_EMBEDDINGS) continue

        val score = runClassifier(embeddings.toList())
        lastClassifierScore = score
        val now = System.currentTimeMillis()
        diagnosticWindowPeak = maxOf(diagnosticWindowPeak, score)

        if (armed && score >= threshold) {
          consecutiveStrongFrames += 1
          candidatePeak = maxOf(candidatePeak, score)
          reportDiagnostic(
            score,
            candidatePeak,
            consecutiveStrongFrames,
            "candidate",
            now,
            force = true
          )

          if (consecutiveStrongFrames >= requiredConsecutiveFrames) {
            if (calibrationOnly) continue
            if (
              running.get() &&
              recorder === audioRecord &&
              now - lastDetectionAtMillis >= cooldownMillis
            ) {
              val speakerResult = speakerVerifier.verify(snapshotDebugPcm())
              if (speakerResult.decision == SpeakerVerificationDecision.REJECT) {
                reportDiagnostic(
                  score,
                  candidatePeak,
                  consecutiveStrongFrames,
                  "speaker-rejected",
                  now,
                  force = true
                )
                queueDebugAudioCapture(
                  snapshotDebugPcm(),
                  "rejected",
                  candidatePeak,
                  consecutiveStrongFrames,
                  now
                )
                armed = false
                consecutiveStrongFrames = 0
                candidatePeak = 0f
                continue
              }
              lastDetectionAtMillis = now
              reportDiagnostic(
                score,
                candidatePeak,
                consecutiveStrongFrames,
                "detected",
                now,
                force = true
              )
              Log.d(TAG, "Wake confirmed; peak=${formatScore(candidatePeak)}")
              queueDebugAudioCapture(
                snapshotDebugPcm(),
                "confirmed",
                candidatePeak,
                consecutiveStrongFrames,
                now
              )
              stopAfterDetection(audioRecord)
              onDetected(candidatePeak, now)
              consecutiveStrongFrames = 0
              return
            }

            reportDiagnostic(
              score,
              candidatePeak,
              consecutiveStrongFrames,
              "cooldown",
              now,
              force = true
            )
            queueDebugAudioCapture(
              snapshotDebugPcm(),
              "rejected",
              candidatePeak,
              consecutiveStrongFrames,
              now
            )
            armed = false
            consecutiveStrongFrames = 0
            candidatePeak = 0f
          }
        } else if (armed && consecutiveStrongFrames > 0) {
          queueDebugAudioCapture(
            snapshotDebugPcm(),
            "rejected",
            candidatePeak,
            consecutiveStrongFrames,
            now
          )
          reportDiagnostic(
            score,
            candidatePeak,
            consecutiveStrongFrames,
            "candidate-rejected",
            now,
            force = true
          )
          consecutiveStrongFrames = 0
          candidatePeak = 0f
          armed = score <= releaseThreshold
        } else if (!armed && score <= releaseThreshold) {
          armed = true
          reportDiagnostic(score, diagnosticWindowPeak, 0, "rearmed", now, force = true)
        }

        if (
          reportDiagnostic(
            score,
            maxOf(diagnosticWindowPeak, candidatePeak),
            consecutiveStrongFrames,
            if (armed) "monitoring" else "waiting-for-release",
            now
          )
        ) {
          diagnosticWindowPeak = 0f
        }
      }
    } catch (error: Exception) {
      if (running.get()) {
        if (consecutiveStrongFrames > 0) {
          reportDiagnostic(
            lastClassifierScore,
            candidatePeak,
            consecutiveStrongFrames,
            "inference-error",
            System.currentTimeMillis(),
            force = true
          )
          consecutiveStrongFrames = 0
        }
        Log.e(TAG, "Wake-word inference stopped after an error", error)
        onError(error.message ?: "Wake-word inference failed")
      }
      synchronized(lock) {
        if (recorder === audioRecord) {
          recorder = null
          running.set(false)
        }
      }
    } finally {
      if (consecutiveStrongFrames > 0) {
        reportDiagnostic(
          lastClassifierScore,
          candidatePeak,
          consecutiveStrongFrames,
          "listener-stopped",
          System.currentTimeMillis(),
          force = true
        )
      }
      releaseRecorder(audioRecord)
    }
  }

  private fun stopAfterDetection(audioRecord: AudioRecord) {
    synchronized(lock) {
      if (recorder === audioRecord) recorder = null
      running.set(false)
    }
    releaseRecorder(audioRecord)
  }

  private fun reportDiagnostic(
    score: Float,
    peakScore: Float,
    consecutiveFrames: Int,
    state: String,
    observedAtMillis: Long,
    force: Boolean = false
  ): Boolean {
    if (!diagnosticsEnabled) return false
    if (!force && observedAtMillis - lastDiagnosticAtMillis < diagnosticIntervalMillis) {
      return false
    }

    lastDiagnosticAtMillis = observedAtMillis
    Log.d(
      TAG,
      "wake score=${formatScore(score)} peak=${formatScore(peakScore)} " +
        "state=$state consecutive=$consecutiveFrames"
    )
    onDiagnostic(score, peakScore, consecutiveFrames, state, observedAtMillis)
    return true
  }

  private fun formatScore(score: Float) = String.format(Locale.US, "%.3f", score)

  // TEMP DEV DEBUG: enqueue at most one app-private WAV write away from inference.
  private fun queueDebugAudioCapture(
    samples: ShortArray,
    eventType: String,
    peakScore: Float,
    maxConsecutiveFrames: Int,
    timestampMillis: Long
  ) {
    if (
      !debugCandidateAudioCaptureEnabled ||
      samples.isEmpty() ||
      !debugFileWritePending.compareAndSet(false, true)
    ) return

    try {
      debugFileExecutor.execute {
        try {
          val directory = File(context.filesDir, DEBUG_AUDIO_DIRECTORY)
          val scoreForFilename = formatScore(peakScore).replace('.', '_')
          val prefix = if (eventType == "confirmed") "wake_confirmed" else "candidate_rejected"
          val file = File(directory, "${prefix}_${timestampMillis}_peak_${scoreForFilename}.wav")
          synchronized(DEBUG_FILE_LOCK) {
            check(directory.exists() || directory.mkdirs()) {
              "Unable to create wake debug directory"
            }
            writePcm16Wave(file, samples)
            pruneDebugAudioFiles(directory)
          }
          Log.d(
            TAG,
            "Debug WAV saved path=${file.absolutePath} type=$eventType " +
              "peak=${formatScore(peakScore)} consecutive=$maxConsecutiveFrames " +
              "timestamp=$timestampMillis"
          )
        } catch (error: Exception) {
          Log.e(TAG, "Unable to save debug wake WAV", error)
        } finally {
          debugFileWritePending.set(false)
        }
      }
    } catch (error: Exception) {
      debugFileWritePending.set(false)
      Log.e(TAG, "Unable to enqueue debug wake WAV", error)
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

  private fun pruneDebugAudioFiles(directory: File) {
    debugAudioFiles(directory)
      .drop(MAX_DEBUG_AUDIO_FILES)
      .forEach { file ->
        if (!file.delete()) Log.w(TAG, "Unable to prune debug WAV: ${file.absolutePath}")
      }
  }

  private fun runMelModel(samples: ShortArray): List<FloatArray> {
    val input = FloatArray(samples.size) { samples[it].toFloat() }
    val output = runModel(
      requireNotNull(melSession),
      MEL_INPUT_NAME,
      input,
      longArrayOf(1, input.size.toLong())
    )
    require(output.size % MEL_BINS == 0) { "Unexpected mel output size: ${output.size}" }
    return output.asList().chunked(MEL_BINS).map { frame ->
      FloatArray(MEL_BINS) { index -> frame[index] / 10f + 2f }
    }
  }

  private fun appendMelFrames(buffer: ArrayDeque<FloatArray>, frames: List<FloatArray>) {
    frames.forEach(buffer::addLast)
    while (buffer.size > MAX_MEL_FRAMES) buffer.removeFirst()
  }

  private fun runEmbeddingModel(frames: List<FloatArray>): FloatArray {
    val input = FloatArray(EMBEDDING_MEL_FRAMES * MEL_BINS)
    frames.forEachIndexed { frameIndex, frame ->
      frame.copyInto(input, frameIndex * MEL_BINS)
    }
    val output = runModel(
      requireNotNull(embeddingSession),
      EMBEDDING_INPUT_NAME,
      input,
      longArrayOf(1, EMBEDDING_MEL_FRAMES.toLong(), MEL_BINS.toLong(), 1)
    )
    require(output.size >= EMBEDDING_SIZE) { "Unexpected embedding output size: ${output.size}" }
    return output.copyOfRange(output.size - EMBEDDING_SIZE, output.size)
  }

  private fun runClassifier(embeddings: List<FloatArray>): Float {
    val input = FloatArray(CLASSIFIER_EMBEDDINGS * EMBEDDING_SIZE)
    embeddings.forEachIndexed { embeddingIndex, embedding ->
      embedding.copyInto(input, embeddingIndex * EMBEDDING_SIZE)
    }
    val output = runModel(
      requireNotNull(classifierSession),
      CLASSIFIER_INPUT_NAME,
      input,
      longArrayOf(1, CLASSIFIER_EMBEDDINGS.toLong(), EMBEDDING_SIZE.toLong())
    )
    return output.firstOrNull()
      ?: throw IllegalStateException("Wake classifier returned no score")
  }

  private fun runModel(
    session: OrtSession,
    inputName: String,
    input: FloatArray,
    shape: LongArray
  ): FloatArray {
    val buffer = ByteBuffer.allocateDirect(input.size * Float.SIZE_BYTES)
      .order(ByteOrder.nativeOrder())
      .asFloatBuffer()
    buffer.put(input)
    buffer.rewind()
    OnnxTensor.createTensor(environment, buffer, shape).use { tensor ->
      session.run(Collections.singletonMap(inputName, tensor)).use { result ->
        return flattenFloats(result[0].value)
      }
    }
  }

  private fun flattenFloats(value: Any?): FloatArray {
    val flattened = ArrayList<Float>()
    fun visit(item: Any?) {
      when (item) {
        null -> Unit
        is Float -> flattened.add(item)
        is Number -> flattened.add(item.toFloat())
        is FloatArray -> item.forEach(flattened::add)
        is Array<*> -> item.forEach(::visit)
        else -> throw IllegalStateException("Unsupported ONNX tensor output: ${item.javaClass.name}")
      }
    }
    visit(value)
    return flattened.toFloatArray()
  }

  private fun ensureSessions() {
    if (melSession != null && embeddingSession != null && classifierSession != null) return
    OrtSession.SessionOptions().use { options ->
      options.setInterOpNumThreads(1)
      options.setIntraOpNumThreads(1)
      options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
      var newMel: OrtSession? = null
      var newEmbedding: OrtSession? = null
      var newClassifier: OrtSession? = null
      try {
        newMel = createVerifiedSession(MEL_MODEL_FILE, MEL_MODEL_SHA256, options)
        newEmbedding = createVerifiedSession(EMBEDDING_MODEL_FILE, EMBEDDING_MODEL_SHA256, options)
        newClassifier = createVerifiedSession(CLASSIFIER_MODEL_FILE, CLASSIFIER_MODEL_SHA256, options)
        melSession = newMel
        embeddingSession = newEmbedding
        classifierSession = newClassifier
        newMel = null
        newEmbedding = null
        newClassifier = null
      } finally {
        newMel?.close()
        newEmbedding?.close()
        newClassifier?.close()
      }
    }
  }

  private fun createVerifiedSession(
    filename: String,
    expectedSha256: String,
    options: OrtSession.SessionOptions
  ): OrtSession {
    val bytes = context.assets.open(filename).use { it.readBytes() }
    val actualHash = MessageDigest.getInstance("SHA-256")
      .digest(bytes)
      .joinToString("") { "%02x".format(it) }
    require(actualHash == expectedSha256) { "Wake model checksum mismatch: $filename" }
    return environment.createSession(bytes, options)
  }

  private fun releaseRecorder(audioRecord: AudioRecord?) {
    if (audioRecord == null) return
    try {
      if (audioRecord.recordingState == AudioRecord.RECORDSTATE_RECORDING) audioRecord.stop()
    } catch (_: Exception) {
      // A concurrent stop may already have released the recorder.
    }
    try {
      audioRecord.release()
    } catch (_: Exception) {
      // Safe cleanup after a concurrent stop/detection.
    }
  }

  companion object {
    const val DEFAULT_THRESHOLD = 0.5
    const val DEFAULT_RELEASE_THRESHOLD = 0.35
    const val DEFAULT_CONSECUTIVE_FRAMES = 3
    const val DEFAULT_COOLDOWN_MILLIS = 3_500
    const val DEFAULT_DIAGNOSTIC_INTERVAL_MILLIS = 250
    private const val MIN_COOLDOWN_MILLIS = 1_000L
    private const val MAX_CONSECUTIVE_FRAMES = 10
    private const val MIN_DIAGNOSTIC_INTERVAL_MILLIS = 100L
    private const val MAX_DIAGNOSTIC_INTERVAL_MILLIS = 2_000L
    private const val TAG = "HydroMateWakeWord"
    private const val SAMPLE_RATE = 16_000
    private const val AUDIO_CHUNK_SAMPLES = 1_280
    private const val MEL_OVERLAP_SAMPLES = 480
    private const val MEL_BINS = 32
    private const val EMBEDDING_MEL_FRAMES = 76
    private const val EMBEDDING_SIZE = 96
    private const val CLASSIFIER_EMBEDDINGS = 16
    private const val MAX_MEL_FRAMES = 970
    private const val DEBUG_AUDIO_DIRECTORY = "wake_debug"
    private const val DEBUG_ROLLING_BUFFER_SECONDS = 3
    private const val DEBUG_ROLLING_BUFFER_SAMPLES = SAMPLE_RATE * DEBUG_ROLLING_BUFFER_SECONDS
    private const val MAX_DEBUG_AUDIO_FILES = 50
    private val DEBUG_FILE_LOCK = Any()

    private const val MEL_MODEL_FILE = "melspectrogram.onnx"
    private const val EMBEDDING_MODEL_FILE = "embedding_model.onnx"
    private const val CLASSIFIER_MODEL_FILE = "hey_hydromate_hardneg_v3_1_single.onnx"
    private const val MEL_INPUT_NAME = "input"
    private const val EMBEDDING_INPUT_NAME = "input_1"
    private const val CLASSIFIER_INPUT_NAME = "input"

    private const val MEL_MODEL_SHA256 = "ba2b0e0f8b7b875369a2c89cb13360ff53bac436f2895cced9f479fa65eb176f"
    private const val EMBEDDING_MODEL_SHA256 = "70d164290c1d095d1d4ee149bc5e00543250a7316b59f31d056cff7bd3075c1f"
    private const val CLASSIFIER_MODEL_SHA256 = "892158891d268caebfb31d2941d05ba374669b10d9bf69f49a6e484de86c584e"

    fun isDebugBuild(context: Context) =
      (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

    fun listDebugWakeAudioFiles(context: Context): List<String> {
      if (!isDebugBuild(context)) return emptyList()
      val directory = File(context.filesDir, DEBUG_AUDIO_DIRECTORY)
      return synchronized(DEBUG_FILE_LOCK) {
        debugAudioFiles(directory).map { it.absolutePath }
      }
    }

    fun clearDebugWakeAudioFiles(context: Context): Int {
      if (!isDebugBuild(context)) return 0
      val directory = File(context.filesDir, DEBUG_AUDIO_DIRECTORY)
      return synchronized(DEBUG_FILE_LOCK) {
        debugAudioFiles(directory).count { it.delete() }
      }
    }

    private fun debugAudioFiles(directory: File) =
      directory.listFiles { file -> file.isFile && file.extension.equals("wav", ignoreCase = true) }
        ?.sortedByDescending(File::lastModified)
        .orEmpty()
  }
}
