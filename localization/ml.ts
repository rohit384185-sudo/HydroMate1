import type { TranslationKey } from "./en";
import { hi } from "./hi";

export const ml: Record<TranslationKey, string> = {
  ...hi,
  "tabs.settings": "ക്രമീകരണങ്ങൾ",
  "settings.title": "ക്രമീകരണങ്ങൾ",
  "settings.voiceWakeWord": "ശബ്ദവും വേക്ക് വേഡും",
  "settings.languageVoice": "ഭാഷയും ശബ്ദവും",
  "settings.reminderCategorySummary": "{total} റിമൈൻഡർ വിഭാഗങ്ങളിൽ {enabled} പ്രവർത്തനക്ഷമമാണ്",
  "settings.stateOn": "ഓൺ",
  "settings.stateOff": "ഓഫ്",
  "settings.profileName": "പേര്",
  "settings.profilePhone": "ഫോൺ നമ്പർ",
  "settings.profileAge": "പ്രായം", "settings.profileGender": "ലിംഗം", "settings.profileWeight": "ഭാരം", "settings.notSet": "സജ്ജമാക്കിയിട്ടില്ല", "settings.kilograms": "{amount} കിലോ",
  "settings.logout": "ലോഗ് ഔട്ട്", "settings.logoutConfirmTitle": "ലോഗ് ഔട്ട് ചെയ്യണോ?", "settings.logoutConfirmMessage": "നിങ്ങൾ ആരംഭ സ്ക്രീനിലേക്ക് മടങ്ങും. ഓർമ്മപ്പെടുത്തലുകൾ, ചരിത്രം, മുൻഗണനകൾ, പ്രാദേശിക ശബ്ദ ഡാറ്റ എന്നിവ ഈ ഉപകരണത്തിൽ തുടരും.", "settings.logoutErrorTitle": "ലോഗ് ഔട്ട് ചെയ്യാനായില്ല", "settings.logoutErrorMessage": "വീണ്ടും ശ്രമിക്കുക.",
  "settings.resetProfile": "പ്രൊഫൈൽ റീസെറ്റ് ചെയ്യുക", "settings.resetProfileConfirmTitle": "പ്രൊഫൈൽ റീസെറ്റ് ചെയ്യണോ?", "settings.resetProfileConfirmMessage": "സംരക്ഷിച്ച പേര്, പ്രായം, ലിംഗം, ഭാരം എന്നിവ നീക്കും. ഓർമ്മപ്പെടുത്തലുകൾ, വെള്ള ചരിത്രം, മുൻഗണനകൾ, ശബ്ദ ഡാറ്റ എന്നിവ നീക്കില്ല.",
  "profile.phoneReadOnly": "സൈൻ-ഇൻ ഫോൺ അക്കൗണ്ട് നിയന്ത്രിക്കുന്നത്", "profile.optionalFields": "പ്രായം, ലിംഗം, ഭാരം എന്നിവ ഐച്ഛികമാണ്.", "profile.agePlaceholder": "ഐച്ഛികം, 1–120", "profile.ageError": "1 മുതൽ 120 വരെ പൂർണ്ണസംഖ്യയിൽ പ്രായം നൽകുക അല്ലെങ്കിൽ ഒഴിച്ചിടുക.", "profile.genderMale": "പുരുഷൻ", "profile.genderFemale": "സ്ത്രീ", "profile.genderPreferNotToSay": "പറയാൻ താൽപ്പര്യമില്ല", "profile.weightPlaceholder": "ഐച്ഛികം, 20–300", "profile.weightError": "20 മുതൽ 300 കിലോ വരെ ഭാരം നൽകുക അല്ലെങ്കിൽ ഒഴിച്ചിടുക.",
  "settings.dailyWaterGoal": "ദൈനംദിന ജലലക്ഷ്യം",
  "settings.milliliters": "{amount} മി.ലി.",
  "settings.wakeWordPrivacyTitle": "വേക്ക് വേഡ് സ്വകാര്യത",
  "settings.wakeWordPrivacyText": "HydroMate കേൾക്കുമ്പോൾ വേക്ക്-വേഡ് കണ്ടെത്തൽ ഈ ഉപകരണത്തിൽ തന്നെ പ്രാദേശികമായി പ്രോസസ്സ് ചെയ്യുന്നു.",
  "settings.speakerProfileTitle": "സ്പീക്കർ വോയ്സ് പ്രൊഫൈൽ",
  "settings.speakerProfileText": "നിങ്ങളുടെ എൻറോൾ ചെയ്ത വോയ്സ് സാമ്പിളുകളും വോയ്സ് പ്രൊഫൈലും ഈ ഉപകരണത്തിൽ തന്നെ തുടരും.",
  "settings.deleteVoiceProfile": "വോയ്സ് പ്രൊഫൈൽ ഇല്ലാതാക്കുക",
  "settings.deleteVoiceProfileConfirmTitle": "വോയ്സ് പ്രൊഫൈൽ ഇല്ലാതാക്കണോ?",
  "settings.deleteVoiceProfileConfirmMessage": "ഇത് വോയ്സ് സാമ്പിളുകൾ നീക്കി ഉടമ-മാത്രം തിരിച്ചറിയൽ ഓഫ് ചെയ്യും.",
  "settings.voiceProfileDeleted": "വോയ്സ് പ്രൊഫൈൽ ഇല്ലാതാക്കി.",
  "settings.clearWakeDebugRecordings": "വേക്ക് ഡീബഗ് റെക്കോർഡിംഗുകൾ മായ്ക്കുക",
  "settings.debugRecordingsClearedTitle": "ഡീബഗ് റെക്കോർഡിംഗുകൾ മായ്ച്ചു",
  "settings.debugRecordingsClearedMessage": "{count} വേക്ക് ഡീബഗ് റെക്കോർഡിംഗുകൾ നീക്കി.",
  "settings.appInformation": "ആപ്പ് വിവരം",
  "settings.versionValue": "പതിപ്പ് {version}",
  "settings.buildValue": "ബിൽഡ് {build}",
  "settings.updateErrorTitle": "ക്രമീകരണം പുതുക്കാനായില്ല",
  "settings.updateErrorMessage": "വീണ്ടും ശ്രമിക്കുക.",
  "speakerVerification.title": "എന്റെ ശബ്ദം മാത്രം തിരിച്ചറിയുക",
  "speakerVerification.sensitivity": "ശബ്ദ പൊരുത്ത സംവേദനക്ഷമത", "speakerVerification.sensitivity.lenient": "ഇളവുള്ള", "speakerVerification.sensitivity.balanced": "സമതുലിതം", "speakerVerification.sensitivity.strict": "കർശനം",
  "speakerVerification.off": "ഓഫ്",
  "speakerVerification.setupRequired": "ശബ്ദ സജ്ജീകരണം ആവശ്യമാണ്",
  "speakerVerification.ready": "തയ്യാർ",
  "speakerVerification.setup": "എന്റെ ശബ്ദം സജ്ജീകരിക്കുക",
  "speakerVerification.rerecord": "എന്റെ ശബ്ദം വീണ്ടും റെക്കോർഡ് ചെയ്യുക",
  "speakerVerification.privacy": "നിങ്ങളുടെ വോയ്സ് പ്രൊഫൈൽ ഈ ഉപകരണത്തിൽ തന്നെ തുടരും.",
  "speakerVerification.setupTitle": "എന്റെ ശബ്ദം സജ്ജീകരിക്കുക",
  "speakerVerification.setupExplanation":
    "ഈ ഉപകരണത്തിൽ നിങ്ങളുടെ ശബ്ദം തിരിച്ചറിയാൻ വോയ്സ് സജ്ജീകരണം 'Hey HydroMate' ന്റെ കുറച്ച് മാതൃകകൾ റെക്കോർഡ് ചെയ്യും.",
  "speakerVerification.continue": "തുടരുക",
  "speakerVerification.nextStep": "വോയ്സ് എൻറോൾമെന്റ് അടുത്ത ഘട്ടത്തിൽ ചേർക്കും.",
  "speakerVerification.enrollmentInstruction": "'Hey HydroMate' സ്വാഭാവികമായി 5 തവണ പറയുക.",
  "speakerVerification.sampleProgress": "സാമ്പിൾ {current} / {total}",
  "speakerVerification.listening": "കേൾക്കുന്നു...",
  "speakerVerification.sampleRecorded": "സാമ്പിൾ റെക്കോർഡ് ചെയ്തു",
  "speakerVerification.readyToRecord": "റെക്കോർഡ് ചെയ്യാൻ തയ്യാറാണ്",
  "speakerVerification.record": "റെക്കോർഡ് ചെയ്യുക",
  "speakerVerification.tryAgain": "വീണ്ടും ശ്രമിക്കുക",
  "speakerVerification.useSample": "ഈ സാമ്പിൾ ഉപയോഗിക്കുക",
  "speakerVerification.errorTitle": "വോയ്സ് സജ്ജീകരണം തുടരാനായില്ല",
  "speakerVerification.errorMessage": "നിലവിലുള്ള വോയ്സ് പ്രൊഫൈൽ മാറ്റിയിട്ടില്ല. വീണ്ടും ശ്രമിക്കുക.",
  "speakerVerification.completeTitle": "വോയ്സ് സജ്ജീകരണം പൂർത്തിയായി",
  "speakerVerification.completeMessage": "നിങ്ങളുടെ അഞ്ച് വോയ്സ് സാമ്പിളുകൾ ഈ ഉപകരണത്തിൽ സൂക്ഷിച്ചു.",
  "settings.reminderControls": "റിമൈൻഡർ നിയന്ത്രണങ്ങൾ",
  "settings.profile": "പ്രൊഫൈൽ",
  "settings.privacy": "സ്വകാര്യത",
  "settings.feedback": "അഭിപ്രായം",
  "voice.waterSpeechAmount": "ഇപ്പോൾ {amount} മില്ലിലിറ്റർ വെള്ളം കുടിക്കാനുള്ള സമയമാണ്.",
  "voice.medicineLockedSpeech": "നിങ്ങളുടെ മരുന്ന് കഴിക്കാനുള്ള സമയമായി.",
  "voice.birthdayLockedSpeech": "ഇന്ന് നിങ്ങൾക്ക് ഒരു ജന്മദിന ഓർമ്മപ്പെടുത്തലുണ്ട്.",
  "voice.anniversaryLockedSpeech": "ഇന്ന് നിങ്ങൾക്ക് ഒരു വാർഷിക ഓർമ്മപ്പെടുത്തലുണ്ട്.",
  "voice.customLockedSpeech": "നിങ്ങൾക്ക് ഒരു ഓർമ്മപ്പെടുത്തലുണ്ട്.",
  "common.edit": "തിരുത്തുക",
  "common.cancelEdit": "തിരുത്തൽ റദ്ദാക്കുക",
  "reminders.editingExisting": "സൂക്ഷിച്ച ഓർമ്മപ്പെടുത്തൽ തിരുത്തുന്നു",
  "reminders.updateMedicine": "മരുന്ന് പുതുക്കുക",
  "reminders.updateBirthday": "ജന്മദിനം പുതുക്കുക",
  "reminders.updateAnniversary": "വാർഷികം പുതുക്കുക",
  "reminders.updateCustom": "ഓർമ്മപ്പെടുത്തൽ പുതുക്കുക",
  "reminders.masterTitle": "പ്രധാന ഓർമ്മപ്പെടുത്തൽ",
  "reminders.masterControlsAll": "എല്ലാ ഓർമ്മപ്പെടുത്തലുകളും നിയന്ത്രിക്കുന്നു",
  "reminders.enableWaterReminders": "വെള്ളം കുടിക്കാനുള്ള ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ ചെയ്യുക",
  "reminders.enableMedicineReminders": "മരുന്ന് ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ ചെയ്യുക",
  "reminders.enableBirthdayReminders": "ജന്മദിന ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ ചെയ്യുക",
  "reminders.enableAnniversaryReminders": "വാർഷിക ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ ചെയ്യുക",
  "reminders.enableCustomReminders": "ഇഷ്ടാനുസൃത ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ ചെയ്യുക",
  "reminders.saveWaterSettings": "വെള്ളത്തിന്റെ ക്രമീകരണങ്ങൾ സംരക്ഷിക്കുക",
  "reminders.waterSettingsSaved": "വെള്ളം കുടിക്കാനുള്ള ഓർമ്മപ്പെടുത്തൽ ക്രമീകരണങ്ങൾ സംരക്ഷിച്ചു.",
  "tabs.home":"ഹോം", "tabs.reminders":"ഓർമ്മപ്പെടുത്തലുകൾ", "common.notAvailable":"ലഭ്യമല്ല", "common.remove":"നീക്കുക", "common.cancel":"റദ്ദാക്കുക", "common.done":"പൂർത്തിയായി",
  "home.loading":"HydroMate ലോഡ് ചെയ്യുന്നു...", "home.welcome":"HydroMate-ലേക്ക് സ്വാഗതം", "home.enterName":"തുടരാൻ നിങ്ങളുടെ പേര് നൽകുക", "home.yourName":"നിങ്ങളുടെ പേര്", "home.continue":"തുടരുക", "home.phoneLater":"ഫോൺ പിന്നീട് ചേർത്ത് സ്ഥിരീകരിക്കാം.", "home.goodMorning":"സുപ്രഭാതം", "home.goodAfternoon":"ശുഭ ഉച്ച", "home.goodEvening":"ശുഭ സായാഹ്നം", "home.editProfile":"പ്രൊഫൈൽ തിരുത്തുക", "home.language":"ഭാഷ", "home.selectLanguage":"ഭാഷ തിരഞ്ഞെടുക്കുക", "home.tagline":"വെള്ളം കുടിക്കൂ, ആരോഗ്യത്തോടെ ഇരിക്കൂ.", "home.todaysWater":"ഇന്നത്തെ വെള്ളം", "home.dailyHistory":"ദൈനംദിന വെള്ള ചരിത്രം", "home.sevenDayAverage":"7 ദിവസത്തെ ശരാശരി: {amount} ml", "home.goalAchieved":"ലക്ഷ്യം നേടി: {achieved} / {total} ദിവസം", "home.currentStreak":"നിലവിലെ തുടർച്ച: {count} {days} 🔥", "home.bestStreak":"മികച്ച തുടർച്ച: {count} {days} 🏆", "home.weeklyProgress":"ആഴ്ച പുരോഗതി: {total}-ൽ {count} ലക്ഷ്യ {days}", "home.day":"ദിവസം", "home.days":"ദിവസങ്ങൾ", "home.noHistory":"ഇതുവരെ ചരിത്രമില്ല", "home.percentOfGoal":"ലക്ഷ്യത്തിന്റെ {percent}%", "home.percentOfTodaysGoal":"ഇന്നത്തെ ലക്ഷ്യത്തിന്റെ {percent}%", "home.nextReminder":"അടുത്ത ഓർമ്മപ്പെടുത്തൽ", "home.mode":"മോഡ്: {mode}", "home.smart":"സ്മാർട്ട്", "home.fixed":"നിശ്ചിത", "home.addWater":"വെള്ളം ചേർക്കുക", "home.custom":"കസ്റ്റം", "home.customWaterPlaceholder":"വെള്ളത്തിന്റെ അളവ് ml-ൽ നൽകുക", "home.invalidWater":"ശരിയായ വെള്ളത്തിന്റെ അളവ് നൽകുക", "home.undoLastWater":"↩ അവസാന {amount} ml പഴയപടിയാക്കുക", "home.todaysStatus":"ഇന്നത്തെ നില", "home.goalCompleted":"🎉 ദൈനംദിന ലക്ഷ്യം പൂർത്തിയായി!", "home.litersRemaining":"{amount} L ബാക്കി", "home.footer":"ഓരോ കുടിയും പ്രധാനമാണ് 💙",
  "feedback.rowTitle":"അഭിപ്രായം അയയ്ക്കുക", "feedback.modalTitle":"ബീറ്റ അഭിപ്രായം", "feedback.typeLabel":"അഭിപ്രായ തരം", "feedback.bug":"പിശക്", "feedback.suggestion":"നിർദ്ദേശം", "feedback.other":"മറ്റുള്ളവ", "feedback.messagePlaceholder":"എന്താണ് സംഭവിച്ചത് അല്ലെങ്കിൽ എന്ത് മെച്ചപ്പെടുത്തണം എന്ന് പറയുക", "feedback.submit":"സമർപ്പിക്കുക", "feedback.submitting":"സമർപ്പിക്കുന്നു...", "feedback.requiredTitle":"അഭിപ്രായം ആവശ്യമാണ്", "feedback.requiredMessage":"സമർപ്പിക്കുന്നതിന് മുമ്പ് അഭിപ്രായം നൽകുക.", "feedback.thankYou":"നിങ്ങളുടെ അഭിപ്രായത്തിന് നന്ദി.", "feedback.shareFeedback":"അഭിപ്രായം പങ്കിടുക", "feedback.history":"അഭിപ്രായ ചരിത്രം", "feedback.detailsTitle":"അഭിപ്രായ വിശദാംശങ്ങൾ", "feedback.back":"പിന്നോട്ട്", "feedback.clearHistory":"അഭിപ്രായ ചരിത്രം മായ്ക്കുക", "feedback.clear":"മായ്ക്കുക", "feedback.languageEnglish":"ഇംഗ്ലീഷ്", "feedback.languageHindi":"ഹിന്ദി",
  "voice.rowTitle":"ശബ്ദ ഓർമ്മപ്പെടുത്തലുകൾ", "voice.on":"ഓൺ", "voice.off":"ഓഫ്", "voice.modalTitle":"ശബ്ദ ഓർമ്മപ്പെടുത്തലുകൾ", "voice.enabledLabel":"ശബ്ദ ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ/ഓഫ്", "voice.currentLanguage":"നിലവിലെ ഭാഷ", "voice.languageEnglish":"ഇംഗ്ലീഷ്", "voice.languageHindi":"ഹിന്ദി", "voice.voiceSelection":"ശബ്ദം", "voice.systemDefault":"സിസ്റ്റം ഡിഫോൾട്ട്", "voice.loadingVoices":"ഇൻസ്റ്റാൾ ചെയ്ത ശബ്ദങ്ങൾ ലോഡ് ചെയ്യുന്നു...", "voice.noCompatibleVoices":"അനുയോജ്യമായ ഇൻസ്റ്റാൾ ചെയ്ത ശബ്ദം കണ്ടെത്തിയില്ല.", "voice.testVoice":"ശബ്ദം പരീക്ഷിക്കുക", "voice.testingVoice":"ശബ്ദം പരീക്ഷിക്കുന്നു...", "voice.openOnlyInfo":"HydroMate തുറന്നിരിക്കുമ്പോൾ മാത്രം ശബ്ദ ഓർമ്മപ്പെടുത്തലുകൾ പ്രവർത്തിക്കും. സാധാരണ അറിയിപ്പ് ശബ്ദം തുടരും.", "voice.waterSpeech":"വെള്ളം കുടിക്കാനുള്ള സമയമായി.", "voice.medicineSpeech":"{name} കഴിക്കാനുള്ള സമയമായി.", "voice.customSpeech":"ഓർമ്മപ്പെടുത്തൽ: {message}", "voice.birthdaySpeech":"ഇന്ന് {name}യുടെ ജന്മദിനമാണ്.", "voice.anniversarySpeech":"ഇന്ന് {name}യുടെ വാർഷികമാണ്.", "voice.unavailableTitle":"ശബ്ദം ലഭ്യമല്ല", "voice.unavailableMessage":"നിലവിലെ ഭാഷയ്ക്ക് അനുയോജ്യമായ ശബ്ദം ഇൻസ്റ്റാൾ ചെയ്തിട്ടില്ല. സാധാരണ അറിയിപ്പ് ശബ്ദം തുടരും.",
  "reminders.title":"💧 ഓർമ്മപ്പെടുത്തൽ ക്രമീകരണങ്ങൾ", "reminders.subtitle":"HydroMate എപ്പോൾ ഓർമ്മിപ്പിക്കണമെന്ന് തിരഞ്ഞെടുക്കുക.", "reminders.type":"ഓർമ്മപ്പെടുത്തൽ തരം", "reminders.water":"വെള്ളം", "reminders.medicine":"മരുന്ന്", "reminders.birthday":"ജന്മദിനം", "reminders.anniversary":"വാർഷികം", "reminders.custom":"കസ്റ്റം", "reminders.birthdayName":"ജന്മദിന പേര്", "reminders.birthdayDate":"ജനന തീയതി", "reminders.savedBirthdays":"സൂക്ഷിച്ച ജന്മദിനങ്ങൾ", "reminders.reminderTime":"ഓർമ്മപ്പെടുത്തൽ സമയം", "reminders.addBirthday":"🎂 ജന്മദിനം ചേർക്കുക", "reminders.anniversaryName":"വാർഷികത്തിന്റെ പേര്", "reminders.anniversaryDate":"വാർഷിക തീയതി", "reminders.addAnniversary":"💍 വാർഷികം ചേർക്കുക", "reminders.savedAnniversaries":"സൂക്ഷിച്ച വാർഷികങ്ങൾ", "reminders.customName":"കസ്റ്റം ഓർമ്മപ്പെടുത്തൽ പേര്", "reminders.reminderDate":"ഓർമ്മപ്പെടുത്തൽ തീയതി", "reminders.addCustom":"📝 കസ്റ്റം ഓർമ്മപ്പെടുത്തൽ ചേർക്കുക", "reminders.savedCustom":"സൂക്ഷിച്ച കസ്റ്റം ഓർമ്മപ്പെടുത്തലുകൾ", "reminders.healthType":"ആരോഗ്യ ഓർമ്മപ്പെടുത്തൽ തരം", "reminders.tablet":"💊 ഗുളിക", "reminders.cream":"🧴 ക്രീം", "reminders.drops":"💧 തുള്ളികൾ", "reminders.injection":"💉 ഇഞ്ചക്ഷൻ", "reminders.other":"🩹 മറ്റുള്ളവ", "reminders.medicineName":"മരുന്നിന്റെ പേര്", "reminders.addTime":"+ സമയം ചേർക്കുക", "reminders.selectTime":"ഓർമ്മപ്പെടുത്തൽ സമയം തിരഞ്ഞെടുക്കുക", "reminders.hour":"മണിക്കൂർ", "reminders.minutes":"മിനിറ്റുകൾ", "reminders.minute":"മിനിറ്റ്", "reminders.customMinute":"കസ്റ്റം", "reminders.selectCustomTime":"കസ്റ്റം സമയം തിരഞ്ഞെടുക്കുക", "reminders.useTime":"ഈ സമയം ഉപയോഗിക്കുക", "reminders.addMedicine":"💊 മരുന്ന് ചേർക്കുക", "reminders.mode":"ഓർമ്മപ്പെടുത്തൽ മോഡ്", "reminders.on":"ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ", "reminders.off":"ഓർമ്മപ്പെടുത്തലുകൾ ഓഫ്", "reminders.allOff":"എല്ലാ ഓർമ്മപ്പെടുത്തലുകളും ഓഫ് ആണ്", "reminders.savedOn":"സൂക്ഷിച്ച ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ ആണ്", "reminders.statusOn":"✅ ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ", "reminders.statusOff":"⛔ ഓർമ്മപ്പെടുത്തലുകൾ ഓഫ്", "reminders.smartSchedule":"⭐ സ്മാർട്ട് ഷെഡ്യൂൾ", "reminders.fixedInterval":"⏰ നിശ്ചിത ഇടവേള", "reminders.smartSchedulePlain":"സ്മാർട്ട് ഷെഡ്യൂൾ", "reminders.fixedIntervalPlain":"നിശ്ചിത ഇടവേള", "reminders.dailyGoal":"ദൈനംദിന വെള്ള ലക്ഷ്യം (ml)", "reminders.amountPerReminder":"ഓരോ ഓർമ്മപ്പെടുത്തലിലെയും അളവ് (ml)", "reminders.intervalMinutes":"ഓർമ്മപ്പെടുത്തൽ ഇടവേള (മിനിറ്റ്)", "reminders.startHour":"ആരംഭ മണിക്കൂർ", "reminders.endHour":"അവസാന മണിക്കൂർ", "reminders.summary":"ഓർമ്മപ്പെടുത്തൽ സംഗ്രഹം", "reminders.summaryMode":"മോഡ്: {mode}", "reminders.summaryGoal":"ദൈനംദിന ലക്ഷ്യം: {amount} ml", "reminders.summaryAmount":"ഓരോ ഓർമ്മപ്പെടുത്തലിലെയും അളവ്: {amount} ml", "reminders.summaryTime":"സമയം: {start} - {end}", "reminders.planned":"ആസൂത്രിത ഓർമ്മപ്പെടുത്തലുകൾ: {count}", "reminders.schedule":"ഷെഡ്യൂൾ: {times}", "reminders.next":"അടുത്ത ഓർമ്മപ്പെടുത്തൽ: {time}", "reminders.todaysSchedule":"ഇന്നത്തെ ഷെഡ്യൂൾ: {times}", "reminders.remaining":"ഇന്ന് ബാക്കി: {count} ഓർമ്മപ്പെടുത്തലുകൾ", "reminders.plannedWater":"ആസൂത്രിത വെള്ളം: {amount} ml", "reminders.enableWater":"🔔 വെള്ള ഓർമ്മപ്പെടുത്തലുകൾ ഓൺ ചെയ്യുക", "reminders.disableWater":"🔕 വെള്ള ഓർമ്മപ്പെടുത്തലുകൾ ഓഫ് ചെയ്യുക", "reminders.invalidTimeTitle":"തെറ്റായ സമയം", "reminders.invalidAmountTitle":"തെറ്റായ അളവ്", "reminders.invalidIntervalTitle":"തെറ്റായ ഇടവേള", "reminders.somethingWrong":"എന്തോ പിശക് സംഭവിച്ചു", "reminders.error":"പിശക്", "reminders.noTime":"സമയമില്ല", "reminders.invalidTime":"തെറ്റായ സമയം"
  ,"tabs.today": "ഇന്ന്"
  ,"today.nextReminder": "അടുത്ത ഓർമ്മപ്പെടുത്തൽ"
  ,"today.earlier": "നേരത്തെയുള്ളത്"
  ,"today.laterToday": "ഇന്ന് പിന്നീട്"
  ,"today.upcoming": "വരാനിരിക്കുന്നത്"
  ,"today.past": "കഴിഞ്ഞത്"
  ,"today.noMore": "ഇന്ന് ഇനി ഓർമ്മപ്പെടുത്തലുകളില്ല."
  ,"today.allCaughtUp": "ഇന്നത്തേക്ക് എല്ലാം പൂർത്തിയായി."
  ,"today.viewToday": "ഇന്നത്തേത് കാണുക"
  ,"today.nextUp": "അടുത്തത്"
  ,"today.reminderCount": "{count} ഓർമ്മപ്പെടുത്തലുകൾ"
  ,"today.summary": "{past} കഴിഞ്ഞത് • {upcoming} വരാനിരിക്കുന്നത്"
  ,"today.inMinutes": "{count} മിനിറ്റിൽ"
  ,"today.inOneMinute": "1 മിനിറ്റിൽ"
  ,"today.dueNow": "ഇപ്പോൾ"
  ,"today.paused": "ഓർമ്മപ്പെടുത്തലുകൾ നിർത്തിയിരിക്കുന്നു"
  ,"today.pausedMessage": "ഇന്നത്തെ സമയരേഖ കാണാൻ മാസ്റ്റർ ഓർമ്മപ്പെടുത്തൽ ഓൺ ചെയ്യുക."
  ,"today.waterTitle": "{amount} ml വെള്ളം കുടിക്കുക"
  ,"today.birthdayTitle": "{name}യുടെ ജന്മദിനം"
  ,"today.anniversaryTitle": "{name}യുടെ വാർഷികം"
  ,"today.take": "കഴിക്കുക"
  ,"today.taken": "കഴിച്ചു"
  ,"today.snooze": "പിന്നീട് ഓർമ്മിപ്പിക്കുക"
  ,"today.skip": "ഒഴിവാക്കുക"
  ,"today.skipped": "ഒഴിവാക്കി"
  ,"today.snoozed": "പിന്നത്തേക്ക് മാറ്റി"
  ,"today.undo": "പൂർവസ്ഥിതിയിലാക്കുക"
  ,"today.snoozeFor": "ഇത്ര സമയത്തിന് ശേഷം ഓർമ്മിപ്പിക്കുക"
  ,"today.minutesOption": "{count} മിനിറ്റ്"
  ,"today.snoozedReminder": "മാറ്റിവെച്ച മരുന്ന് ഓർമ്മപ്പെടുത്തൽ"
  ,"today.actionErrorTitle": "മരുന്ന് പുതുക്കാനായില്ല"
  ,"today.actionErrorMessage": "ദയവായി വീണ്ടും ശ്രമിക്കുക."
  ,"today.snoozeErrorMessage": "ഈ മരുന്ന് ഓർമ്മപ്പെടുത്തൽ മാറ്റിവെക്കാനായില്ല. മരുന്ന് ഓർമ്മപ്പെടുത്തലുകൾ ഓണാണെന്ന് പരിശോധിക്കുക."
  ,"assistant.openButton": "ഹേ HydroMate"
  ,"assistant.title": "HydroMate-നോട് ചോദിക്കുക"
  ,"assistant.tapToTalk": "സംസാരിക്കാൻ ടാപ്പ് ചെയ്യുക അല്ലെങ്കിൽ ഓർമ്മപ്പെടുത്തൽ ടൈപ്പ് ചെയ്യുക"
  ,"assistant.greetingName": "ഹായ് {name}, ഏത് ഓർമ്മപ്പെടുത്തലാണ് ചേർക്കേണ്ടത്?"
  ,"assistant.greeting": "ഏത് ഓർമ്മപ്പെടുത്തലാണ് ചേർക്കേണ്ടത്?"
  ,"assistant.confirmationTitle": "സേവ് ചെയ്യുന്നതിന് മുമ്പ് ഈ ഓർമ്മപ്പെടുത്തൽ പരിശോധിക്കുക."
  ,"assistant.question.category": "ഇത് ഏത് തരത്തിലുള്ള ഓർമ്മപ്പെടുത്തലാണ്?"
  ,"assistant.question.medicineName": "ഏത് മരുന്ന്?"
  ,"assistant.question.waterAmount": "എത്ര മില്ലിലിറ്റർ വെള്ളം?"
  ,"assistant.question.waterAmountInvalid": "ദയവായി 10 മുതൽ 2000 മില്ലിലിറ്റർ വരെയുള്ള അളവ് പറയുക."
  ,"assistant.question.title": "എന്തിനെക്കുറിച്ചാണ് ഓർമ്മിപ്പിക്കേണ്ടത്?"
  ,"assistant.question.date": "ഏത് തീയതി ഉപയോഗിക്കണം?"
  ,"assistant.question.time": "എത്ര മണിക്ക്? AM അല്ലെങ്കിൽ PM കൂടി പറയുക."
  ,"assistant.question.medicineDaily": "മരുന്ന് ഓർമ്മപ്പെടുത്തലുകൾ ഇപ്പോൾ ദിവസവും ആവർത്തിക്കും. ഇത് ദിവസവും ആ സമയത്ത് ചേർക്കണോ?"
  ,"assistant.question.unsupportedMedicineDate": "ഒറ്റത്തവണ തീയതിയുള്ള മരുന്ന് ഓർമ്മപ്പെടുത്തൽ ഇതുവരെ ലഭ്യമല്ല. ദിവസേനയുള്ള സമയം പറയുക അല്ലെങ്കിൽ റദ്ദാക്കുക."
  ,"assistant.question.pastTime": "ഇന്ന് ആ സമയം കഴിഞ്ഞു. ഭാവിയിലെ സമയം പറയുക അല്ലെങ്കിൽ നാളെ എന്ന് പറയുക."
  ,"assistant.question.unclear": "എനിക്ക് മനസ്സിലായില്ല. വീണ്ടും പറയുക അല്ലെങ്കിൽ ഓർമ്മപ്പെടുത്തൽ ടൈപ്പ് ചെയ്യുക."
  ,"assistant.speechPermissionDenied": "മൈക്രോഫോൺ അനുമതി ലഭിച്ചില്ല. താഴെ ഓർമ്മപ്പെടുത്തൽ ടൈപ്പ് ചെയ്യാം."
  ,"assistant.speechTimeout": "ഒന്നും കേട്ടില്ല. വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക."
  ,"assistant.speechLocaleUnavailable": "ഈ ഉപകരണത്തിൽ ഈ ഭാഷയ്ക്കുള്ള ശബ്ദ തിരിച്ചറിയൽ ലഭ്യമല്ല. ടൈപ്പ് ചെയ്യാം."
  ,"assistant.speechUnavailable": "ഈ ഉപകരണത്തിൽ ശബ്ദ തിരിച്ചറിയൽ ലഭ്യമല്ല. ഓർമ്മപ്പെടുത്തൽ ടൈപ്പ് ചെയ്യാം."
  ,"assistant.speechError": "ശബ്ദ തിരിച്ചറിയൽ അപ്രതീക്ഷിതമായി നിന്നു. വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ ടൈപ്പ് ചെയ്യുക."
  ,"assistant.waterAmount": "{amount} ml വെള്ളം കുടിക്കുക"
  ,"assistant.editPrompt": "തിരുത്തിയ ഓർമ്മപ്പെടുത്തൽ പറയുക."
  ,"assistant.cancelled": "ശരി, ആ ഓർമ്മപ്പെടുത്തൽ റദ്ദാക്കി."
  ,"assistant.saved": "പൂർത്തിയായി. നിങ്ങളുടെ ഓർമ്മപ്പെടുത്തൽ ചേർത്തു."
  ,"assistant.savedMasterOff": "ഓർമ്മപ്പെടുത്തൽ സേവ് ചെയ്തു, പക്ഷേ മാസ്റ്റർ ഓർമ്മപ്പെടുത്തൽ ഇപ്പോൾ ഓഫ് ആണ്."
  ,"assistant.savedCategoryOff": "ഓർമ്മപ്പെടുത്തൽ സേവ് ചെയ്തു, പക്ഷേ {category} ഓർമ്മപ്പെടുത്തലുകൾ ഇപ്പോൾ ഓഫ് ആണ്."
  ,"assistant.saveError": "ഓർമ്മപ്പെടുത്തൽ സേവ് ചെയ്യാനായില്ല. വീണ്ടും ശ്രമിക്കട്ടെ?"
  ,"assistant.stillListening": "ഞാൻ ഇപ്പോഴും കേൾക്കുന്നുണ്ട്. {question}"
  ,"assistant.question.timePeriodSlot": "{time} AM ആണോ PM ആണോ?"
  ,"assistant.youSaid": "നിങ്ങൾ പറഞ്ഞത്"
  ,"assistant.yes": "അതെ, ദിവസവും"
  ,"assistant.no": "ഇല്ല"
  ,"assistant.understood": "ഞാൻ മനസ്സിലാക്കിയത്"
  ,"assistant.everyDayAt": "ദിവസവും {time}-ന്"
  ,"assistant.dateAt": "{date}-ന് {time}-ന്"
  ,"assistant.waterReplaceWarning": "സ്ഥിരീകരിച്ചാൽ നിലവിലെ വെള്ളം ഷെഡ്യൂൾ ഈ ഒരു ദിവസേനയുള്ള ഓർമ്മപ്പെടുത്തലായി മാറും."
  ,"assistant.repeatsYearly": "ഇത് നിലവിലെ വാർഷിക ഓർമ്മപ്പെടുത്തൽ മാതൃക ഉപയോഗിക്കുന്നു."
  ,"assistant.confirm": "സ്ഥിരീകരിക്കുക"
  ,"assistant.microphoneTitle": "മൈക്രോഫോൺ അനുമതി"
  ,"assistant.microphoneMessage": "Continue ടാപ്പ് ചെയ്ത ശേഷം മാത്രമേ HydroMate മൈക്രോഫോൺ ഉപയോഗിക്കൂ; ഒരു ഫലം അല്ലെങ്കിൽ ചെറിയ സമയപരിധിക്ക് ശേഷം നിർത്തുകയും അസംസ്കൃത ഓഡിയോ സേവ് ചെയ്യാതിരിക്കുകയും ചെയ്യും."
  ,"assistant.continue": "തുടരുക"
  ,"assistant.notNow": "ഇപ്പോൾ വേണ്ട"
  ,"assistant.textFallback": "നിങ്ങൾക്ക് എപ്പോഴും ടൈപ്പ് ചെയ്യാം."
  ,"assistant.inputPlaceholder": "ഓർമ്മപ്പെടുത്തൽ ടൈപ്പ് ചെയ്യുക..."
  ,"assistant.send": "അയയ്ക്കുക"
  ,"assistant.listen": "കേൾക്കുക"
  ,"assistant.stopListening": "കേൾക്കുന്നത് നിർത്തുക"
  ,"assistant.listeningWaiting": "കേൾക്കുന്നു…"
  ,"assistant.listeningSpeech": "കേൾക്കുന്നു…"
  ,"assistant.listeningConfirmation": "നിങ്ങളുടെ സ്ഥിരീകരണത്തിനായി കേൾക്കുന്നു…"
  ,"reminders.routine": "ദിനചര്യ"
  ,"reminders.routineReminder": "ദിനചര്യ ഓർമ്മപ്പെടുത്തൽ"
  ,"reminders.routineName": "ദിനചര്യയുടെ പേര്"
  ,"reminders.routineExample": "ഉദാ. നടത്തം, ഭക്ഷണക്രമം, ധ്യാനം"
  ,"reminders.routineAdded": "ദിനചര്യ ഓർമ്മപ്പെടുത്തൽ ചേർത്തു"
  ,"reminders.addRoutine": "📝 ദിനചര്യ ചേർക്കുക"
  ,"reminders.savedRoutines": "സൂക്ഷിച്ച ദിനചര്യകൾ"
  ,"reminders.updateRoutine": "ദിനചര്യ പുതുക്കുക"
  ,"reminders.enableRoutineReminders": "ദിനചര്യ ഓർമ്മപ്പെടുത്തലുകൾ പ്രവർത്തനക്ഷമമാക്കുക"
  ,"reminders.duration": "കാലയളവ്"
  ,"reminders.oneDay": "1 ദിവസം"
  ,"reminders.threeDays": "3 ദിവസം"
  ,"reminders.fiveDays": "5 ദിവസം"
  ,"reminders.sevenDays": "7 ദിവസം"
  ,"reminders.customDuration": "സ്വന്തം കാലയളവ്"
  ,"reminders.ongoing": "തുടർച്ചയായി"
  ,"reminders.days": "ദിവസങ്ങൾ"
  ,"reminders.durationDaysPlaceholder": "ദിവസങ്ങളുടെ എണ്ണം നൽകുക"
  ,"reminders.invalidDuration": "ശരിയായ ധനാത്മക ദിവസങ്ങളുടെ എണ്ണം നൽകുക"
  ,"reminders.durationSummary": "{count} ദിവസം"
  ,"reminders.ongoingHelp": "മാറ്റുകയോ നീക്കുകയോ ചെയ്യുന്നതുവരെ എല്ലാ ദിവസവും തുടരും."
  ,"reminders.legacyRoutineHelp": "കാലയളവ് തിരഞ്ഞെടുക്കുന്നതുവരെ ഈ പഴയ ഓർമ്മപ്പെടുത്തൽ മുൻ വാർഷിക ഷെഡ്യൂളിൽ തുടരും."
  ,"assistant.question.duration": "ഇത് എത്ര ദിവസം തുടരണം? ശരിയായ ധനാത്മക സംഖ്യ നൽകുക."
  ,"reminders.startDate": "ആരംഭ തീയതി"
  ,"assistant.question.timePeriod": "നിങ്ങൾ ഉദ്ദേശിച്ചത് AM ആണോ PM ആണോ?"
  ,"assistant.speechPermissionBlocked": "മൈക്രോഫോൺ അനുമതി തടഞ്ഞിരിക്കുന്നു. Android ക്രമീകരണത്തിൽ ഓണാക്കുക അല്ലെങ്കിൽ താഴെ ടൈപ്പ് ചെയ്യുക."
  ,"assistant.reviewTranscript": "കേട്ട വാചകം പരിശോധിക്കുകയോ തിരുത്തുകയോ ചെയ്തശേഷം അയയ്ക്കുക അമർത്തുക."
  ,"assistant.understoodCount": "ഞാൻ {count} ഓർമ്മപ്പെടുത്തലുകൾ മനസ്സിലാക്കി"
  ,"assistant.editItemPrompt": "തിരുത്തിയ ഓർമ്മപ്പെടുത്തൽ പറയുക. ഈ ഡ്രാഫ്റ്റ് മാത്രം മാറും."
  ,"assistant.addAnotherPrompt": "അടുത്തതായി ഏത് ഓർമ്മപ്പെടുത്തൽ ചേർക്കണം?"
  ,"assistant.addAnother": "മറ്റൊന്ന് ചേർക്കുക"
  ,"assistant.confirmAll": "എല്ലാം സ്ഥിരീകരിക്കുക"
  ,"assistant.savedAll": "പൂർത്തിയായി. {count} ഓർമ്മപ്പെടുത്തലുകൾ ചേർത്തു."
  ,"assistant.savedSomeCategoriesOff": "ഓർമ്മപ്പെടുത്തലുകൾ സൂക്ഷിച്ചു. ഓഫ് വിഭാഗങ്ങൾ ഷെഡ്യൂൾ ചെയ്തില്ല."
  ,"assistant.saveAsPlan": "30 ദിവസത്തെ പദ്ധതിയായി സൂക്ഷിക്കുക"
  ,"assistant.question.timesPerDay": "ദിവസത്തിൽ എത്ര തവണ ഓർമ്മപ്പെടുത്തണം? ഒരിക്കൽ, 2 തവണ, 3 തവണ അല്ലെങ്കിൽ ഇഷ്ടമുള്ള എണ്ണം പറയൂ."
  ,"assistant.question.timesPerDayInvalid": "ഒരിക്കൽ മാത്രം അല്ലെങ്കിൽ ദിവസത്തിൽ 1 മുതൽ 12 തവണ വരെ തിരഞ്ഞെടുക്കൂ."
  ,"assistant.question.durationDays": "ഈ ഓർമ്മപ്പെടുത്തൽ എത്ര ദിവസത്തേക്ക് വേണം? ഒരിക്കൽ, 7 ദിവസം, 30 ദിവസം അല്ലെങ്കിൽ ഇഷ്ടമുള്ള എണ്ണം പറയൂ."
  ,"assistant.question.durationDaysInvalid": "1 മുതൽ 365 ദിവസം വരെയുള്ള കാലയളവ് തിരഞ്ഞെടുക്കൂ."
  ,"assistant.question.recurrenceTimes": "ഏതെല്ലാം സമയങ്ങളിൽ ഓർമ്മപ്പെടുത്തണം? ഓരോ സമയത്തിനും AM അല്ലെങ്കിൽ PM പറയൂ."
  ,"assistant.question.recurrenceTimesInvalid": "AM അല്ലെങ്കിൽ PM സഹിതം കൃത്യം {count} വ്യത്യസ്ത സമയങ്ങൾ പറയൂ."
  ,"assistant.onceChoice": "ഒരിക്കൽ മാത്രം"
  ,"assistant.timesDailyChoice": "ദിവസത്തിൽ {count} തവണ"
  ,"assistant.daysChoice": "{count} ദിവസം"
  ,"assistant.onceSummary": "ഈ ഓർമ്മപ്പെടുത്തൽ ഒരിക്കൽ മാത്രം സജ്ജമാകും."
  ,"assistant.recurringSummary": "ദിവസത്തിൽ {times} തവണ, {days} ദിവസത്തേക്ക്."
  ,"assistant.rolloverToday": "{times} മണിക്കുള്ള ആദ്യ ഓർമ്മപ്പെടുത്തലുകൾ ഇന്ന് വരും."
  ,"assistant.rolloverTomorrow": "{times} മണിക്കുള്ള ഓർമ്മപ്പെടുത്തലുകൾ നാളെ തുടങ്ങും."
  ,"assistant.rolloverMixed": "{todayTimes} മണിക്കുള്ള ആദ്യ ഓർമ്മപ്പെടുത്തൽ ഇന്ന് വരും; {tomorrowTimes} മണിക്കുള്ളത് നാളെ തുടങ്ങും."
  ,"assistant.explicitTimesSummary": "സമയങ്ങൾ: {times}"
  ,"assistant.question.confirmation": "{summary} ഇത് സജ്ജമാക്കട്ടേ?"
  ,"assistant.question.confirmationInvalid": "ഈ ഓർമ്മപ്പെടുത്തൽ സജ്ജമാക്കട്ടേ? ദയവായി അതെ അല്ലെങ്കിൽ ഇല്ല എന്ന് പറയൂ."
  ,"assistant.relativeTimeSummary": "{count} മിനിറ്റിനുശേഷം."
  ,"assistant.defaultPlanName": "ആരോഗ്യ ഓർമ്മപ്പെടുത്തൽ പദ്ധതി"
  ,"assistant.planNamePlaceholder": "പദ്ധതിയുടെ പേര്"
  ,"assistant.planProgress": "{total} ൽ ദിവസം {day}"
  ,"assistant.planFinished": "നിങ്ങളുടെ {name} പൂർത്തിയായി."
  ,"assistant.planFinishedQuestion": "ഇനി എന്താണ് ചെയ്യേണ്ടത്?"
  ,"assistant.continueDays": "{count} ദിവസം തുടരുക"
  ,"assistant.updatePlan": "പദ്ധതി പുതുക്കുക"
  ,"assistant.updatePlanPrompt": "തിരുത്തിയതോ പുതിയതോ ആയ ഓർമ്മപ്പെടുത്തലുകൾ ചേർത്ത് എല്ലാം സ്ഥിരീകരിക്കുക."
  ,"assistant.archivePlan": "പദ്ധതി ആർക്കൈവ് ചെയ്യുക"
  ,"assistant.microphoneSettingsTitle": "മൈക്രോഫോൺ അനുമതി ഓഫാണ്"
  ,"assistant.microphoneSettingsMessage": "Android ക്രമീകരണം › ആപ്പുകൾ › HydroMate › അനുമതികൾ എന്നതിൽ മൈക്രോഫോൺ ഓണാക്കുക. ടൈപ്പ് ചെയ്യാം."
  ,"assistant.continueCustom": "ഇഷ്ടമുള്ള കാലം"
  ,"assistant.customContinuePrompt": "ഈ പദ്ധതി ഇനി എത്ര ദിവസം തുടരണം?"
  ,"assistant.planContinued": "പദ്ധതി {count} ദിവസം കൂടി തുടരും."
  ,"assistant.recentReviewCount": "നിങ്ങളുടെ {count} ഓർമ്മപ്പെടുത്തലുകൾ അവലോകനത്തിന് തയ്യാറാണ്."
  ,"assistant.reviewRecent": "സമീപകാല ഓർമ്മപ്പെടുത്തലുകൾ കാണുക"
  ,"assistant.recentReminders": "സമീപകാല Ask HydroMate ഓർമ്മപ്പെടുത്തലുകൾ"
  ,"assistant.hideRecent": "മറയ്ക്കുക"
  ,"assistant.showRecent": "{count} കാണിക്കുക"
  ,"assistant.readyForReview": "അവലോകനത്തിന് തയ്യാർ"
  ,"assistant.addedToday": "ഇന്ന് ചേർത്തു"
  ,"assistant.addedDaysAgo": "{count} ദിവസം മുമ്പ് ചേർത്തു"
  ,"assistant.recentSevenDayMessage": "ഈ ഓർമ്മപ്പെടുത്തൽ 7 ദിവസമായി സമീപകാല പട്ടികയിലുണ്ട്."
  ,"assistant.keepRecent": "നിലനിർത്തുക"
  ,"assistant.removeFromRecent": "സമീപകാല പട്ടികയിൽ നിന്ന് നീക്കുക"
  ,"assistant.reviewAgainSevenDays": "നിലനിർത്തി. 7 ദിവസത്തിന് ശേഷം വീണ്ടും ചോദിക്കും."
  ,"wakeWord.title": "Hey HydroMate വേക് വേഡ്"
  ,"wakeWord.consentTitle": "Hey HydroMate പ്രവർത്തനക്ഷമമാക്കണോ?"
  ,"wakeWord.privacyExplanation": "പ്രവർത്തനക്ഷമമാക്കിയാൽ HydroMate തുറന്നിരിക്കുമ്പോൾ “Hey HydroMate” മാത്രം തിരിച്ചറിയാൻ മൈക്രോഫോൺ ഉപയോഗിക്കുന്നു. വേക് ഓഡിയോ ഈ ഉപകരണത്തിൽ തന്നെയാണ് പ്രോസസ് ചെയ്യുന്നത്; സൂക്ഷിക്കുകയോ അപ്‌ലോഡ് ചെയ്യുകയോ ഇല്ല. വേക് വാക്യത്തിന് ശേഷമോ Listen അമർത്തുമ്പോഴോ മാത്രമാണ് പൂർണ്ണ സംഭാഷണ തിരിച്ചറിയൽ തുടങ്ങുന്നത്."
  ,"wakeWord.batteryNotice": "വേക് വേഡ് ശ്രവണം അധിക ബാറ്ററി ഉപയോഗിച്ചേക്കാം. എപ്പോൾ വേണമെങ്കിലും ഓഫ് ചെയ്യാം."
  ,"wakeWord.enable": "വേക് വേഡ് പ്രവർത്തനക്ഷമമാക്കുക"
  ,"wakeWord.foregroundExplanation": "HydroMate തുറന്നിരിക്കുമ്പോൾ മാത്രം ഉപകരണത്തിൽ ശ്രവിക്കുന്നു."
  ,"wakeWord.listening": "“Hey HydroMate” എന്നതിനായി ശ്രവിക്കുന്നു"
  ,"wakeWord.paused": "അസിസ്റ്റന്റ് സജീവമായതിനാൽ വേക് വേഡ് താൽക്കാലികമായി നിർത്തി"
  ,"wakeWord.permissionRequired": "മൈക്രോഫോൺ അനുമതി ആവശ്യമാണ്"
  ,"wakeWord.unavailable": "ഈ ഉപകരണത്തിൽ വേക് വേഡ് ലഭ്യമല്ല"
  ,"wakeWord.foregroundOnly": "വീണ്ടും ശ്രവിക്കാൻ HydroMate തുറക്കുക"
  ,"wakeWord.off": "വേക് വേഡ് ഓഫ് ആണ്"
  ,"wakeWord.responseWaitTitle": "പ്രതികരണ കാത്തിരിപ്പ് സമയം"
  ,"wakeWord.responseWaitExplanation": "നിങ്ങൾ സംസാരിച്ചു തുടങ്ങാൻ Ask HydroMate എത്ര സമയം കാത്തിരിക്കണമെന്ന് തിരഞ്ഞെടുക്കുക."
  ,"wakeWord.secondsShort": "{count} സെക്കൻഡ്"
  ,"wakeWord.custom": "ഇഷ്ടാനുസൃതം"
  ,"wakeWord.customSecondsPlaceholder": "സെക്കൻഡുകൾ"
  ,"wakeWord.saveResponseWait": "സേവ് ചെയ്യുക"
  ,"wakeWord.responseWaitRange": "{min} മുതൽ {max} സെക്കൻഡ് വരെ ഒരു പൂർണ്ണ സംഖ്യ നൽകുക."
};
