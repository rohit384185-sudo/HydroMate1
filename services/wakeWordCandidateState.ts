import { WAKE_WORD_CALIBRATION_CONFIG } from "./wakeWordState";

export type WakeWordCandidateFrame = {
  score: number;
  consecutiveFrames: number;
  state: string;
  observedAtMillis: number;
};

export type WakeWordCandidateState = {
  startedAtMillis?: number;
  lastFrameAtMillis?: number;
  scores: number[];
  maximumConsecutiveFrames: number;
};

export type WakeWordCandidateSummary = {
  scores: number[];
  frames: number;
  maximumConsecutiveFrames: number;
  durationMillis: number;
  maximumScore: number;
  meanScore: number;
  framesOver70: number;
  framesOver90: number;
  terminationReason: string;
};

export const emptyWakeWordCandidateState: WakeWordCandidateState = {
  scores: [],
  maximumConsecutiveFrames: 0,
};

const TERMINAL_STATES = new Set([
  "candidate-rejected",
  "cooldown",
  "detected",
  "inference-error",
  "listener-stopped",
]);

export function recordWakeWordCandidateFrame(
  state: WakeWordCandidateState,
  frame: WakeWordCandidateFrame
): {
  state: WakeWordCandidateState;
  summary?: WakeWordCandidateSummary;
} {
  if (frame.state === "candidate") {
    const startedAtMillis = state.startedAtMillis ?? frame.observedAtMillis;
    return {
      state: {
        startedAtMillis,
        lastFrameAtMillis: frame.observedAtMillis,
        scores: [...state.scores, frame.score],
        maximumConsecutiveFrames: Math.max(
          state.maximumConsecutiveFrames,
          frame.consecutiveFrames
        ),
      },
    };
  }

  if (!TERMINAL_STATES.has(frame.state) || state.scores.length === 0) {
    return { state };
  }

  const scores = [...state.scores];
  const totalScore = scores.reduce((total, score) => total + score, 0);
  const firstFrameAtMillis = state.startedAtMillis ?? frame.observedAtMillis;
  const lastFrameAtMillis = state.lastFrameAtMillis ?? firstFrameAtMillis;
  const durationMillis = Math.max(
    WAKE_WORD_CALIBRATION_CONFIG.classifierFrameMillis,
    lastFrameAtMillis - firstFrameAtMillis +
      WAKE_WORD_CALIBRATION_CONFIG.classifierFrameMillis
  );

  return {
    state: emptyWakeWordCandidateState,
    summary: {
      scores,
      frames: scores.length,
      maximumConsecutiveFrames: state.maximumConsecutiveFrames,
      durationMillis,
      maximumScore: Math.max(...scores),
      meanScore: totalScore / scores.length,
      framesOver70: scores.filter(
        (score) => score >= WAKE_WORD_CALIBRATION_CONFIG.highScoreThreshold
      ).length,
      framesOver90: scores.filter(
        (score) => score >= WAKE_WORD_CALIBRATION_CONFIG.veryHighScoreThreshold
      ).length,
      terminationReason: frame.state,
    },
  };
}

export function formatWakeWordCandidateSummary(
  summary: WakeWordCandidateSummary
) {
  const scores = summary.scores.map((score) => score.toFixed(3)).join(",");
  return (
    `candidate frames=${summary.frames} duration=${summary.durationMillis}ms ` +
    `max=${summary.maximumScore.toFixed(3)} mean=${summary.meanScore.toFixed(3)} ` +
    `over70=${summary.framesOver70} over90=${summary.framesOver90} ` +
    `maxConsecutive=${summary.maximumConsecutiveFrames} ` +
    `result=${summary.terminationReason} scores=[${scores}]`
  );
}
