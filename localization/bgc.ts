import type { TranslationKey } from "./en";
import { hi } from "./hi";

export const bgc: Record<TranslationKey, string> = {
  ...hi,
  "tabs.settings": "सेटिंग",
  "settings.title": "सेटिंग",
  "settings.voiceWakeWord": "आवाज अर वेक वर्ड",
  "settings.languageVoice": "भाषा अर आवाज",
  "settings.reminderCategorySummary": "{total} में तै {enabled} रिमाइंडर श्रेणी चालू सैं",
  "settings.stateOn": "चालू",
  "settings.stateOff": "बंद",
  "settings.profileName": "नाम",
  "settings.profilePhone": "फोन नंबर",
  "settings.profileAge": "उमर", "settings.profileGender": "लिंग", "settings.profileWeight": "वजन", "settings.notSet": "सेट कोनी", "settings.kilograms": "{amount} किलो",
  "settings.logout": "लॉग आउट", "settings.logoutConfirmTitle": "लॉग आउट करोगे?", "settings.logoutConfirmMessage": "थम शुरुआती स्क्रीन पै लौटोगे। रिमाइंडर, इतिहास, पसंद अर स्थानीय आवाज डेटा इस डिवाइस पै रहेंगे।", "settings.logoutErrorTitle": "लॉग आउट ना होया", "settings.logoutErrorMessage": "फेर कोशिश करो।",
  "settings.resetProfile": "प्रोफाइल रीसेट करो", "settings.resetProfileConfirmTitle": "प्रोफाइल रीसेट करोगे?", "settings.resetProfileConfirmMessage": "सहेजा नाम, उमर, लिंग अर वजन मिट जागा। रिमाइंडर, पाणी का इतिहास, पसंद अर आवाज डेटा ना मिटेगा।",
  "profile.phoneReadOnly": "साइन-इन फोन खाते तै नियंत्रित", "profile.optionalFields": "उमर, लिंग अर वजन वैकल्पिक सैं।", "profile.agePlaceholder": "वैकल्पिक, 1–120", "profile.ageError": "1 तै 120 के बीच पूरा अंक में उमर लिखो या खाली छोड़ो।", "profile.genderMale": "आदमी", "profile.genderFemale": "औरत", "profile.genderPreferNotToSay": "बताना ना चाहूँ", "profile.weightPlaceholder": "वैकल्पिक, 20–300", "profile.weightError": "20 तै 300 किलो के बीच वजन लिखो या खाली छोड़ो।",
  "settings.dailyWaterGoal": "रोज का पानी लक्ष्य",
  "settings.milliliters": "{amount} मि.ली.",
  "settings.wakeWordPrivacyTitle": "वेक वर्ड गोपनीयता",
  "settings.wakeWordPrivacyText": "HydroMate के सुणते बखत वेक-वर्ड पहचान इसी डिवाइस पै स्थानीय रूप तै होवै सै।",
  "settings.speakerProfileTitle": "स्पीकर वॉइस प्रोफाइल",
  "settings.speakerProfileText": "आपके दर्ज वॉइस नमूने अर वॉइस प्रोफाइल इसी डिवाइस पै रहैं सैं।",
  "settings.deleteVoiceProfile": "वॉइस प्रोफाइल हटाओ",
  "settings.deleteVoiceProfileConfirmTitle": "वॉइस प्रोफाइल हटावां?",
  "settings.deleteVoiceProfileConfirmMessage": "यो वॉइस नमूने हटाकै सिर्फ-मालिक पहचान बंद कर देगा।",
  "settings.voiceProfileDeleted": "वॉइस प्रोफाइल हटा दी गई।",
  "settings.clearWakeDebugRecordings": "वेक डीबग रिकॉर्डिंग साफ करो",
  "settings.debugRecordingsClearedTitle": "डीबग रिकॉर्डिंग साफ हो गई",
  "settings.debugRecordingsClearedMessage": "{count} वेक डीबग रिकॉर्डिंग हटाई गई।",
  "settings.appInformation": "ऐप जानकारी",
  "settings.versionValue": "वर्जन {version}",
  "settings.buildValue": "बिल्ड {build}",
  "settings.updateErrorTitle": "सेटिंग अपडेट ना हो सकी",
  "settings.updateErrorMessage": "फेर कोशिश करो।",
  "speakerVerification.title": "सिर्फ मेरी आवाज पछाणो",
  "speakerVerification.sensitivity": "आवाज मिलान संवेदनशीलता", "speakerVerification.sensitivity.lenient": "ढील", "speakerVerification.sensitivity.balanced": "संतुलित", "speakerVerification.sensitivity.strict": "कड़ा",
  "speakerVerification.off": "बंद",
  "speakerVerification.setupRequired": "आवाज सेटअप जरूरी सै",
  "speakerVerification.ready": "तैयार",
  "speakerVerification.setup": "मेरी आवाज सेट अप करो",
  "speakerVerification.rerecord": "मेरी आवाज फेर रिकॉर्ड करो",
  "speakerVerification.privacy": "आपकी वॉइस प्रोफाइल इसी डिवाइस पै रहैगी।",
  "speakerVerification.setupTitle": "मेरी आवाज सेट अप करो",
  "speakerVerification.setupExplanation":
    "इस डिवाइस पै आपकी आवाज पछाणण खातर वॉइस सेटअप 'Hey HydroMate' के कुछ नमूने रिकॉर्ड करैगा।",
  "speakerVerification.continue": "आगे बढ़ो",
  "speakerVerification.nextStep": "वॉइस नामांकन अगले चरण में जोड़्या जागा।",
  "speakerVerification.enrollmentInstruction": "'Hey HydroMate' नै सहज ढंग तै 5 बार बोलो।",
  "speakerVerification.sampleProgress": "नमूना {current} / {total}",
  "speakerVerification.listening": "सुण रह्या सै...",
  "speakerVerification.sampleRecorded": "नमूना रिकॉर्ड हो गया",
  "speakerVerification.readyToRecord": "रिकॉर्ड करण खातर तैयार",
  "speakerVerification.record": "रिकॉर्ड करो",
  "speakerVerification.tryAgain": "फेर कोशिश करो",
  "speakerVerification.useSample": "इस नमूने का इस्तेमाल करो",
  "speakerVerification.errorTitle": "वॉइस सेटअप आगे ना बढ़ सका",
  "speakerVerification.errorMessage": "आपकी पुराणी वॉइस प्रोफाइल ना बदली। फेर कोशिश करो।",
  "speakerVerification.completeTitle": "वॉइस सेटअप पूरा हो गया",
  "speakerVerification.completeMessage": "आपके पाँच वॉइस नमूने इसी डिवाइस पै सेव हो गए।",
  "settings.reminderControls": "रिमाइंडर कंट्रोल",
  "settings.profile": "प्रोफाइल",
  "settings.privacy": "निजता",
  "settings.feedback": "फीडबैक",
  "voice.waterSpeechAmount": "इब {amount} मिलीलीटर पाणी पीण का टैम हो गया सै।",
  "voice.medicineLockedSpeech": "आपणी दवाई लेण का टैम हो गया सै।",
  "voice.birthdayLockedSpeech": "आज थारे खातर जन्मदिन की याद सै।",
  "voice.anniversaryLockedSpeech": "आज थारे खातर सालगिरह की याद सै।",
  "voice.customLockedSpeech": "थारे खातर एक याद सै।",
  "common.edit": "बदलो",
  "common.cancelEdit": "बदलाव रद्द करो",
  "reminders.editingExisting": "बचाई याद में बदलाव हो रह्या सै",
  "reminders.updateMedicine": "दवाई अपडेट करो",
  "reminders.updateBirthday": "जन्मदिन अपडेट करो",
  "reminders.updateAnniversary": "सालगिरह अपडेट करो",
  "reminders.updateCustom": "याद अपडेट करो",
  "reminders.masterTitle": "मुख्य याद",
  "reminders.masterControlsAll": "सारी याद नै काबू करै सै",
  "reminders.enableWaterReminders": "पाणी की याद चालू करो",
  "reminders.enableMedicineReminders": "दवाई की याद चालू करो",
  "reminders.enableBirthdayReminders": "जन्मदिन की याद चालू करो",
  "reminders.enableAnniversaryReminders": "सालगिरह की याद चालू करो",
  "reminders.enableCustomReminders": "अपणे हिसाब की याद चालू करो",
  "reminders.saveWaterSettings": "पाणी की सेटिंग बचाओ",
  "reminders.waterSettingsSaved": "पाणी की याद की सेटिंग बच गी।",
  "tabs.home":"होम", "tabs.reminders":"याद दिलाणे आले", "common.notAvailable":"मिलदा कोनी", "common.remove":"हटा दे", "common.cancel":"रद्द कर", "common.done":"हो गया",
  "home.loading":"HydroMate खुलण लाग रया सै...", "home.welcome":"HydroMate में थारा स्वागत सै", "home.enterName":"आगे जाण खातर आपणा नाम लिखो", "home.yourName":"थारा नाम", "home.continue":"आगे चालो", "home.phoneLater":"फोन बाद में जोड़ के जाँच सको सो।", "home.goodMorning":"राम राम", "home.goodAfternoon":"राम राम", "home.goodEvening":"राम राम, शुभ साँझ", "home.editProfile":"प्रोफाइल बदलो", "home.language":"भाषा", "home.selectLanguage":"भाषा चुनो", "home.tagline":"पाणी पीते रहो, तंदुरुस्त रहो।", "home.todaysWater":"आज का पाणी", "home.dailyHistory":"रोज के पाणी का हिसाब", "home.sevenDayAverage":"7 दिन का औसत: {amount} ml", "home.goalAchieved":"लक्ष्य पूरा: {achieved} / {total} दिन", "home.currentStreak":"चालू सिलसिला: {count} {days} 🔥", "home.bestStreak":"सबतै बढ़िया सिलसिला: {count} {days} 🏆", "home.weeklyProgress":"हफ्ते की तरक्की: {total} में तै {count} लक्ष्य {days}", "home.day":"दिन", "home.days":"दिन", "home.noHistory":"इब्बै कोई हिसाब कोनी", "home.percentOfGoal":"लक्ष्य का {percent}%", "home.percentOfTodaysGoal":"आज के लक्ष्य का {percent}%", "home.nextReminder":"अगली याद", "home.mode":"तरीका: {mode}", "home.smart":"स्मार्ट", "home.fixed":"तय", "home.addWater":"पाणी जोड़ो", "home.custom":"अपणे हिसाब तै", "home.customWaterPlaceholder":"पाणी की मात्रा ml में लिखो", "home.invalidWater":"ठीक पाणी की मात्रा लिखो", "home.undoLastWater":"↩ पिछला {amount} ml हटा दे", "home.todaysStatus":"आज का हाल", "home.goalCompleted":"🎉 रोज का लक्ष्य पूरा हो गया!", "home.litersRemaining":"{amount} L बाकी सै", "home.footer":"हर घूँट जरूरी सै 💙",
  "feedback.rowTitle":"राय भेजो", "feedback.modalTitle":"बीटा राय", "feedback.typeLabel":"राय की किस्म", "feedback.bug":"दिक्कत", "feedback.suggestion":"सलाह", "feedback.other":"और", "feedback.messagePlaceholder":"के होया या के सुधारणा सै, बताओ", "feedback.submit":"भेजो", "feedback.submitting":"भेजी जा री सै...", "feedback.requiredTitle":"राय जरूरी सै", "feedback.requiredMessage":"भेजण तै पहले राय लिखो।", "feedback.thankYou":"थारी राय खातर धन्यवाद।", "feedback.shareFeedback":"राय साझा करो", "feedback.history":"राय का हिसाब", "feedback.detailsTitle":"राय की पूरी बात", "feedback.back":"पाछै", "feedback.clearHistory":"राय का हिसाब मिटाओ", "feedback.clear":"मिटाओ",
  "voice.rowTitle":"बोल के याद दिलाणा", "voice.on":"चालू", "voice.off":"बंद", "voice.modalTitle":"बोल के याद दिलाणा", "voice.enabledLabel":"आवाज वाली याद चालू/बंद", "voice.currentLanguage":"इब की भाषा", "voice.voiceSelection":"आवाज", "voice.systemDefault":"फोन की अपनी आवाज", "voice.loadingVoices":"फोन की आवाज देखी जा री सै...", "voice.noCompatibleVoices":"मिलती आवाज कोनी मिली।", "voice.testVoice":"आवाज जाँचो", "voice.testingVoice":"आवाज जाँची जा री सै...", "voice.openOnlyInfo":"आवाज वाली याद इब HydroMate खुला होण पै काम करै सै। आम नोटिफिकेशन की आवाज चालू रहवैगी।", "voice.waterSpeech":"पाणी पीण का टैम हो गया सै।", "voice.medicineSpeech":"{name} लेण का टैम हो गया सै।", "voice.customSpeech":"याद राखो: {message}", "voice.birthdaySpeech":"आज {name} का जन्मदिन सै।", "voice.anniversarySpeech":"आज {name} की सालगिरह सै।", "voice.unavailableTitle":"आवाज कोनी मिली", "voice.unavailableMessage":"इस भाषा की आवाज फोन में कोनी। आम नोटिफिकेशन की आवाज चालू रहवैगी।",
  "reminders.title":"💧 याद दिलाणे की सेटिंग", "reminders.subtitle":"HydroMate कद याद दिलावै, चुनो।", "reminders.type":"याद की किस्म", "reminders.water":"पाणी", "reminders.medicine":"दवाई", "reminders.birthday":"जन्मदिन", "reminders.anniversary":"सालगिरह", "reminders.custom":"अपणे हिसाब तै", "reminders.birthdayName":"जन्मदिन का नाम", "reminders.birthdayDate":"जन्म की तारीख", "reminders.savedBirthdays":"बचाए जन्मदिन", "reminders.reminderTime":"याद का टैम", "reminders.addBirthday":"🎂 जन्मदिन जोड़ो", "reminders.anniversaryName":"सालगिरह का नाम", "reminders.anniversaryDate":"सालगिरह की तारीख", "reminders.addAnniversary":"💍 सालगिरह जोड़ो", "reminders.savedAnniversaries":"बचाई सालगिरह", "reminders.customName":"अपणी याद का नाम", "reminders.reminderDate":"याद की तारीख", "reminders.addCustom":"📝 अपणी याद जोड़ो", "reminders.savedCustom":"बचाई याद", "reminders.healthType":"सेहत वाली याद की किस्म", "reminders.medicineName":"दवाई का नाम", "reminders.addTime":"+ टैम जोड़ो", "reminders.selectTime":"याद का टैम चुनो", "reminders.hour":"घंटा", "reminders.minutes":"मिनट", "reminders.minute":"मिनट", "reminders.customMinute":"अपणे हिसाब तै", "reminders.selectCustomTime":"अपणा टैम चुनो", "reminders.useTime":"यो टैम रखो", "reminders.addMedicine":"💊 दवाई जोड़ो", "reminders.mode":"याद का मोड", "reminders.on":"याद चालू सै", "reminders.off":"याद बंद सै", "reminders.allOff":"सारी याद बंद सैं", "reminders.savedOn":"बचाई याद चालू सैं", "reminders.statusOn":"✅ याद चालू सै", "reminders.statusOff":"⛔ याद बंद सै", "reminders.smartSchedule":"⭐ स्मार्ट टैम", "reminders.fixedInterval":"⏰ तय अंतर", "reminders.smartSchedulePlain":"स्मार्ट टैम", "reminders.fixedIntervalPlain":"तय अंतर", "reminders.dailyGoal":"रोज का पाणी लक्ष्य (ml)", "reminders.amountPerReminder":"हर याद पै पाणी (ml)", "reminders.intervalMinutes":"याद का अंतर (मिनट)", "reminders.startHour":"शुरू का घंटा", "reminders.endHour":"आखिरी घंटा", "reminders.summary":"याद का सार", "reminders.summaryMode":"तरीका: {mode}", "reminders.summaryGoal":"रोज का लक्ष्य: {amount} ml", "reminders.summaryAmount":"हर याद पै: {amount} ml", "reminders.summaryTime":"टैम: {start} - {end}", "reminders.planned":"तय याद: {count}", "reminders.schedule":"टैम: {times}", "reminders.next":"अगली याद: {time}", "reminders.todaysSchedule":"आज का टैम: {times}", "reminders.remaining":"आज बाकी: {count} याद", "reminders.plannedWater":"तय पाणी: {amount} ml", "reminders.enableWater":"🔔 पाणी की याद चालू करो", "reminders.disableWater":"🔕 पाणी की याद बंद करो", "reminders.invalidTimeTitle":"टैम गलत सै", "reminders.invalidAmountTitle":"मात्रा गलत सै", "reminders.invalidIntervalTitle":"अंतर गलत सै", "reminders.somethingWrong":"कुछ गड़बड़ हो गी", "reminders.error":"गलती", "reminders.noTime":"टैम कोनी", "reminders.invalidTime":"गलत टैम"
  ,"tabs.today": "आज"
  ,"today.nextReminder": "अगली याद"
  ,"today.earlier": "पहल्यां"
  ,"today.laterToday": "आज पाछै"
  ,"today.upcoming": "आण वाली"
  ,"today.past": "बीत चुकी"
  ,"today.noMore": "आज और कोई याद कोनी।"
  ,"today.allCaughtUp": "आज का सारा काम पूरा सै।"
  ,"today.viewToday": "आज का देखो"
  ,"today.nextUp": "अगली"
  ,"today.reminderCount": "{count} याद"
  ,"today.summary": "{past} बीत चुकी • {upcoming} आण वाली"
  ,"today.inMinutes": "{count} मिनट में"
  ,"today.inOneMinute": "1 मिनट में"
  ,"today.dueNow": "इब"
  ,"today.paused": "याद रोक राखी सैं"
  ,"today.pausedMessage": "आज की टाइमलाइन देखण खातर मास्टर रिमाइंडर चालू करो।"
  ,"today.waterTitle": "{amount} ml पाणी पियो"
  ,"today.birthdayTitle": "{name} का जन्मदिन"
  ,"today.anniversaryTitle": "{name} की सालगिरह"
  ,"today.take": "ले लो"
  ,"today.taken": "ले ली"
  ,"today.snooze": "बाद में याद दिलाओ"
  ,"today.skip": "छोड़ दो"
  ,"today.skipped": "छोड़ दिया"
  ,"today.snoozed": "बाद खातर रख दिया"
  ,"today.undo": "वापस करो"
  ,"today.snoozeFor": "इतनी देर बाद याद दिलाओ"
  ,"today.minutesOption": "{count} मिनट"
  ,"today.snoozedReminder": "बाद में याद दिलाण वाला दवाई रिमाइंडर"
  ,"today.actionErrorTitle": "दवाई अपडेट ना होई"
  ,"today.actionErrorMessage": "फेर कोशिश करो।"
  ,"today.snoozeErrorMessage": "इस दवाई की याद बाद खातर ना लग सकी। देखो दवाई की याद चालू सै के।"
  ,"assistant.openButton": "हे HydroMate"
  ,"assistant.title": "HydroMate तै पूछो"
  ,"assistant.tapToTalk": "बोलण खातर टैप करो या रिमाइंडर लिखो"
  ,"assistant.greetingName": "राम राम {name}, कुण सा रिमाइंडर जोड़णा सै?"
  ,"assistant.greeting": "कुण सा रिमाइंडर जोड़णा सै?"
  ,"assistant.confirmationTitle": "सेव करण तै पहले इस रिमाइंडर नै जाँच लो।"
  ,"assistant.question.category": "यो किस किस्म का रिमाइंडर सै?"
  ,"assistant.question.medicineName": "कुण सी दवाई?"
  ,"assistant.question.waterAmount": "कितणा मिलीलीटर पाणी?"
  ,"assistant.question.waterAmountInvalid": "कृपया 10 तै 2000 मिलीलीटर के बीच मात्रा बताओ।"
  ,"assistant.question.title": "किस बात की याद दिलाऊँ?"
  ,"assistant.question.date": "कुण सी तारीख राखूँ?"
  ,"assistant.question.time": "कितणे बजे? AM या PM भी बताओ।"
  ,"assistant.question.medicineDaily": "दवाई के रिमाइंडर इब रोज आवैं सैं। इस दवाई नै रोज उसी टैम जोड़ दूँ?"
  ,"assistant.question.unsupportedMedicineDate": "एक बार का तारीख वाला दवाई रिमाइंडर इब्बै कोनी। रोज का टैम बताओ या रद्द करो।"
  ,"assistant.question.pastTime": "आज यो टैम बीत लिया। आगे का टैम बताओ या काल कहो।"
  ,"assistant.question.unclear": "मनै समझ कोनी आया। फेर बोलो या रिमाइंडर लिखो।"
  ,"assistant.speechPermissionDenied": "माइक की मंजूरी कोनी मिली। नीचे रिमाइंडर लिख सको सो।"
  ,"assistant.speechTimeout": "कुछ सुनाई कोनी दिया। फेर कोशिश करो या लिखो।"
  ,"assistant.speechLocaleUnavailable": "इस फोन में इस भाषा की बोली पहचान कोनी। लिख सको सो।"
  ,"assistant.speechUnavailable": "इस फोन में बोली पहचान कोनी। रिमाइंडर लिख सको सो।"
  ,"assistant.speechError": "बोली पहचान अचानक रुक गी। फेर कोशिश करो या लिखो।"
  ,"assistant.waterAmount": "{amount} ml पाणी पी लो"
  ,"assistant.editPrompt": "सुधारा होया रिमाइंडर बताओ।"
  ,"assistant.cancelled": "ठीक सै, वो रिमाइंडर रद्द कर दिया।"
  ,"assistant.saved": "हो गया। थारा रिमाइंडर जुड़ गया सै।"
  ,"assistant.savedMasterOff": "रिमाइंडर सेव सै, पर मास्टर रिमाइंडर इब बंद सै।"
  ,"assistant.savedCategoryOff": "रिमाइंडर सेव सै, पर {category} रिमाइंडर इब बंद सैं।"
  ,"assistant.saveError": "रिमाइंडर सेव ना होया। के मैं फेर कोशिश करूँ?"
  ,"assistant.stillListening": "मैं इब भी सुन रहा सूँ। {question}"
  ,"assistant.question.timePeriodSlot": "{time} सुबह का सै या शाम का?"
  ,"assistant.youSaid": "तमनै कहा"
  ,"assistant.yes": "हाँ, रोज"
  ,"assistant.no": "ना"
  ,"assistant.understood": "मैं समझ्या"
  ,"assistant.everyDayAt": "रोज {time} बजे"
  ,"assistant.dateAt": "{date} नै {time} बजे"
  ,"assistant.waterReplaceWarning": "पक्का करण पै इब का पाणी शेड्यूल इस एक रोज के रिमाइंडर तै बदल जागा।"
  ,"assistant.repeatsYearly": "यो इब के सालाना रिमाइंडर तरीके नै बरतै सै।"
  ,"assistant.confirm": "पक्का करो"
  ,"assistant.microphoneTitle": "माइक की मंजूरी"
  ,"assistant.microphoneMessage": "Continue टैप करण के बाद ही HydroMate माइक चलावै सै, एक नतीजे या थोड़े टैम बाद रुक जावै सै अर कच्ची ऑडियो सेव कोनी करै।"
  ,"assistant.continue": "आगे चालो"
  ,"assistant.notNow": "इब ना"
  ,"assistant.textFallback": "तम हमेशा लिख भी सको सो।"
  ,"assistant.inputPlaceholder": "रिमाइंडर लिखो..."
  ,"assistant.send": "भेजो"
  ,"assistant.listen": "सुणो"
  ,"assistant.stopListening": "सुणणा बंद करो"
  ,"assistant.listeningWaiting": "सुणूं सूं…"
  ,"assistant.listeningSpeech": "सुणूं सूं…"
  ,"assistant.listeningConfirmation": "थारी पुष्टि सुणूं सूं…"
  ,"reminders.routine": "रोज का काम"
  ,"reminders.routineReminder": "रोज के काम की याद"
  ,"reminders.routineName": "काम का नाम"
  ,"reminders.routineExample": "ज्यूँ सैर, खान-पान, ध्यान"
  ,"reminders.routineAdded": "रोज के काम की याद जोड़ दी"
  ,"reminders.addRoutine": "📝 रोज का काम जोड़ो"
  ,"reminders.savedRoutines": "बचाए रोज के काम"
  ,"reminders.updateRoutine": "रोज का काम बदलो"
  ,"reminders.enableRoutineReminders": "रोज के काम की याद चालू करो"
  ,"reminders.duration": "कितणे दिन"
  ,"reminders.oneDay": "1 दिन"
  ,"reminders.threeDays": "3 दिन"
  ,"reminders.fiveDays": "5 दिन"
  ,"reminders.sevenDays": "7 दिन"
  ,"reminders.customDuration": "अपणे हिसाब के दिन"
  ,"reminders.ongoing": "लगातार"
  ,"reminders.days": "दिन"
  ,"reminders.durationDaysPlaceholder": "दिनां की गिनती लिखो"
  ,"reminders.invalidDuration": "दिनां की सही धन गिनती लिखो"
  ,"reminders.durationSummary": "{count} दिन"
  ,"reminders.ongoingHelp": "बदलण या हटाण ताईं रोज चालता रहैगा।"
  ,"reminders.legacyRoutineHelp": "अवधि चुनण ताईं यो पुराणा रिमाइंडर पहले आले सालाना टैम पै चालैगा।"
  ,"assistant.question.duration": "यो कितणे दिन चालै? सही धन गिनती लिखो।"
  ,"reminders.startDate": "शुरू होण की तारीख"
  ,"assistant.question.timePeriod": "थारा मतलब AM सै या PM?"
  ,"assistant.speechPermissionBlocked": "माइक की अनुमति बंद सै। Android सेटिंग में चालू करो या नीचे लिखो।"
  ,"assistant.reviewTranscript": "सुणी बात नै जांच या सुधार कै भेजो दबाओ।"
  ,"assistant.understoodCount": "मन्नै {count} रिमाइंडर समझ आए"
  ,"assistant.editItemPrompt": "सही रिमाइंडर बताओ। बस यो ड्राफ्ट बदलेगा।"
  ,"assistant.addAnotherPrompt": "इब कुण सा रिमाइंडर जोड़णा सै?"
  ,"assistant.addAnother": "एक और जोड़ो"
  ,"assistant.confirmAll": "सारे पक्के करो"
  ,"assistant.savedAll": "हो गया। {count} रिमाइंडर जुड़ गए।"
  ,"assistant.savedSomeCategoriesOff": "रिमाइंडर सेव हो गए। बंद श्रेणी शेड्यूल ना हुई।"
  ,"assistant.saveAsPlan": "30 दिन की योजना के रूप में सेव करो"
  ,"assistant.question.timesPerDay": "दिन में कितनी बार रिमाइंडर चाहिए? एक बार, 2 बार, 3 बार या जितनी बार चाहो बताओ।"
  ,"assistant.question.timesPerDayInvalid": "सिर्फ एक बार या दिन में 1 तै 12 बार चुनो।"
  ,"assistant.question.durationDays": "यो रिमाइंडर कितणे दिन राखणा सै? एक बार, 7 दिन, 30 दिन या मनपसंद गिनती बताओ।"
  ,"assistant.question.durationDaysInvalid": "1 तै 365 दिन के बीच की अवधि चुनो।"
  ,"assistant.question.recurrenceTimes": "कुण-कुण से टैम याद दिलाऊँ? हर टैम के साथ AM या PM बताओ।"
  ,"assistant.question.recurrenceTimesInvalid": "AM या PM के साथ ठीक {count} अलग टैम बताओ।"
  ,"assistant.onceChoice": "सिर्फ एक बार"
  ,"assistant.timesDailyChoice": "दिन में {count} बार"
  ,"assistant.daysChoice": "{count} दिन"
  ,"assistant.onceSummary": "यो रिमाइंडर सिर्फ एक बार सेट होगा।"
  ,"assistant.recurringSummary": "दिन में {times} बार, {days} दिन खातर।"
  ,"assistant.rolloverToday": "{times} बजे के पहले रिमाइंडर आज आवेंगे।"
  ,"assistant.rolloverTomorrow": "{times} बजे के रिमाइंडर काल तै शुरू होंगे।"
  ,"assistant.rolloverMixed": "{todayTimes} बजे का पहला रिमाइंडर आज आवेगा अर {tomorrowTimes} बजे वाला काल तै शुरू होगा।"
  ,"assistant.explicitTimesSummary": "टैम: {times}"
  ,"assistant.question.confirmation": "{summary} के मैं इसनै सेट कर दूँ?"
  ,"assistant.question.confirmationInvalid": "के मैं यो रिमाइंडर सेट कर दूँ? हाँ या ना बोलो।"
  ,"assistant.relativeTimeSummary": "{count} मिनट बाद।"
  ,"assistant.defaultPlanName": "सेहत रिमाइंडर योजना"
  ,"assistant.planNamePlaceholder": "योजना का नाम"
  ,"assistant.planProgress": "{total} में दिन {day}"
  ,"assistant.planFinished": "थारी {name} पूरी हो गई।"
  ,"assistant.planFinishedQuestion": "इब के करणा चाहोगे?"
  ,"assistant.continueDays": "{count} दिन जारी राखो"
  ,"assistant.updatePlan": "योजना बदलो"
  ,"assistant.updatePlanPrompt": "सुधारे या नए रिमाइंडर जोड़ कै सारे पक्के करो।"
  ,"assistant.archivePlan": "योजना संग्रहित करो"
  ,"assistant.microphoneSettingsTitle": "माइक की अनुमति बंद सै"
  ,"assistant.microphoneSettingsMessage": "Android सेटिंग › ऐप › HydroMate › अनुमति में माइक चालू करो। लिख भी सको हो।"
  ,"assistant.continueCustom": "अपणी अवधि"
  ,"assistant.customContinuePrompt": "यो योजना और कितणे दिन चालै?"
  ,"assistant.planContinued": "योजना {count} दिन और चालैगी।"
  ,"assistant.recentReviewCount": "थारे {count} रिमाइंडर समीक्षा खातर तैयार सैं।"
  ,"assistant.reviewRecent": "हाल के रिमाइंडर देखो"
  ,"assistant.recentReminders": "हाल के Ask HydroMate रिमाइंडर"
  ,"assistant.hideRecent": "छिपाओ"
  ,"assistant.showRecent": "{count} देखो"
  ,"assistant.readyForReview": "समीक्षा खातर तैयार"
  ,"assistant.addedToday": "आज जोड़ा गया"
  ,"assistant.addedDaysAgo": "{count} दिन पहलां जोड़ा गया"
  ,"assistant.recentSevenDayMessage": "यो रिमाइंडर 7 दिन तै हाल की सूची में सै।"
  ,"assistant.keepRecent": "राखो"
  ,"assistant.removeFromRecent": "हाल की सूची तै हटाओ"
  ,"assistant.reviewAgainSevenDays": "राख लिया। 7 दिन बाद फेर पूछूंगा।"
  ,"wakeWord.title": "Hey HydroMate वेक वर्ड"
  ,"wakeWord.consentTitle": "Hey HydroMate चालू कर दें?"
  ,"wakeWord.privacyExplanation": "चालू होण पै HydroMate ऐप खुली हो तो सिर्फ “Hey HydroMate” पहचानण खातर माइक्रोफोन बरते सै। वेक ऑडियो इसी डिवाइस पै प्रोसेस हो सै, ना सेव हो सै ना अपलोड। पूरी बोली पहचान वेक वाक्य के बाद या Listen दबाण पै ही शुरू हो सै।"
  ,"wakeWord.batteryNotice": "वेक वर्ड सुणण में ज्यादा बैटरी लग सके सै। इसे कदे भी बंद कर सको सो।"
  ,"wakeWord.enable": "वेक वर्ड चालू करो"
  ,"wakeWord.foregroundExplanation": "HydroMate खुली हो तभी डिवाइस पै सुणे सै।"
  ,"wakeWord.listening": "“Hey HydroMate” खातर सुण रहा सै"
  ,"wakeWord.paused": "सहायक चालू सै, वेक वर्ड रुका सै"
  ,"wakeWord.permissionRequired": "माइक्रोफोन की अनुमति जरूरी सै"
  ,"wakeWord.unavailable": "इस डिवाइस पै वेक वर्ड उपलब्ध कोन्या"
  ,"wakeWord.foregroundOnly": "फेर सुणण खातर HydroMate खोलो"
  ,"wakeWord.off": "वेक वर्ड बंद सै"
  ,"wakeWord.responseWaitTitle": "जवाब की इंतजार का टाइम"
  ,"wakeWord.responseWaitExplanation": "चुणो के थारे बोलण शुरू करण खातर Ask HydroMate कितणी देर इंतजार करै।"
  ,"wakeWord.secondsShort": "{count} सेकंड"
  ,"wakeWord.custom": "कस्टम"
  ,"wakeWord.customSecondsPlaceholder": "सेकंड"
  ,"wakeWord.saveResponseWait": "सेव करो"
  ,"wakeWord.responseWaitRange": "{min} तै {max} सेकंड के बीच पूरा अंक भरो।"
};
