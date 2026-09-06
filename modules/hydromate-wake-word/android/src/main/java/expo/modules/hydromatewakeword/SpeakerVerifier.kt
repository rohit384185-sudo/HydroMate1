package expo.modules.hydromatewakeword

import android.content.Context
import android.util.Log
import ai.onnxruntime.OnnxTensor
import ai.onnxruntime.OrtEnvironment
import ai.onnxruntime.OrtSession
import java.io.BufferedInputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.MessageDigest
import java.util.Collections
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt

internal enum class SpeakerVerificationDecision {
  MATCH,
  REJECT,
  DISABLED,
  NOT_READY,
  ERROR
}

internal data class SpeakerVerificationResult(
  val decision: SpeakerVerificationDecision,
  val similarity: Float? = null,
  val threshold: Float? = null,
  val durationMillis: Long = 0
)

internal class SpeakerVerifier(private val context: Context) {
  private val lock = Any()
  private val environment = OrtEnvironment.getEnvironment()
  private var session: OrtSession? = null
  private var cachedProfile: FloatArray? = null
  private var cachedProfileModifiedAt = -1L

  @Volatile private var enabled = false
  @Volatile private var sensitivity = DEFAULT_SENSITIVITY

  fun configure(requestedEnabled: Boolean, requestedSensitivity: String) {
    enabled = requestedEnabled
    sensitivity = normalizeSensitivity(requestedSensitivity)
  }

  fun ensureProfile(): Boolean = synchronized(lock) {
    try {
      if (loadProfile() != null) return true
      val samples = completedEnrollmentFiles()
      if (samples.size != REQUIRED_SAMPLE_COUNT) return false
      writeActiveProfile(buildOwnerProfile(samples))
      loadProfile(force = true) != null
    } catch (error: Exception) {
      debugLog("Speaker profile generation failed", error)
      false
    }
  }

  fun stageProfileFromPendingSamples(files: List<File>) = synchronized(lock) {
    require(files.size == REQUIRED_SAMPLE_COUNT) { "All five speaker samples are required" }
    val profile = buildOwnerProfile(files)
    val pendingDirectory = pendingProfileDirectory()
    if (pendingDirectory.exists()) pendingDirectory.deleteRecursively()
    check(pendingDirectory.mkdirs()) { "Unable to create pending speaker profile directory" }
    writeProfile(File(pendingDirectory, PROFILE_FILENAME), profile)
  }

  fun activateStagedProfile() = synchronized(lock) {
    val pendingDirectory = pendingProfileDirectory()
    val pendingFile = File(pendingDirectory, PROFILE_FILENAME)
    check(pendingFile.isFile) { "Pending speaker profile is unavailable" }
    val activeDirectory = activeProfileDirectory()
    val backupDirectory = backupProfileDirectory()
    if (backupDirectory.exists()) backupDirectory.deleteRecursively()
    if (activeDirectory.exists()) {
      check(activeDirectory.renameTo(backupDirectory)) {
        "Unable to preserve the existing speaker profile"
      }
    }
    try {
      check(pendingDirectory.renameTo(activeDirectory)) {
        "Unable to activate the new speaker profile"
      }
      backupDirectory.deleteRecursively()
      cachedProfile = null
      cachedProfileModifiedAt = -1L
      check(loadProfile(force = true) != null) { "Generated speaker profile is invalid" }
    } catch (error: Exception) {
      activeDirectory.deleteRecursively()
      if (backupDirectory.exists()) backupDirectory.renameTo(activeDirectory)
      throw error
    }
  }

  fun discardStagedProfile() = synchronized(lock) {
    pendingProfileDirectory().deleteRecursively()
  }

  fun verify(samples: ShortArray): SpeakerVerificationResult {
    if (!enabled) return SpeakerVerificationResult(SpeakerVerificationDecision.DISABLED)
    val startedAt = System.nanoTime()
    return try {
      val profile = synchronized(lock) {
        loadProfile() ?: if (ensureProfile()) loadProfile() else null
      } ?: return SpeakerVerificationResult(
        SpeakerVerificationDecision.NOT_READY,
        durationMillis = elapsedMillis(startedAt)
      ).also { logResult(it) }
      val query = synchronized(lock) { normalize(embed(samples)) }
      val score = cosineSimilarity(profile, query)
      val threshold = thresholdFor(sensitivity)
      SpeakerVerificationResult(
        if (score >= threshold) SpeakerVerificationDecision.MATCH else SpeakerVerificationDecision.REJECT,
        score,
        threshold,
        elapsedMillis(startedAt)
      ).also { logResult(it) }
    } catch (error: Exception) {
      debugLog("Speaker verification error", error)
      SpeakerVerificationResult(
        SpeakerVerificationDecision.ERROR,
        durationMillis = elapsedMillis(startedAt)
      ).also { logResult(it) }
    }
  }

  fun destroy() = synchronized(lock) {
    session?.close()
    session = null
    cachedProfile = null
  }

  private fun buildOwnerProfile(files: List<File>): FloatArray {
    val embeddings = files.map { normalize(embed(readPcm16Wave(it))) }
    val average = FloatArray(EMBEDDING_DIMENSION)
    embeddings.forEach { embedding ->
      embedding.forEachIndexed { index, value -> average[index] += value }
    }
    average.indices.forEach { average[it] /= embeddings.size }
    return normalize(average)
  }

  private fun embed(samples: ShortArray): FloatArray {
    require(samples.size >= MIN_AUDIO_SAMPLES) { "Speaker audio is too short" }
    val features = SpeakerFbank.compute(samples)
    require(features.isNotEmpty()) { "Speaker audio produced no features" }
    val input = FloatArray(features.size * FBANK_BINS)
    features.forEachIndexed { frameIndex, frame ->
      frame.copyInto(input, frameIndex * FBANK_BINS)
    }
    val buffer = ByteBuffer.allocateDirect(input.size * Float.SIZE_BYTES)
      .order(ByteOrder.nativeOrder())
      .asFloatBuffer()
    buffer.put(input)
    buffer.rewind()
    OnnxTensor.createTensor(
      environment,
      buffer,
      longArrayOf(1, features.size.toLong(), FBANK_BINS.toLong())
    ).use { tensor ->
      requireSession().run(Collections.singletonMap(MODEL_INPUT_NAME, tensor)).use { result ->
        val output = flattenFloats(result[0].value)
        require(output.size == EMBEDDING_DIMENSION) {
          "Unexpected speaker embedding size: ${output.size}"
        }
        return output
      }
    }
  }

  private fun requireSession(): OrtSession {
    session?.let { return it }
    val bytes = context.assets.open(MODEL_FILENAME).use { it.readBytes() }
    val actualHash = MessageDigest.getInstance("SHA-256")
      .digest(bytes)
      .joinToString("") { "%02x".format(it) }
    require(actualHash == MODEL_SHA256) { "Speaker model checksum mismatch" }
    OrtSession.SessionOptions().use { options ->
      options.setInterOpNumThreads(1)
      options.setIntraOpNumThreads(1)
      options.setOptimizationLevel(OrtSession.SessionOptions.OptLevel.ALL_OPT)
      return environment.createSession(bytes, options).also { session = it }
    }
  }

  private fun writeActiveProfile(profile: FloatArray) {
    val directory = activeProfileDirectory()
    check(directory.exists() || directory.mkdirs()) { "Unable to create speaker profile directory" }
    val temporary = File(directory, "$PROFILE_FILENAME.tmp")
    writeProfile(temporary, profile)
    val destination = File(directory, PROFILE_FILENAME)
    if (destination.exists()) check(destination.delete()) { "Unable to replace speaker profile" }
    check(temporary.renameTo(destination)) { "Unable to activate speaker profile" }
    cachedProfile = null
    cachedProfileModifiedAt = -1L
  }

  private fun writeProfile(file: File, profile: FloatArray) {
    DataOutputStream(FileOutputStream(file).buffered()).use { output ->
      output.writeUTF(PROFILE_MAGIC)
      output.writeInt(PROFILE_VERSION)
      output.writeUTF(MODEL_SHA256)
      output.writeInt(profile.size)
      profile.forEach(output::writeFloat)
    }
  }

  private fun loadProfile(force: Boolean = false): FloatArray? {
    val file = File(activeProfileDirectory(), PROFILE_FILENAME)
    if (!file.isFile) return null
    if (!force && cachedProfile != null && cachedProfileModifiedAt == file.lastModified()) {
      return cachedProfile
    }
    return try {
      DataInputStream(BufferedInputStream(FileInputStream(file))).use { input ->
        require(input.readUTF() == PROFILE_MAGIC)
        require(input.readInt() == PROFILE_VERSION)
        require(input.readUTF() == MODEL_SHA256)
        val dimension = input.readInt()
        require(dimension == EMBEDDING_DIMENSION)
        normalize(FloatArray(dimension) { input.readFloat() }).also {
          cachedProfile = it
          cachedProfileModifiedAt = file.lastModified()
        }
      }
    } catch (error: Exception) {
      debugLog("Ignoring invalid speaker profile", error)
      null
    }
  }

  private fun readPcm16Wave(file: File): ShortArray {
    val bytes = file.readBytes()
    require(bytes.size > WAV_HEADER_BYTES) { "Speaker sample is empty" }
    require(String(bytes, 0, 4, Charsets.US_ASCII) == "RIFF")
    require(String(bytes, 8, 4, Charsets.US_ASCII) == "WAVE")
    val buffer = ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN)
    buffer.position(WAV_HEADER_BYTES)
    return ShortArray((bytes.size - WAV_HEADER_BYTES) / Short.SIZE_BYTES) { buffer.short }
  }

  private fun normalize(values: FloatArray): FloatArray {
    val norm = sqrt(values.fold(0.0) { total, value -> total + value * value }).toFloat()
    require(norm > 1e-6f) { "Speaker embedding has zero magnitude" }
    return FloatArray(values.size) { values[it] / norm }
  }

  private fun cosineSimilarity(first: FloatArray, second: FloatArray): Float {
    require(first.size == second.size)
    return first.indices.fold(0f) { total, index -> total + first[index] * second[index] }
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
        else -> error("Unsupported speaker tensor output: ${item.javaClass.name}")
      }
    }
    visit(value)
    return flattened.toFloatArray()
  }

  private fun completedEnrollmentFiles() = (1..REQUIRED_SAMPLE_COUNT)
    .map { File(File(context.filesDir, ENROLLMENT_DIRECTORY), "sample_%02d.wav".format(it)) }
    .filter(File::isFile)

  private fun activeProfileDirectory() = File(context.filesDir, PROFILE_DIRECTORY)
  private fun pendingProfileDirectory() = File(context.filesDir, PENDING_PROFILE_DIRECTORY)
  private fun backupProfileDirectory() = File(context.filesDir, BACKUP_PROFILE_DIRECTORY)
  private fun elapsedMillis(startedAt: Long) = (System.nanoTime() - startedAt) / 1_000_000

  private fun logResult(result: SpeakerVerificationResult) {
    if (!WakeWordEngine.isDebugBuild(context)) return
    Log.d(
      TAG,
      "speaker enabled=$enabled score=${result.similarity?.let { "%.3f".format(it) } ?: "n/a"} " +
        "sensitivity=$sensitivity threshold=${result.threshold ?: "n/a"} " +
        "result=${result.decision} duration=${result.durationMillis}ms"
    )
  }

  private fun debugLog(message: String, error: Throwable? = null) {
    if (!WakeWordEngine.isDebugBuild(context)) return
    if (error == null) Log.d(TAG, message) else Log.e(TAG, message, error)
  }

  companion object {
    const val DEFAULT_SENSITIVITY = "balanced"
    const val LENIENT_THRESHOLD = 0.45f
    const val BALANCED_THRESHOLD = 0.55f
    const val STRICT_THRESHOLD = 0.65f
    private const val TAG = "HydroMateSpeaker"
    private const val MODEL_FILENAME = "3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx"
    private const val MODEL_SHA256 = "357a834f702b80161e5b981182c038e18553c1f2ca752ed6cec2052365d4129b"
    private const val MODEL_INPUT_NAME = "x"
    private const val EMBEDDING_DIMENSION = 512
    private const val FBANK_BINS = 80
    private const val MIN_AUDIO_SAMPLES = 16_000
    private const val REQUIRED_SAMPLE_COUNT = 5
    private const val WAV_HEADER_BYTES = 44
    private const val PROFILE_MAGIC = "HYDROMATE_SPEAKER_PROFILE"
    private const val PROFILE_VERSION = 1
    private const val PROFILE_FILENAME = "speaker_profile.bin"
    private const val ENROLLMENT_DIRECTORY = "speaker_enrollment"
    private const val PROFILE_DIRECTORY = "speaker_profile"
    private const val PENDING_PROFILE_DIRECTORY = "speaker_profile_pending"
    private const val BACKUP_PROFILE_DIRECTORY = "speaker_profile_backup"

    fun normalizeSensitivity(value: String) = when (value) {
      "lenient", "strict" -> value
      else -> DEFAULT_SENSITIVITY
    }

    fun thresholdFor(value: String) = when (normalizeSensitivity(value)) {
      "lenient" -> LENIENT_THRESHOLD
      "strict" -> STRICT_THRESHOLD
      else -> BALANCED_THRESHOLD
    }
  }
}

private object SpeakerFbank {
  private const val SAMPLE_RATE = 16_000
  private const val FRAME_LENGTH = 400
  private const val FRAME_SHIFT = 160
  private const val FFT_SIZE = 512
  private const val MEL_BINS = 80
  private const val LOW_FREQUENCY = 20.0
  private const val HIGH_FREQUENCY = 7_600.0
  private const val PREEMPHASIS = 0.97

  fun compute(pcm: ShortArray): List<FloatArray> {
    if (pcm.size < FRAME_LENGTH) return emptyList()
    val frameCount = 1 + (pcm.size - FRAME_LENGTH) / FRAME_SHIFT
    val filters = melFilters()
    val features = ArrayList<FloatArray>(frameCount)
    repeat(frameCount) { frameIndex ->
      val frame = DoubleArray(FFT_SIZE)
      val offset = frameIndex * FRAME_SHIFT
      var mean = 0.0
      repeat(FRAME_LENGTH) { mean += pcm[offset + it] / 32768.0 }
      mean /= FRAME_LENGTH
      repeat(FRAME_LENGTH) { index -> frame[index] = pcm[offset + index] / 32768.0 - mean }
      for (index in FRAME_LENGTH - 1 downTo 1) frame[index] -= PREEMPHASIS * frame[index - 1]
      frame[0] -= PREEMPHASIS * frame[0]
      repeat(FRAME_LENGTH) { index ->
        val hann = 0.5 - 0.5 * cos(2.0 * PI * index / (FRAME_LENGTH - 1))
        frame[index] *= hann.pow(0.85)
      }
      val imaginary = DoubleArray(FFT_SIZE)
      fft(frame, imaginary)
      val power = DoubleArray(FFT_SIZE / 2 + 1) { index ->
        frame[index] * frame[index] + imaginary[index] * imaginary[index]
      }
      features.add(FloatArray(MEL_BINS) { melIndex ->
        var energy = 0.0
        filters[melIndex].forEachIndexed { frequencyIndex, weight ->
          energy += power[frequencyIndex] * weight
        }
        ln(energy.coerceAtLeast(1e-10)).toFloat()
      })
    }
    repeat(MEL_BINS) { melIndex ->
      val mean = features.sumOf { it[melIndex].toDouble() } / features.size
      features.forEach { it[melIndex] = (it[melIndex] - mean).toFloat() }
    }
    return features
  }

  private fun melFilters(): Array<DoubleArray> {
    fun hzToMel(hz: Double) = 1127.0 * ln(1.0 + hz / 700.0)
    fun melToHz(mel: Double) = 700.0 * (kotlin.math.exp(mel / 1127.0) - 1.0)
    val lowMel = hzToMel(LOW_FREQUENCY)
    val highMel = hzToMel(HIGH_FREQUENCY)
    val centers = DoubleArray(MEL_BINS + 2) { index ->
      melToHz(lowMel + (highMel - lowMel) * index / (MEL_BINS + 1))
    }
    return Array(MEL_BINS) { melIndex ->
      val left = centers[melIndex]
      val center = centers[melIndex + 1]
      val right = centers[melIndex + 2]
      DoubleArray(FFT_SIZE / 2 + 1) { bin ->
        val frequency = bin.toDouble() * SAMPLE_RATE / FFT_SIZE
        when {
          frequency <= left || frequency >= right -> 0.0
          frequency < center -> (frequency - left) / (center - left)
          else -> (right - frequency) / (right - center)
        }
      }
    }
  }

  private fun fft(real: DoubleArray, imaginary: DoubleArray) {
    var j = 0
    for (i in 1 until real.size) {
      var bit = real.size shr 1
      while (j and bit != 0) {
        j = j xor bit
        bit = bit shr 1
      }
      j = j xor bit
      if (i < j) {
        val realValue = real[i]
        real[i] = real[j]
        real[j] = realValue
        val imaginaryValue = imaginary[i]
        imaginary[i] = imaginary[j]
        imaginary[j] = imaginaryValue
      }
    }
    var length = 2
    while (length <= real.size) {
      val angle = -2.0 * PI / length
      val stepReal = cos(angle)
      val stepImaginary = sin(angle)
      var offset = 0
      while (offset < real.size) {
        var weightReal = 1.0
        var weightImaginary = 0.0
        repeat(length / 2) { index ->
          val even = offset + index
          val odd = even + length / 2
          val oddReal = real[odd] * weightReal - imaginary[odd] * weightImaginary
          val oddImaginary = real[odd] * weightImaginary + imaginary[odd] * weightReal
          real[odd] = real[even] - oddReal
          imaginary[odd] = imaginary[even] - oddImaginary
          real[even] += oddReal
          imaginary[even] += oddImaginary
          val nextWeightReal = weightReal * stepReal - weightImaginary * stepImaginary
          weightImaginary = weightReal * stepImaginary + weightImaginary * stepReal
          weightReal = nextWeightReal
        }
        offset += length
      }
      length = length shl 1
    }
  }
}
