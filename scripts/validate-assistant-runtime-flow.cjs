const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
// Compile the actual modal, hook and shared decision functions in memory.
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
};
const flow = require("../services/assistantConversationRuntime.ts");
const timing = require("../services/assistantTiming.ts");
const normalizer = require("../services/assistantLocaleNormalizer.ts");
let assertions = 0;
const eq = (a, b, message) => { assert.deepEqual(a, b, message); assertions++; };
const ok = (value, message) => { assert.ok(value, message); assertions++; };
let mounted;
let voicePlatform;
const originalLoad = Module._load;
const react = {
  useRef: (value) => { const i = mounted.cursor++; return mounted.hooks[i] ??= { current: value }; },
  useState: (value) => {
    const i = mounted.cursor++;
    mounted.hooks[i] ??= { value: typeof value === "function" ? value() : value };
    const owner = mounted;
    return [owner.hooks[i].value, (next) => { owner.hooks[i].value = typeof next === "function" ? next(owner.hooks[i].value) : next; }];
  },
  useCallback: (fn, deps) => react.useMemo(() => fn, deps),
  useMemo: (fn, deps) => {
    const i = mounted.cursor++;
    if (!mounted.hooks[i] || deps?.some((value, index) => value !== mounted.hooks[i].deps?.[index])) mounted.hooks[i] = { value: fn(), deps };
    return mounted.hooks[i].value;
  },
  useEffect: (fn, deps) => {
    const i = mounted.cursor++;
    if (!mounted.hooks[i] || deps?.some((value, index) => value !== mounted.hooks[i].deps?.[index])) {
      mounted.effects.push(fn); mounted.hooks[i] = { deps };
    }
  },
};
const nativeSpeech = {
  isRecognitionAvailable: () => true,
  getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
  getSupportedLocales: async () => ({ locales: [] }),
  start: () => { mounted.starts++; mounted.recognizing = true; queueMicrotask(() => mounted.events.start?.()); },
  abort: () => { mounted.recognizing = false; },
  stop: () => {},
};
Module._load = function (id, parent, ...rest) {
  if (parent?.filename.endsWith("voiceReminderService.ts")) {
    if (id === "expo-speech") return {
      getAvailableVoicesAsync: async () => voicePlatform.lookup ? voicePlatform.lookup.promise : [{ identifier: "test", language: "en-US" }],
      isSpeakingAsync: async () => false,
      speak: (_, options) => { voicePlatform.calls++; voicePlatform.callbacks = options; },
      stop: async () => { voicePlatform.stops++; }, // Deliberately no onStopped callback.
    };
    if (id === "@react-native-async-storage/async-storage") return { default: { getItem: async () => null } };
    if (id === "../modules/hydromate-voice") return {};
  }
  if (id === "react") return react;
  if (id === "react/jsx-runtime") return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  if (id === "react-native") return { Platform: { OS: "android" }, StyleSheet: { create: (styles) => styles }, ...Object.fromEntries(["ActivityIndicator", "KeyboardAvoidingView", "Modal", "ScrollView", "Text", "TextInput", "TouchableOpacity", "View"].map((name) => [name, name])) };
  if (id === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
  if (id === "expo-router") return { useRouter: () => ({ push: () => {} }) };
  if (id === "expo-speech-recognition") return { ExpoSpeechRecognitionModule: nativeSpeech, useSpeechRecognitionEvent: (name, fn) => { mounted.events[name] = fn; } };
  if (id === "../localization") return { useLocalization: () => ({ language: mounted.locale, locale: mounted.locale === "bho" || mounted.locale === "bgc" ? "hi" : mounted.locale, t: mounted.t }) };
  if (parent?.filename.endsWith("hydromate-assistant-modal.tsx")) {
    if (id.endsWith("assistantReminderCreationService")) return { loadKnownMedicineNames: async () => [], saveAssistantReminder: async (draft) => {
      mounted.saveCalls++; mounted.sequence.push("save-start");
      if (mounted.pendingSave) await mounted.pendingSave.promise;
      if (mounted.failSave) throw new Error("injected disk failure");
      if (mounted.returnFailure) return { success: false };
      await flow.writeVerifiedAssistantRecord({ setItem: async (key, value) => { mounted.storage[key] = value; }, getItem: async (key) => mounted.storage[key] ?? null }, "reminder", JSON.stringify(draft));
      mounted.saved.push(structuredClone(draft)); mounted.sequence.push("save-success");
      return { success: true, masterEnabled: true, categoryEnabled: true, scheduled: true, reference: { recordId: "test-reminder", category: draft.category, label: "test" } };
    } };
    if (id.endsWith("voiceReminderService")) return {
      getVoiceRemindersEnabled: async () => mounted.voiceEnabled,
      stopAssistantResponse: async () => {},
      speakAssistantResponse: async (_, text, signal) => {
        const owner = mounted;
        if (signal?.aborted) return "stopped";
        owner.spoken.push(text);
        if (owner.saved.length && text === owner.t("assistant.savedAll", { count: 1 })) {
          owner.sequence.push("success-speech-start");
          signal?.addEventListener("abort", () => { owner.speechCancelled++; });
          if (owner.failTts) throw new Error("injected TTS failure");
          if (owner.pendingTts) await owner.pendingTts.promise;
          if (signal?.aborted) return "stopped";
          owner.sequence.push("success-speech-end");
          if (owner.errorTts) return "error";
        }
        return "spoken";
      },
    };
    if (id.endsWith("reminderPlanService")) return { loadReminderPlans: async () => [], createReminderPlan: async () => ({ id: "test-plan" }) };
    if (id.endsWith("assistantRecentReminderService")) return { loadAssistantRecentReminders: async () => [], recordAssistantRecentReminders: async () => {} };
  }
  return originalLoad.call(this, id, parent, ...rest);
};
const { HydroMateAssistantModal } = require("../components/hydromate-assistant-modal.tsx");
let fakeNow = 0, nextTimer = 0;
const timers = new Map();
const realSetTimeout = global.setTimeout, realClearTimeout = global.clearTimeout;
global.setTimeout = (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, due: fakeNow + delay }); return id; };
global.clearTimeout = (id) => timers.delete(id);
const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); render(); for (let i = 0; i < 20; i++) await Promise.resolve(); };
function render() {
  mounted.cursor = 0;
  mounted.tree = HydroMateAssistantModal({ visible: !mounted.closed, assistantSessionId: 1, userName: "Test", responseWaitSeconds: 2, wakeWordEnabled: false, onClose: () => { mounted.closed = true; mounted.sequence.push("close"); } });
  for (const effect of mounted.effects.splice(0)) effect();
}
async function mount(locale = "en") {
  timers.clear(); fakeNow = 0;
  const dictionary = require(path.join(root, "localization", `${locale}.ts`))[locale];
  mounted = { locale, hooks: [], cursor: 0, effects: [], events: {}, starts: 0, spoken: [], closed: false, sequence: [], saved: [], saveCalls: 0, storage: {}, voiceEnabled: true, speechCancelled: 0, confirmTaps: 0 };
  mounted.t = (key, params = {}) => (dictionary[key] ?? key).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
  render(); await flush();
}
async function advance(ms) {
  const end = fakeNow + ms;
  while (true) {
    const next = [...timers.entries()].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
    if (!next) break;
    fakeNow = next[1].due; timers.delete(next[0]); next[1].fn(); await flush();
  }
  fakeNow = end; await flush();
}
async function say(text) {
  mounted.events.speechstart();
  mounted.events.result({ isFinal: true, results: [{ transcript: text }] });
  await flush();
}
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
function nodes(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function confirmButton() {
  return nodes(mounted.tree).find((node) => node.type === "TouchableOpacity" &&
    nodes(node).some((child) => child.type === "Text" && child.props.children === mounted.t("assistant.confirmAll")));
}
const draft = (category = "medicine") => ({ category, medicineName: "Crocin", title: "Walk", dateSource: "none", scheduleMode: "recurring", timesPerDay: 2, durationDays: 7 });
const locales = [
  ["en", "morning", "night", "and", "OK"], ["hi", "सुबह", "रात", "और", "हाँ"],
  ["bn", "সকাল", "রাত", "ও", "ঠিক আছে"], ["mr", "सकाळी", "रात्री", "आणि", "होय"],
  ["ta", "காலை", "இரவு", "மற்றும்", "சரி"], ["te", "ఉదయం", "రాత్రి", "మరియు", "సరే"],
  ["gu", "સવારે", "રાત્રે", "અને", "હા"], ["kn", "ಬೆಳಿಗ್ಗೆ", "ರಾತ್ರಿ", "ಮತ್ತು", "ಹೌದು"],
  ["ml", "രാവിലെ", "രാത്രി", "കൂടാതെ", "ശരി"], ["pa", "ਸਵੇਰੇ", "ਰਾਤ", "ਅਤੇ", "ਹਾਂ"],
  ["bho", "सवेरे", "रात", "और", "ठीक बा"], ["bgc", "सवेरे", "रात", "और", "ठीक सै"],
];

(async () => {
  for (const [raw, expected] of [["8 AM and 8 PM", [8, 20]], ["8 A.M. and 8 P.M.", [8, 20]], ["8 a m and 8 p m", [8, 20]], ["eight AM and eight PM", [8, 20]], ["8:30 AM and 9:15 PM", [8, 21]], ["8 AM और 8 PM", [8, 20]]]) {
    const r = flow.processAssistantRuntimeTurn(raw, { draft: draft(), pendingQuestion: "recurrenceTimes", locale: "en" }).result;
    eq(r.state, "ready", raw); eq(r.draft.times.map((time) => time.hour), expected); eq(r.draft.timeSlots.filter((slot) => slot.status === "unresolved").length, 0);
  }
  eq(normalizer.normalizeAssistantTranscript("8 A.M. and 8 P.M.").normalizedTranscript, "8 am and 8 pm");
  const three = flow.processAssistantRuntimeTurn("8 am, 2 pm and 8 pm", { draft: { ...draft(), timesPerDay: 3 }, pendingQuestion: "recurrenceTimes", locale: "en" }).result;
  eq(three.state, "ready"); eq(three.draft.times.map((time) => time.hour), [8, 14, 20]);
  const stale = { ...draft(), times: [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }], timeSlots: [{ index: 0, hour: 8, minute: 0, status: "unresolved" }], ambiguousHour: 8 };
  const reconciled = flow.reconcileAssistantRuntimeResult({ state: "question", question: "timePeriod", draft: stale });
  eq(reconciled.state, "ready"); eq(reconciled.draft.ambiguousHour, undefined); eq(reconciled.draft.timeSlots.length, 2);
  const previous = { ...draft(), timeSlots: [{ index: 0, hour: 8, minute: 0, resolvedHour: 8, status: "resolved" }, { index: 1, hour: 9, minute: 0, status: "unresolved" }] };
  const regressed = flow.reconcileAssistantRuntimeResult({ state: "question", question: "timePeriod", draft: { ...previous, timeSlots: previous.timeSlots.map((slot) => ({ ...slot, status: "unresolved", resolvedHour: undefined })) } }, previous);
  eq(regressed.draft.timeSlots[0].status, "resolved"); eq(regressed.draft.ambiguousHour, 9);

  for (const [locale, morning, night, and, affirmative] of locales) {
    for (const category of ["medicine", "custom"]) {
      const explicit = flow.processAssistantRuntimeTurn(`${morning} 7 ${and} ${night} 8`, { draft: draft(category), pendingQuestion: "recurrenceTimes", locale }).result;
      eq(explicit.state, "ready", `${locale} ${category}`);
      eq(explicit.draft.times.map((time) => time.hour), [7, 20]);
    }
    let result = flow.processAssistantRuntimeTurn("7", { draft: { ...draft(), timesPerDay: 1 }, pendingQuestion: "time", locale }).result;
    eq(result.question, "timePeriod");
    result = flow.processAssistantRuntimeTurn(morning, { draft: result.draft, pendingQuestion: result.question, locale }).result;
    eq(result.state, "ready");
    eq(flow.processAssistantRuntimeTurn(morning, { draft: result.draft, pendingQuestion: "timePeriod", locale }).result.state, "ready");
    // Real modal + real speech hook + mocked platform and persistence.
    await mount(locale);
    await say("medicine Crocin at 7 AM twice a day for 7 days");
    await say(`${morning} 7 ${and} ${night} 8`);
    ok(mounted.spoken.at(-1).includes(mounted.t("assistant.question.confirmation", { summary: "" }).trim().split(" ").at(-1)), `${locale} confirmation spoken`);
    eq(mounted.closed, false);
    await advance(3000);
    await say(affirmative);
    eq(mounted.saveCalls, 1, `${locale} affirmative reaches actual modal save`);
    eq(mounted.confirmTaps, 0, `${locale} voice needs zero taps`);
    eq(mounted.closed, true, `${locale} auto-close`);
    eq(nodes(mounted.tree).find((node) => node.type === "Modal").props.visible, false, `${locale} modal actually hidden`);
    eq(Boolean(confirmButton()), false, `${locale} no pending confirmation after save`);
    eq(mounted.saved[0].times.map((time) => time.hour), [7, 20]);
    eq(mounted.sequence, ["save-start", "save-success", "success-speech-start", "success-speech-end", "close"], `${locale} verified persistence then success TTS then close`);
  }

  await mount(); await say("medicine Crocin at 7 AM twice a day for 7 days");
  const before = mounted.spoken.length;
  await say("8 AM and 8 PM");
  eq(mounted.spoken.slice(before).some((text) => /AM or PM/.test(text)), false, "exact English transcript never asks AM/PM in real modal");
  await advance(3000);
  mounted.pendingSave = deferred(); mounted.pendingTts = deferred();
  await say("OK");
  eq(mounted.closed, false); eq(mounted.saveCalls, 1);
  mounted.events.error({ error: "aborted" }); await advance(30000);
  eq(mounted.closed, false, "abort and overdue timers cannot close while save awaits");
  await say("OK"); eq(mounted.saveCalls, 1, "duplicate accept blocked during save");
  mounted.pendingSave.resolve(); await flush(); eq(mounted.closed, false, "success speech awaited");
  mounted.pendingTts.resolve(); await flush(); eq(mounted.closed, true);

  for (const mode of ["disabled", "throw", "error", "missing"]) {
    await mount(); await say("medicine Crocin at 7 AM twice a day for 7 days"); await say("8 AM and 8 PM");
    mounted.voiceEnabled = mode !== "disabled";
    mounted.failTts = mode === "throw"; mounted.errorTts = mode === "error";
    if (mode === "missing") mounted.pendingTts = deferred();
    await say("OK");
    eq(mounted.saveCalls, 1); eq(mounted.confirmTaps, 0);
    if (mode === "missing") {
      await advance(timing.ASSISTANT_SUCCESS_SPEECH_FALLBACK_MILLIS - 1);
      eq(mounted.closed, false, "wait for actual TTS completion until bounded deadline");
      await advance(1);
      eq(mounted.speechCancelled, 1, "fallback cancels only success speech");
      mounted.pendingTts.resolve(); await flush();
      eq(mounted.sequence.filter((event) => event === "close").length, 1, "late TTS cannot close twice");
    }
    eq(mounted.closed, true, `${mode} TTS still auto-closes after save`);
    eq(nodes(mounted.tree).find((node) => node.type === "Modal").props.visible, false);
    eq(Boolean(confirmButton()), false);
  }
  for (const first of ["voice", "tap"]) {
    await mount(); await say("medicine Crocin at 7 AM twice a day for 7 days"); await say("8 AM and 8 PM");
    const button = confirmButton(); ok(button, "manual fallback remains available");
    mounted.pendingSave = deferred();
    const tap = () => { mounted.confirmTaps++; button.props.onPress(); };
    if (first === "voice") { await say("OK"); tap(); }
    else { tap(); await say("OK"); }
    await flush();
    eq(nodes(mounted.tree).find((node) => node.type === "TouchableOpacity" && node.props.style === button.props.style).props.disabled, true);
    eq(mounted.saveCalls, 1, `${first} then racing confirmation saves once`);
    mounted.pendingSave.resolve(); await flush();
    eq(mounted.closed, true); eq(mounted.saved.length, 1);
  }

  for (const form of ["8 A.M. and 8 P.M.", "8 a m and 8 p m", "eight AM and eight PM", "8:30 AM and 9:15 PM"]) {
    await mount(); await say("medicine Crocin at 7 AM twice a day for 7 days");
    const beforeForm = mounted.spoken.length;
    await say(form); render(); render(); await flush();
    eq(mounted.spoken.slice(beforeForm).some((text) => /AM or PM/.test(text)), false, `real modal Samsung form: ${form}`);
    await say("OK"); eq(mounted.saveCalls, 1); eq(mounted.closed, true);
    if (form.includes(":")) eq(mounted.saved[0].times, [{ hour: 8, minute: 30 }, { hour: 21, minute: 15 }]);
  }

  await mount(); await say("medicine Crocin at 7 AM twice a day for 7 days");
  await say("8 AM and 9");
  eq(mounted.spoken.at(-1), mounted.t("assistant.question.timePeriodSlot", { time: "9:00" }));
  await say("PM"); await say("OK"); eq(mounted.saved[0].times.map((time) => time.hour), [8, 21]);
  await mount("hi"); await say("medicine Crocin twice a day for 7 days");
  await say("7 बजे और 8 बजे"); eq(mounted.spoken.at(-1), mounted.t("assistant.question.timePeriodSlot", { time: "7:00" }));
  await say("सुबह"); eq(mounted.spoken.at(-1), mounted.t("assistant.question.timePeriodSlot", { time: "8:00" }));
  await say("रात"); await say("ठीक है"); eq(mounted.saved[0].times.map((time) => time.hour), [7, 20]);
  await mount(); await say("routine Walk twice a day for 7 days");
  await say("7 and 8"); eq(mounted.spoken.at(-1), mounted.t("assistant.question.timePeriodSlot", { time: "7:00" }));
  await say("AM"); eq(mounted.spoken.at(-1), mounted.t("assistant.question.timePeriodSlot", { time: "8:00" }));
  await say("PM"); await say("OK"); eq(mounted.saved[0].times.map((time) => time.hour), [7, 20]);

  await mount(); await say("medicine Crocin");
  await advance(8249); eq(mounted.closed, false);
  await advance(1); eq(mounted.closed, false); ok(mounted.spoken.at(-1).startsWith("I'm still listening."));
  await advance(8249); eq(mounted.closed, false); await advance(1); eq(mounted.closed, true, "only second full silence cycle closes");
  await mount(); await say("medicine Crocin");
  mounted.events.speechstart(); await advance(40000); eq(mounted.closed, false, "speech active defeats both deadlines");
  mounted.events.result({ isFinal: false, results: [{ transcript: "8 AM" }] });
  mounted.events.speechend(); await advance(2500); eq(mounted.closed, false, "interim delivered instead of no-response close");

  await mount(); await say("medicine Crocin at 7 AM twice a day for 7 days"); await say("8 AM and 8 PM");
  const starts = mounted.starts;
  mounted.events.error({ error: "no-speech" }); mounted.events.end(); await flush();
  eq(mounted.starts, starts + 1, "early Samsung silence resumes within original deadline");
  await advance(3000); await say("OK"); eq(mounted.saved.length, 1);

  await mount(); await say("medicine Crocin at 7 AM twice a day for 7 days"); await say("8 AM and 8 PM");
  mounted.failSave = true; await say("OK");
  eq(mounted.closed, false); eq(mounted.saved.length, 0); ok(mounted.spoken.includes(mounted.t("assistant.saveError")));
  mounted.failSave = false; await say("OK"); eq(mounted.saved.length, 1); eq(mounted.closed, true);
  await mount(); await say("medicine Crocin at 7 AM twice a day for 7 days"); await say("8 AM and 8 PM");
  mounted.returnFailure = true; await say("OK"); eq(mounted.closed, false); eq(mounted.saved.length, 0);
  mounted.returnFailure = false;
  mounted.events.speechstart();
  mounted.events.result({ isFinal: false, results: [{ transcript: "OK" }] });
  mounted.events.error({ error: "no-speech" }); await flush();
  eq(mounted.saved.length, 1, "interim confirmation survives recognition error"); eq(mounted.closed, true);

  const blocked = flow.nextAssistantSilenceAction({ activeReminder: true, timeoutCycle: 1, saving: false, currentCallback: false, userSpeechActive: false, responded: false });
  eq(blocked.action, "ignore", "stale timeout cannot count as second no-response");
  for (const reason of ["speechend", "stale-timeout", "stt-restart", "expected-abort", "old-turn", "old-session", "recognition-error"]) {
    eq(flow.canCloseAssistant(reason, { activeReminder: true, saving: false, persistenceVerified: false, timeoutCycle: 0, userSpeechActive: false }), false);
  }

  await assert.rejects(flow.writeVerifiedAssistantRecord({ setItem: async () => {}, getItem: async () => null }, "test", "saved")); assertions++;
  const ledger = flow.createAssistantSaveLedger(); eq(flow.claimAssistantSave(ledger), true);
  await assert.rejects(flow.finishAssistantConfirmation(ledger, { speakSuccess: async () => { throw new Error("must not speak"); }, clearDraft: () => assert.fail("unverified clear"), close: () => assert.fail("unverified close") })); assertions++;
  eq(flow.canCloseAssistant("reminder-save-success", { activeReminder: true, saving: true, persistenceVerified: false, timeoutCycle: 0, userSpeechActive: false }), false);
  eq(flow.canCloseAssistant("reminder-save-success", { activeReminder: true, saving: true, persistenceVerified: true, timeoutCycle: 0, userSpeechActive: false }), true);
  let calls = 0, fail = true;
  const persist = async () => { calls++; if (calls === 2 && fail) throw new Error("second failed"); return { success: true, reference: { recordId: String(calls) } }; };
  await assert.rejects(flow.persistAssistantConfirmation(ledger, [draft(), draft()], persist)); assertions++;
  ledger.inProgress = false; fail = false; flow.claimAssistantSave(ledger);
  await flow.persistAssistantConfirmation(ledger, [draft(), draft()], persist); eq(calls, 3, "retry retains previously verified item");
  for (const reason of ["manual", "initial-silence-timeout", "recognition-error", "expected-abort", "old-turn", "old-session"]) {
    eq(flow.canCloseAssistant(reason, { activeReminder: true, saving: true, persistenceVerified: false, timeoutCycle: 2, userSpeechActive: false }), false);
  }
  eq(timing.getAssistantTurnResponseWaitMillis(2000, false, true), 7000);
  eq(timing.getAssistantTurnResponseWaitMillis(2000, true, true), 10000);
  eq(timing.getAssistantTurnResponseWaitMillis(2000, false, false), 2000);
  // Exercise the real TTS wrapper: cancellation must free its busy flag even
  // without a platform onStopped event, and must prevent a late lookup speaking.
  const voice = require("../services/voiceReminderService.ts");
  voicePlatform = { calls: 0, stops: 0 };
  let abort = new AbortController();
  const missingCallback = voice.speakAssistantResponse("en", "Saved", abort.signal);
  await flush(); eq(voicePlatform.calls, 1);
  abort.abort(); eq(await missingCallback, "stopped"); eq(voicePlatform.stops, 1);
  const nextSpeech = voice.speakAssistantResponse("en", "Next session");
  await flush(); eq(voicePlatform.calls, 2, "busy state released without native callback");
  voicePlatform.callbacks.onDone(); eq(await nextSpeech, "spoken");
  voicePlatform.lookup = deferred(); abort = new AbortController();
  const delayedLookup = voice.speakAssistantResponse("en", "Old saved message", abort.signal);
  abort.abort(); voicePlatform.lookup.resolve([{ identifier: "test", language: "en-US" }]);
  eq(await delayedLookup, "stopped"); eq(voicePlatform.calls, 2, "late lookup cannot start cancelled success speech");

  // Actual visibility owner, not just the modal's mocked onClose callback.
  const { useHydroMateAssistant } = require("../hooks/useHydroMateAssistant.ts");
  const modalOwner = mounted;
  mounted = { hooks: [], cursor: 0, effects: [] };
  const ownerRender = () => { mounted.cursor = 0; return useHydroMateAssistant(); };
  ownerRender().startHydroMateAssistant();
  eq(ownerRender().assistantVisible, true);
  ownerRender().closeHydroMateAssistant();
  eq(ownerRender().assistantVisible, false, "canonical onClose owner hides assistant");
  mounted = modalOwner;
  for (const [locale] of locales) {
    const dictionary = require(path.join(root, "localization", `${locale}.ts`))[locale];
    for (const [key, placeholders] of [["assistant.stillListening", ["question"]], ["assistant.question.timePeriodSlot", ["time"]], ["assistant.saveError", []]]) {
      eq([...dictionary[key].matchAll(/\{(\w+)\}/g)].map((match) => match[1]), placeholders, `${locale}:${key}`);
    }
  }
  console.log(`Assistant runtime-flow passed: ${assertions} assertions; actual modal and speech hook, 12-language save-before-close, explicit/mixed/bare times, delayed OK, first-timeout reprompt, early Samsung end, deferred/failed saves, retry deduplication, close protection and localization.`);
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  Module._load = originalLoad; global.setTimeout = realSetTimeout; global.clearTimeout = realClearTimeout;
});
