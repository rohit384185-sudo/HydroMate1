import type { TranslationKey } from "./en";
import { hi } from "./hi";

export const bho: Record<TranslationKey, string> = {
  ...hi,
  "tabs.settings": "सेटिंग",
  "settings.title": "सेटिंग",
  "settings.voiceWakeWord": "आवाज आ वेक वर्ड",
  "settings.languageVoice": "भाषा आ आवाज",
  "settings.reminderCategorySummary": "{total} में से {enabled} गो रिमाइंडर श्रेणी चालू बा",
  "settings.stateOn": "चालू",
  "settings.stateOff": "बंद",
  "settings.profileName": "नाम",
  "settings.profilePhone": "फोन नंबर",
  "settings.profileAge": "उमिर", "settings.profileGender": "लिंग", "settings.profileWeight": "वजन", "settings.notSet": "सेट नइखे", "settings.kilograms": "{amount} किलो",
  "settings.logout": "लॉग आउट", "settings.logoutConfirmTitle": "लॉग आउट करीं?", "settings.logoutConfirmMessage": "रउआ शुरुआती स्क्रीन पर लौटब। रिमाइंडर, इतिहास, पसंद आ स्थानीय आवाज डेटा एह डिवाइस पर रही।", "settings.logoutErrorTitle": "लॉग आउट ना हो सकल", "settings.logoutErrorMessage": "फेर कोशिश करीं।",
  "settings.resetProfile": "प्रोफाइल रीसेट करीं", "settings.resetProfileConfirmTitle": "प्रोफाइल रीसेट करीं?", "settings.resetProfileConfirmMessage": "सहेजल नाम, उमिर, लिंग आ वजन मिट जाई। रिमाइंडर, पानी के इतिहास, पसंद आ आवाज डेटा ना मिटी।",
  "profile.phoneReadOnly": "साइन-इन फोन खाता से नियंत्रित", "profile.optionalFields": "उमिर, लिंग आ वजन वैकल्पिक बा।", "profile.agePlaceholder": "वैकल्पिक, 1–120", "profile.ageError": "1 से 120 के बीच पूरा अंक में उमिर लिखीं चाहे खाली छोड़ीं।", "profile.genderMale": "मरद", "profile.genderFemale": "मेहरारू", "profile.genderPreferNotToSay": "बतावल पसंद नइखे", "profile.weightPlaceholder": "वैकल्पिक, 20–300", "profile.weightError": "20 से 300 किलो के बीच वजन लिखीं चाहे खाली छोड़ीं।",
  "settings.dailyWaterGoal": "रोज के पानी के लक्ष्य",
  "settings.milliliters": "{amount} मि.ली.",
  "settings.wakeWordPrivacyTitle": "वेक वर्ड गोपनीयता",
  "settings.wakeWordPrivacyText": "HydroMate के सुनत घरी वेक-वर्ड पहचान एही डिवाइस पर स्थानीय रूप से होला।",
  "settings.speakerProfileTitle": "स्पीकर वॉइस प्रोफाइल",
  "settings.speakerProfileText": "रउरा दर्ज वॉइस नमूना आ वॉइस प्रोफाइल एही डिवाइस पर रहेला।",
  "settings.deleteVoiceProfile": "वॉइस प्रोफाइल हटाईं",
  "settings.deleteVoiceProfileConfirmTitle": "वॉइस प्रोफाइल हटावल जाव?",
  "settings.deleteVoiceProfileConfirmMessage": "ई वॉइस नमूना हटाई आ खाली-मालिक पहचान बंद करी।",
  "settings.voiceProfileDeleted": "वॉइस प्रोफाइल हटा दिहल गइल।",
  "settings.clearWakeDebugRecordings": "वेक डीबग रिकॉर्डिंग साफ करीं",
  "settings.debugRecordingsClearedTitle": "डीबग रिकॉर्डिंग साफ भइल",
  "settings.debugRecordingsClearedMessage": "{count} गो वेक डीबग रिकॉर्डिंग हटावल गइल।",
  "settings.appInformation": "ऐप जानकारी",
  "settings.versionValue": "वर्जन {version}",
  "settings.buildValue": "बिल्ड {build}",
  "settings.updateErrorTitle": "सेटिंग अपडेट ना हो सकल",
  "settings.updateErrorMessage": "फेर कोशिश करीं।",
  "speakerVerification.title": "खाली हमार आवाज पहिचानीं",
  "speakerVerification.sensitivity": "आवाज मिलान संवेदनशीलता", "speakerVerification.sensitivity.lenient": "ढील", "speakerVerification.sensitivity.balanced": "संतुलित", "speakerVerification.sensitivity.strict": "कड़ा",
  "speakerVerification.off": "बंद",
  "speakerVerification.setupRequired": "आवाज सेटअप जरूरी बा",
  "speakerVerification.ready": "तैयार",
  "speakerVerification.setup": "हमार आवाज सेट अप करीं",
  "speakerVerification.rerecord": "हमार आवाज फेर रिकॉर्ड करीं",
  "speakerVerification.privacy": "रउरा वॉइस प्रोफाइल एही डिवाइस पर रही।",
  "speakerVerification.setupTitle": "हमार आवाज सेट अप करीं",
  "speakerVerification.setupExplanation":
    "एह डिवाइस पर रउरा आवाज पहिचाने खातिर वॉइस सेटअप 'Hey HydroMate' के कुछ नमूना रिकॉर्ड करी।",
  "speakerVerification.continue": "आगे बढ़ीं",
  "speakerVerification.nextStep": "वॉइस नामांकन अगिला चरण में जोड़ल जाई।",
  "speakerVerification.enrollmentInstruction": "'Hey HydroMate' के सहज ढंग से 5 बेर बोलीं।",
  "speakerVerification.sampleProgress": "नमूना {current} / {total}",
  "speakerVerification.listening": "सुनत बा...",
  "speakerVerification.sampleRecorded": "नमूना रिकॉर्ड हो गइल",
  "speakerVerification.readyToRecord": "रिकॉर्ड करे खातिर तैयार",
  "speakerVerification.record": "रिकॉर्ड करीं",
  "speakerVerification.tryAgain": "फेर कोशिश करीं",
  "speakerVerification.useSample": "ई नमूना इस्तेमाल करीं",
  "speakerVerification.errorTitle": "वॉइस सेटअप आगे ना बढ़ सकल",
  "speakerVerification.errorMessage": "रउरा पुरान वॉइस प्रोफाइल ना बदलल गइल। फेर कोशिश करीं।",
  "speakerVerification.completeTitle": "वॉइस सेटअप पूरा भइल",
  "speakerVerification.completeMessage": "रउरा पाँच गो वॉइस नमूना एही डिवाइस पर सेव भइल।",
  "settings.reminderControls": "रिमाइंडर नियंत्रण",
  "settings.profile": "प्रोफाइल",
  "settings.privacy": "गोपनीयता",
  "settings.feedback": "प्रतिक्रिया",
  "voice.waterSpeechAmount": "अब {amount} मिलीलीटर पानी पिए के समय हो गइल बा।",
  "voice.medicineLockedSpeech": "रउआ के दवाई लेवे के समय हो गइल बा।",
  "voice.birthdayLockedSpeech": "आज रउआ खातिर जनमदिन के याद बा।",
  "voice.anniversaryLockedSpeech": "आज रउआ खातिर सालगिरह के याद बा।",
  "voice.customLockedSpeech": "रउआ खातिर एगो याद बा।",
  "common.edit": "बदलीं",
  "common.cancelEdit": "बदलाव रद्द करीं",
  "reminders.editingExisting": "बचावल याद में बदलाव हो रहल बा",
  "reminders.updateMedicine": "दवाई अपडेट करीं",
  "reminders.updateBirthday": "जनमदिन अपडेट करीं",
  "reminders.updateAnniversary": "सालगिरह अपडेट करीं",
  "reminders.updateCustom": "याद अपडेट करीं",
  "reminders.masterTitle": "मुख्य याद",
  "reminders.masterControlsAll": "सब याद के नियंत्रित करेला",
  "reminders.enableWaterReminders": "पानी के याद चालू करीं",
  "reminders.enableMedicineReminders": "दवाई के याद चालू करीं",
  "reminders.enableBirthdayReminders": "जनमदिन के याद चालू करीं",
  "reminders.enableAnniversaryReminders": "सालगिरह के याद चालू करीं",
  "reminders.enableCustomReminders": "अपना हिसाब के याद चालू करीं",
  "reminders.saveWaterSettings": "पानी के सेटिंग बचाईं",
  "reminders.waterSettingsSaved": "पानी के याद के सेटिंग बचा लिहल गइल।",
  "tabs.home":"होम", "tabs.reminders":"याद दिलावे वाला", "common.notAvailable":"मौजूद नइखे", "common.remove":"हटाईं", "common.cancel":"रद्द करीं", "common.done":"हो गइल",
  "home.loading":"HydroMate खुलत बा...", "home.welcome":"HydroMate में रउआ के स्वागत बा", "home.enterName":"आगे बढ़े खातिर आपन नाम लिखीं", "home.yourName":"रउआ के नाम", "home.continue":"आगे बढ़ीं", "home.phoneLater":"फोन बाद में जोड़ के जाँच सकत बानी।", "home.goodMorning":"राम राम, सुप्रभात", "home.goodAfternoon":"नमस्कार", "home.goodEvening":"शुभ साँझ", "home.editProfile":"प्रोफाइल बदलीं", "home.language":"भाषा", "home.selectLanguage":"भाषा चुनीं", "home.tagline":"पानी पीयत रहीं, सेहतमंद रहीं।", "home.todaysWater":"आज के पानी", "home.dailyHistory":"रोज के पानी के हिसाब", "home.sevenDayAverage":"7 दिन के औसत: {amount} ml", "home.goalAchieved":"लक्ष्य पूरा: {achieved} / {total} दिन", "home.currentStreak":"अभी के लगातार दिन: {count} {days} 🔥", "home.bestStreak":"सबसे बढ़िया लगातार दिन: {count} {days} 🏆", "home.weeklyProgress":"हफ्ता के प्रगति: {total} में से {count} लक्ष्य {days}", "home.day":"दिन", "home.days":"दिन", "home.noHistory":"अभी कवनो हिसाब नइखे", "home.percentOfGoal":"लक्ष्य के {percent}%", "home.percentOfTodaysGoal":"आज के लक्ष्य के {percent}%", "home.nextReminder":"अगिला याद", "home.mode":"तरीका: {mode}", "home.smart":"स्मार्ट", "home.fixed":"तय", "home.addWater":"पानी जोड़ीं", "home.custom":"अपना हिसाब से", "home.customWaterPlaceholder":"पानी के मात्रा ml में लिखीं", "home.invalidWater":"सही पानी के मात्रा लिखीं", "home.undoLastWater":"↩ पिछला {amount} ml हटाईं", "home.todaysStatus":"आज के हाल", "home.goalCompleted":"🎉 रोज के लक्ष्य पूरा हो गइल!", "home.litersRemaining":"{amount} L बाकी बा", "home.footer":"हर घूँट जरूरी बा 💙",
  "feedback.rowTitle":"राय भेजीं", "feedback.modalTitle":"बीटा राय", "feedback.typeLabel":"राय के किसिम", "feedback.bug":"दिक्कत", "feedback.suggestion":"सुझाव", "feedback.other":"दूसर", "feedback.messagePlaceholder":"का भइल भा का सुधार चाहीं, बताईं", "feedback.submit":"भेजीं", "feedback.submitting":"भेजल जात बा...", "feedback.requiredTitle":"राय जरूरी बा", "feedback.requiredMessage":"भेजे से पहिले आपन राय लिखीं।", "feedback.thankYou":"रउआ के राय खातिर धन्यवाद।", "feedback.shareFeedback":"राय साझा करीं", "feedback.history":"राय के इतिहास", "feedback.detailsTitle":"राय के पूरा बात", "feedback.back":"पीछे", "feedback.clearHistory":"राय के इतिहास मिटाईं", "feedback.clear":"मिटाईं",
  "voice.rowTitle":"बोल के याद दिलावल", "voice.on":"चालू", "voice.off":"बंद", "voice.modalTitle":"बोल के याद दिलावल", "voice.enabledLabel":"आवाज वाला याद चालू/बंद", "voice.currentLanguage":"अभी के भाषा", "voice.voiceSelection":"आवाज", "voice.systemDefault":"फोन के अपना आवाज", "voice.loadingVoices":"फोन में मौजूद आवाज खोजल जात बा...", "voice.noCompatibleVoices":"मेल खाए वाला आवाज नइखे मिलल।", "voice.testVoice":"आवाज जाँचि", "voice.testingVoice":"आवाज जाँचल जात बा...", "voice.openOnlyInfo":"आवाज वाला याद अभी HydroMate खुलल रहे पर काम करेला। सामान्य नोटिफिकेशन के आवाज चलत रही।", "voice.waterSpeech":"पानी पिए के समय हो गइल बा।", "voice.medicineSpeech":"{name} लेवे के समय हो गइल बा।", "voice.customSpeech":"याद रखीं: {message}", "voice.birthdaySpeech":"आज {name} के जनमदिन बा।", "voice.anniversarySpeech":"आज {name} के सालगिरह बा।", "voice.unavailableTitle":"आवाज मौजूद नइखे", "voice.unavailableMessage":"ए भाषा के आवाज फोन में नइखे। सामान्य नोटिफिकेशन के आवाज चलत रही।",
  "reminders.title":"💧 याद दिलावे के सेटिंग", "reminders.subtitle":"HydroMate कब याद दिलाव, चुनीं।", "reminders.type":"याद के किसिम", "reminders.water":"पानी", "reminders.medicine":"दवाई", "reminders.birthday":"जनमदिन", "reminders.anniversary":"सालगिरह", "reminders.custom":"अपना हिसाब से", "reminders.birthdayName":"जनमदिन वाला नाम", "reminders.birthdayDate":"जनम तारीख", "reminders.savedBirthdays":"बचावल जनमदिन", "reminders.reminderTime":"याद के समय", "reminders.addBirthday":"🎂 जनमदिन जोड़ीं", "reminders.anniversaryName":"सालगिरह के नाम", "reminders.anniversaryDate":"सालगिरह के तारीख", "reminders.addAnniversary":"💍 सालगिरह जोड़ीं", "reminders.savedAnniversaries":"बचावल सालगिरह", "reminders.customName":"याद के नाम", "reminders.reminderDate":"याद के तारीख", "reminders.addCustom":"📝 आपन याद जोड़ीं", "reminders.savedCustom":"बचावल याद", "reminders.healthType":"सेहत वाला याद के किसिम", "reminders.medicineName":"दवाई के नाम", "reminders.addTime":"+ समय जोड़ीं", "reminders.selectTime":"याद के समय चुनीं", "reminders.hour":"घंटा", "reminders.minutes":"मिनट", "reminders.minute":"मिनट", "reminders.customMinute":"अपना हिसाब से", "reminders.selectCustomTime":"आपन समय चुनीं", "reminders.useTime":"ई समय रखीं", "reminders.addMedicine":"💊 दवाई जोड़ीं", "reminders.mode":"याद दिलावे के मोड", "reminders.on":"याद चालू बा", "reminders.off":"याद बंद बा", "reminders.allOff":"सब याद बंद बा", "reminders.savedOn":"बचावल याद चालू बा", "reminders.statusOn":"✅ याद चालू बा", "reminders.statusOff":"⛔ याद बंद बा", "reminders.smartSchedule":"⭐ स्मार्ट समय", "reminders.fixedInterval":"⏰ तय अंतर", "reminders.smartSchedulePlain":"स्मार्ट समय", "reminders.fixedIntervalPlain":"तय अंतर", "reminders.dailyGoal":"रोज के पानी के लक्ष्य (ml)", "reminders.amountPerReminder":"हर याद पर पानी (ml)", "reminders.intervalMinutes":"याद के अंतर (मिनट)", "reminders.startHour":"शुरू के घंटा", "reminders.endHour":"खतम के घंटा", "reminders.summary":"याद के सार", "reminders.summaryMode":"तरीका: {mode}", "reminders.summaryGoal":"रोज के लक्ष्य: {amount} ml", "reminders.summaryAmount":"हर याद पर: {amount} ml", "reminders.summaryTime":"समय: {start} - {end}", "reminders.planned":"तय याद: {count}", "reminders.schedule":"समय: {times}", "reminders.next":"अगिला याद: {time}", "reminders.todaysSchedule":"आज के समय: {times}", "reminders.remaining":"आज बाकी: {count} याद", "reminders.plannedWater":"तय पानी: {amount} ml", "reminders.enableWater":"🔔 पानी के याद चालू करीं", "reminders.disableWater":"🔕 पानी के याद बंद करीं", "reminders.invalidTimeTitle":"समय गलत बा", "reminders.invalidAmountTitle":"मात्रा गलत बा", "reminders.invalidIntervalTitle":"अंतर गलत बा", "reminders.somethingWrong":"कुछ गड़बड़ हो गइल", "reminders.error":"गलती", "reminders.noTime":"समय नइखे", "reminders.invalidTime":"गलत समय"
  ,"tabs.today": "आज"
  ,"today.nextReminder": "अगिला याद"
  ,"today.earlier": "पहिले"
  ,"today.laterToday": "आज बाद में"
  ,"today.upcoming": "आवे वाला"
  ,"today.past": "बीतल"
  ,"today.noMore": "आज अउरी कवनो याद नइखे।"
  ,"today.allCaughtUp": "आज खातिर सभ पूरा हो गइल।"
  ,"today.viewToday": "आज के देखीं"
  ,"today.nextUp": "अगिला"
  ,"today.reminderCount": "{count} गो याद"
  ,"today.summary": "{past} बीतल • {upcoming} आवे वाला"
  ,"today.inMinutes": "{count} मिनट में"
  ,"today.inOneMinute": "1 मिनट में"
  ,"today.dueNow": "अभी"
  ,"today.paused": "याद रोकल बा"
  ,"today.pausedMessage": "आज के समयरेखा देखे खातिर मास्टर रिमाइंडर चालू करीं।"
  ,"today.waterTitle": "{amount} ml पानी पीं"
  ,"today.birthdayTitle": "{name} के जनमदिन"
  ,"today.anniversaryTitle": "{name} के सालगिरह"
  ,"today.take": "ले लीं"
  ,"today.taken": "ले लिहल गइल"
  ,"today.snooze": "बाद में इयाद कराईं"
  ,"today.skip": "छोड़ दीं"
  ,"today.skipped": "छोड़ल गइल"
  ,"today.snoozed": "बाद खातिर रखल गइल"
  ,"today.undo": "वापस करीं"
  ,"today.snoozeFor": "एतना देर बाद इयाद कराईं"
  ,"today.minutesOption": "{count} मिनट"
  ,"today.snoozedReminder": "बाद में इयाद करावे वाला दवाई रिमाइंडर"
  ,"today.actionErrorTitle": "दवाई अपडेट ना हो पावल"
  ,"today.actionErrorMessage": "फेर से कोशिश करीं।"
  ,"today.snoozeErrorMessage": "ए दवाई के रिमाइंडर बाद खातिर ना रखल जा सकल। जाँच लीं कि दवाई रिमाइंडर चालू बा।"
  ,"assistant.openButton": "हे HydroMate"
  ,"assistant.title": "HydroMate से पूछीं"
  ,"assistant.tapToTalk": "बोले खातिर टैप करीं भा रिमाइंडर लिखीं"
  ,"assistant.greetingName": "नमस्ते {name}, रउआ कवन रिमाइंडर जोड़े के चाहत बानी?"
  ,"assistant.greeting": "रउआ कवन रिमाइंडर जोड़े के चाहत बानी?"
  ,"assistant.confirmationTitle": "सेव करे से पहिले ई रिमाइंडर जाँच लीं।"
  ,"assistant.question.category": "ई कवन तरह के रिमाइंडर बा?"
  ,"assistant.question.medicineName": "कवन दवाई?"
  ,"assistant.question.waterAmount": "केतना मिलीलीटर पानी?"
  ,"assistant.question.waterAmountInvalid": "कृपया 10 से 2000 मिलीलीटर के बीच मात्रा बताईं।"
  ,"assistant.question.title": "काहे के इयाद कराईं?"
  ,"assistant.question.date": "कवन तारीख रखीं?"
  ,"assistant.question.time": "कवना समय? AM भा PM भी बताईं।"
  ,"assistant.question.medicineDaily": "दवाई रिमाइंडर अब रोज आवेला। ई दवाई रोज ओही समय जोड़ दीं?"
  ,"assistant.question.unsupportedMedicineDate": "एक बेर वाला तारीख के दवाई रिमाइंडर अभी नइखे। रोज के समय बताईं भा रद्द करीं।"
  ,"assistant.question.pastTime": "आज ऊ समय बीत गइल बा। आगे के समय बताईं भा काल्ह कह दीं।"
  ,"assistant.question.unclear": "हम ना समझ पवनी। फेर कहीं भा रिमाइंडर लिखीं।"
  ,"assistant.speechPermissionDenied": "माइक के अनुमति ना मिलल। नीचे रिमाइंडर लिख सकत बानी।"
  ,"assistant.speechTimeout": "कुछ सुनाई ना पड़ल। फेर कोशिश करीं भा लिखीं।"
  ,"assistant.speechLocaleUnavailable": "ए फोन में एह भाषा के बोली पहचान नइखे। रउआ लिख सकत बानी।"
  ,"assistant.speechUnavailable": "ए फोन में बोली पहचान नइखे। रिमाइंडर लिख सकत बानी।"
  ,"assistant.speechError": "बोली पहचान अचानक रुक गइल। फेर कोशिश करीं भा लिखीं।"
  ,"assistant.waterAmount": "{amount} ml पानी पी लीं"
  ,"assistant.editPrompt": "सुधारल रिमाइंडर बताईं।"
  ,"assistant.cancelled": "ठीक बा, ऊ रिमाइंडर रद्द कर दिहनी।"
  ,"assistant.saved": "हो गइल। रउआ के रिमाइंडर जुड़ गइल बा।"
  ,"assistant.savedMasterOff": "रिमाइंडर सेव बा, बाकिर मास्टर रिमाइंडर अभी बंद बा।"
  ,"assistant.savedCategoryOff": "रिमाइंडर सेव बा, बाकिर {category} रिमाइंडर अभी बंद बा।"
  ,"assistant.saveError": "रिमाइंडर सेव ना हो पावल। का हम फेर कोशिश करीं?"
  ,"assistant.stillListening": "हम अबहियो सुनत बानी। {question}"
  ,"assistant.question.timePeriodSlot": "{time} सुबह के बा कि साँझ के?"
  ,"assistant.youSaid": "रउआ कहलें"
  ,"assistant.yes": "हँ, रोज"
  ,"assistant.no": "ना"
  ,"assistant.understood": "हम समझनी"
  ,"assistant.everyDayAt": "रोज {time} बजे"
  ,"assistant.dateAt": "{date} के {time} बजे"
  ,"assistant.waterReplaceWarning": "पक्का कइला पर अभी वाला पानी शेड्यूल एह एक रोजाना रिमाइंडर से बदल जाई।"
  ,"assistant.repeatsYearly": "ई अभी वाला सालाना रिमाइंडर तरीका इस्तेमाल करेला।"
  ,"assistant.confirm": "पक्का करीं"
  ,"assistant.microphoneTitle": "माइक के अनुमति"
  ,"assistant.microphoneMessage": "Continue टैप कइला के बादे HydroMate माइक चलावेला, एक नतीजा भा छोट टाइमआउट पर रुक जाला आ कच्चा ऑडियो सेव ना करेला।"
  ,"assistant.continue": "आगे बढ़ीं"
  ,"assistant.notNow": "अभी ना"
  ,"assistant.textFallback": "रउआ हमेशा लिख भी सकत बानी।"
  ,"assistant.inputPlaceholder": "रिमाइंडर लिखीं..."
  ,"assistant.send": "भेजीं"
  ,"assistant.listen": "सुनीं"
  ,"assistant.stopListening": "सुनल बंद करीं"
  ,"assistant.listeningWaiting": "सुनत बानी…"
  ,"assistant.listeningSpeech": "सुनत बानी…"
  ,"assistant.listeningConfirmation": "रउआ के पुष्टि सुनत बानी…"
  ,"reminders.routine": "दिनचर्या"
  ,"reminders.routineReminder": "दिनचर्या रिमाइंडर"
  ,"reminders.routineName": "दिनचर्या के नाम"
  ,"reminders.routineExample": "जइसे टहले, खान-पान, ध्यान"
  ,"reminders.routineAdded": "दिनचर्या रिमाइंडर जोड़ दिहल गइल"
  ,"reminders.addRoutine": "📝 दिनचर्या जोड़ीं"
  ,"reminders.savedRoutines": "सहेजल दिनचर्या"
  ,"reminders.updateRoutine": "दिनचर्या अपडेट करीं"
  ,"reminders.enableRoutineReminders": "दिनचर्या रिमाइंडर चालू करीं"
  ,"reminders.duration": "अवधि"
  ,"reminders.oneDay": "1 दिन"
  ,"reminders.threeDays": "3 दिन"
  ,"reminders.fiveDays": "5 दिन"
  ,"reminders.sevenDays": "7 दिन"
  ,"reminders.customDuration": "आपन अवधि"
  ,"reminders.ongoing": "लगातार"
  ,"reminders.days": "दिन"
  ,"reminders.durationDaysPlaceholder": "दिन के गिनती लिखीं"
  ,"reminders.invalidDuration": "दिन के सही धन संख्या लिखीं"
  ,"reminders.durationSummary": "{count} दिन"
  ,"reminders.ongoingHelp": "बदले भा हटावे तक ई रोज चलेला।"
  ,"reminders.legacyRoutineHelp": "अवधि चुने तक ई पुरान रिमाइंडर पहिले वाला सालाना समय पर चली।"
  ,"assistant.question.duration": "ई कतना दिन चली? सही धन संख्या लिखीं।"
  ,"reminders.startDate": "शुरू होखे के तारीख"
  ,"assistant.question.timePeriod": "रउआ के मतलब AM बा कि PM?"
  ,"assistant.speechPermissionBlocked": "माइक के अनुमति बंद बा। Android सेटिंग में चालू करीं भा नीचे लिखीं।"
  ,"assistant.reviewTranscript": "सुनल बात जाँच भा सुधार के भेजीं दबाईं।"
  ,"assistant.understoodCount": "हम {count} रिमाइंडर समझनी"
  ,"assistant.editItemPrompt": "सही रिमाइंडर बताईं। खाली ई ड्राफ्ट बदली।"
  ,"assistant.addAnotherPrompt": "अब कवन रिमाइंडर जोड़े के बा?"
  ,"assistant.addAnother": "एगो अउरी जोड़ीं"
  ,"assistant.confirmAll": "सभ पक्का करीं"
  ,"assistant.savedAll": "हो गइल। {count} रिमाइंडर जुड़ गइल।"
  ,"assistant.savedSomeCategoriesOff": "रिमाइंडर सेव बा। बंद श्रेणी शेड्यूल नइखे भइल।"
  ,"assistant.saveAsPlan": "30 दिन के योजना के रूप में सेव करीं"
  ,"assistant.question.timesPerDay": "दिन में केतना बेर रिमाइंडर चाहीं? एक बेर, 2 बेर, 3 बेर चाहे मनपसंद गिनती बताईं।"
  ,"assistant.question.timesPerDayInvalid": "सिर्फ एक बेर चाहे दिन में 1 से 12 बेर चुनीं।"
  ,"assistant.question.durationDays": "ई रिमाइंडर केतना दिन खातिर रखीं? एक बेर, 7 दिन, 30 दिन चाहे मनपसंद गिनती बताईं।"
  ,"assistant.question.durationDaysInvalid": "1 से 365 दिन के बीच के समय चुनीं।"
  ,"assistant.question.recurrenceTimes": "कवन-कवन समय पर याद कराईं? हर समय के साथ AM चाहे PM बताईं।"
  ,"assistant.question.recurrenceTimesInvalid": "AM चाहे PM के साथ ठीक {count} अलग समय बताईं।"
  ,"assistant.onceChoice": "सिर्फ एक बेर"
  ,"assistant.timesDailyChoice": "दिन में {count} बेर"
  ,"assistant.daysChoice": "{count} दिन"
  ,"assistant.onceSummary": "ई रिमाइंडर सिर्फ एक बेर सेट होई।"
  ,"assistant.recurringSummary": "दिन में {times} बेर, {days} दिन खातिर।"
  ,"assistant.rolloverToday": "{times} बजे के पहिलका रिमाइंडर आज आई।"
  ,"assistant.rolloverTomorrow": "{times} बजे के रिमाइंडर काल्ह से शुरू होई।"
  ,"assistant.rolloverMixed": "{todayTimes} बजे के पहिलका रिमाइंडर आज आई आ {tomorrowTimes} बजे वाला काल्ह से शुरू होई।"
  ,"assistant.explicitTimesSummary": "समय: {times}"
  ,"assistant.question.confirmation": "{summary} का हम ई सेट कर दीं?"
  ,"assistant.question.confirmationInvalid": "का हम ई रिमाइंडर सेट कर दीं? हँ चाहे ना कहीं।"
  ,"assistant.relativeTimeSummary": "{count} मिनट बाद।"
  ,"assistant.defaultPlanName": "स्वास्थ्य रिमाइंडर योजना"
  ,"assistant.planNamePlaceholder": "योजना के नाम"
  ,"assistant.planProgress": "{total} में दिन {day}"
  ,"assistant.planFinished": "रउआ के {name} पूरा हो गइल।"
  ,"assistant.planFinishedQuestion": "अब रउआ का करे के चाहत बानी?"
  ,"assistant.continueDays": "{count} दिन जारी रखीं"
  ,"assistant.updatePlan": "योजना बदलीं"
  ,"assistant.updatePlanPrompt": "सुधारल भा नया रिमाइंडर जोड़ के सभ पक्का करीं।"
  ,"assistant.archivePlan": "योजना संग्रहित करीं"
  ,"assistant.microphoneSettingsTitle": "माइक के अनुमति बंद बा"
  ,"assistant.microphoneSettingsMessage": "Android सेटिंग › ऐप › HydroMate › अनुमति में माइक चालू करीं। लिख के दे सकत बानी।"
  ,"assistant.continueCustom": "अपना अवधि"
  ,"assistant.customContinuePrompt": "ई योजना अउरी कतना दिन चली?"
  ,"assistant.planContinued": "योजना {count} दिन अउरी चली।"
  ,"assistant.recentReviewCount": "रउआ के {count} रिमाइंडर समीक्षा खातिर तैयार बा।"
  ,"assistant.reviewRecent": "हाल के रिमाइंडर देखीं"
  ,"assistant.recentReminders": "हाल के Ask HydroMate रिमाइंडर"
  ,"assistant.hideRecent": "छिपाईं"
  ,"assistant.showRecent": "{count} देखीं"
  ,"assistant.readyForReview": "समीक्षा खातिर तैयार"
  ,"assistant.addedToday": "आज जोड़ल गइल"
  ,"assistant.addedDaysAgo": "{count} दिन पहिले जोड़ल गइल"
  ,"assistant.recentSevenDayMessage": "ई रिमाइंडर 7 दिन से हाल के सूची में बा।"
  ,"assistant.keepRecent": "रखीं"
  ,"assistant.removeFromRecent": "हाल के सूची से हटाईं"
  ,"assistant.reviewAgainSevenDays": "रखल गइल। 7 दिन बाद फेर पूछब।"
  ,"wakeWord.title": "Hey HydroMate वेक वर्ड"
  ,"wakeWord.consentTitle": "Hey HydroMate चालू करीं?"
  ,"wakeWord.privacyExplanation": "चालू रहला पर HydroMate ऐप खुलल होखे त खाली “Hey HydroMate” पहिचाने खातिर माइक्रोफोन इस्तेमाल करेला। वेक ऑडियो एही डिवाइस पर प्रोसेस होला, ना सेव होला ना अपलोड। पूरा बोली पहचान वेक वाक्य के बाद भा Listen दबवला परे शुरू होला।"
  ,"wakeWord.batteryNotice": "वेक वर्ड सुने में जादे बैटरी लाग सकेला। रउआ कबो बंद कर सकीं।"
  ,"wakeWord.enable": "वेक वर्ड चालू करीं"
  ,"wakeWord.foregroundExplanation": "HydroMate खुलल होखे त एही डिवाइस पर सुनेला।"
  ,"wakeWord.listening": "“Hey HydroMate” खातिर सुनत बा"
  ,"wakeWord.paused": "सहायक चालू बा, वेक वर्ड रुकल बा"
  ,"wakeWord.permissionRequired": "माइक्रोफोन अनुमति जरूरी बा"
  ,"wakeWord.unavailable": "ए डिवाइस पर वेक वर्ड उपलब्ध नइखे"
  ,"wakeWord.foregroundOnly": "फेर सुने खातिर HydroMate खोलीं"
  ,"wakeWord.off": "वेक वर्ड बंद बा"
  ,"wakeWord.responseWaitTitle": "जवाब के इंतजार समय"
  ,"wakeWord.responseWaitExplanation": "चुनीं कि रउआ बोले शुरू करीं तबले Ask HydroMate केतना देर इंतजार करे।"
  ,"wakeWord.secondsShort": "{count} सेकंड"
  ,"wakeWord.custom": "कस्टम"
  ,"wakeWord.customSecondsPlaceholder": "सेकंड"
  ,"wakeWord.saveResponseWait": "सेव करीं"
  ,"wakeWord.responseWaitRange": "{min} से {max} सेकंड के बीच पूरा अंक डालीं।"
};
