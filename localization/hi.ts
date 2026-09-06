import type { TranslationKey } from "./en";

export const hi: Record<TranslationKey, string> = {
  "tabs.settings": "सेटिंग्स",
  "settings.title": "सेटिंग्स",
  "settings.voiceWakeWord": "आवाज़ और वेक वर्ड",
  "settings.languageVoice": "भाषा और आवाज़",
  "settings.reminderCategorySummary": "{total} में से {enabled} रिमाइंडर श्रेणियाँ चालू हैं",
  "settings.stateOn": "चालू",
  "settings.stateOff": "बंद",
  "settings.profileName": "नाम",
  "settings.profilePhone": "फ़ोन नंबर",
  "settings.profileAge": "उम्र",
  "settings.profileGender": "लिंग",
  "settings.profileWeight": "वज़न",
  "settings.notSet": "सेट नहीं है",
  "settings.kilograms": "{amount} किग्रा",
  "settings.logout": "लॉग आउट",
  "settings.logoutConfirmTitle": "लॉग आउट करें?",
  "settings.logoutConfirmMessage": "आप शुरुआती स्क्रीन पर लौटेंगे। आपके रिमाइंडर, इतिहास, पसंद और स्थानीय वॉइस डेटा इस डिवाइस पर रहेंगे।",
  "settings.logoutErrorTitle": "लॉग आउट नहीं हो सका",
  "settings.logoutErrorMessage": "कृपया फिर कोशिश करें।",
  "settings.resetProfile": "प्रोफ़ाइल रीसेट करें",
  "settings.resetProfileConfirmTitle": "प्रोफ़ाइल रीसेट करें?",
  "settings.resetProfileConfirmMessage": "इससे आपका सहेजा नाम, उम्र, लिंग और वज़न हटेगा। रिमाइंडर, पानी का इतिहास, पसंद और वॉइस डेटा नहीं हटेंगे।",
  "profile.phoneReadOnly": "आपके साइन-इन फ़ोन खाते द्वारा प्रबंधित",
  "profile.optionalFields": "उम्र, लिंग और वज़न वैकल्पिक हैं।",
  "profile.agePlaceholder": "वैकल्पिक, 1–120",
  "profile.ageError": "1 से 120 तक पूरी संख्या में उम्र दर्ज करें या खाली छोड़ें।",
  "profile.genderMale": "पुरुष",
  "profile.genderFemale": "महिला",
  "profile.genderPreferNotToSay": "बताना नहीं चाहते",
  "profile.weightPlaceholder": "वैकल्पिक, 20–300",
  "profile.weightError": "20 से 300 किग्रा तक वज़न दर्ज करें या खाली छोड़ें।",
  "settings.dailyWaterGoal": "दैनिक पानी का लक्ष्य",
  "settings.milliliters": "{amount} मि.ली.",
  "settings.wakeWordPrivacyTitle": "वेक वर्ड गोपनीयता",
  "settings.wakeWordPrivacyText": "HydroMate के सुनते समय वेक-वर्ड पहचान इसी डिवाइस पर स्थानीय रूप से संसाधित होती है।",
  "settings.speakerProfileTitle": "स्पीकर वॉइस प्रोफ़ाइल",
  "settings.speakerProfileText": "आपके नामांकित वॉइस नमूने और वॉइस प्रोफ़ाइल इसी डिवाइस पर रहते हैं।",
  "settings.deleteVoiceProfile": "वॉइस प्रोफ़ाइल हटाएँ",
  "settings.deleteVoiceProfileConfirmTitle": "वॉइस प्रोफ़ाइल हटाएँ?",
  "settings.deleteVoiceProfileConfirmMessage": "यह आपके वॉइस नमूने हटाएगा और केवल-मालिक पहचान बंद कर देगा।",
  "settings.voiceProfileDeleted": "वॉइस प्रोफ़ाइल हटा दी गई।",
  "settings.clearWakeDebugRecordings": "वेक डीबग रिकॉर्डिंग साफ़ करें",
  "settings.debugRecordingsClearedTitle": "डीबग रिकॉर्डिंग साफ़ हुईं",
  "settings.debugRecordingsClearedMessage": "{count} वेक डीबग रिकॉर्डिंग हटाई गईं।",
  "settings.appInformation": "ऐप जानकारी",
  "settings.versionValue": "संस्करण {version}",
  "settings.buildValue": "बिल्ड {build}",
  "settings.updateErrorTitle": "सेटिंग अपडेट नहीं हुई",
  "settings.updateErrorMessage": "कृपया फिर से कोशिश करें।",
  "speakerVerification.title": "केवल मेरी आवाज़ पहचानें",
  "speakerVerification.sensitivity": "आवाज़ मिलान संवेदनशीलता", "speakerVerification.sensitivity.lenient": "उदार", "speakerVerification.sensitivity.balanced": "संतुलित", "speakerVerification.sensitivity.strict": "सख़्त",
  "speakerVerification.off": "बंद",
  "speakerVerification.setupRequired": "आवाज़ सेटअप आवश्यक है",
  "speakerVerification.ready": "तैयार",
  "speakerVerification.setup": "मेरी आवाज़ सेट अप करें",
  "speakerVerification.rerecord": "मेरी आवाज़ फिर से रिकॉर्ड करें",
  "speakerVerification.privacy": "आपकी वॉइस प्रोफ़ाइल इसी डिवाइस पर रहेगी।",
  "speakerVerification.setupTitle": "मेरी आवाज़ सेट अप करें",
  "speakerVerification.setupExplanation":
    "इस डिवाइस पर आपकी आवाज़ पहचानने के लिए वॉइस सेटअप 'Hey HydroMate' के कुछ नमूने रिकॉर्ड करेगा।",
  "speakerVerification.continue": "जारी रखें",
  "speakerVerification.nextStep": "वॉइस नामांकन अगले चरण में जोड़ा जाएगा।",
  "speakerVerification.enrollmentInstruction": "'Hey HydroMate' स्वाभाविक रूप से 5 बार बोलें।",
  "speakerVerification.sampleProgress": "नमूना {current} / {total}",
  "speakerVerification.listening": "सुन रहा है...",
  "speakerVerification.sampleRecorded": "नमूना रिकॉर्ड हो गया",
  "speakerVerification.readyToRecord": "रिकॉर्ड करने के लिए तैयार",
  "speakerVerification.record": "रिकॉर्ड करें",
  "speakerVerification.tryAgain": "फिर से कोशिश करें",
  "speakerVerification.useSample": "इस नमूने का उपयोग करें",
  "speakerVerification.errorTitle": "वॉइस सेटअप जारी नहीं रह सका",
  "speakerVerification.errorMessage": "आपकी मौजूदा वॉइस प्रोफ़ाइल नहीं बदली गई। फिर से कोशिश करें।",
  "speakerVerification.completeTitle": "वॉइस सेटअप पूरा हुआ",
  "speakerVerification.completeMessage": "आपके पाँच वॉइस नमूने इस डिवाइस पर सहेजे गए।",
  "settings.reminderControls": "रिमाइंडर नियंत्रण",
  "settings.profile": "प्रोफ़ाइल",
  "settings.privacy": "गोपनीयता",
  "settings.feedback": "फ़ीडबैक",
  "voice.waterSpeechAmount": "अब {amount} मिलीलीटर पानी पीने का समय है।",
  "voice.medicineLockedSpeech": "आपकी दवा लेने का समय हो गया है।",
  "voice.birthdayLockedSpeech": "आज आपके लिए जन्मदिन का रिमाइंडर है।",
  "voice.anniversaryLockedSpeech": "आज आपके लिए सालगिरह का रिमाइंडर है।",
  "voice.customLockedSpeech": "आपके लिए एक रिमाइंडर है।",
  "common.edit": "संपादित करें",
  "common.cancelEdit": "संपादन रद्द करें",
  "reminders.editingExisting": "सहेजे गए रिमाइंडर को संपादित कर रहे हैं",
  "reminders.updateMedicine": "दवा अपडेट करें",
  "reminders.updateBirthday": "जन्मदिन अपडेट करें",
  "reminders.updateAnniversary": "सालगिरह अपडेट करें",
  "reminders.updateCustom": "रिमाइंडर अपडेट करें",
  "reminders.masterTitle": "मुख्य रिमाइंडर",
  "reminders.masterControlsAll": "सभी रिमाइंडर नियंत्रित करता है",
  "reminders.enableWaterReminders": "पानी के रिमाइंडर चालू करें",
  "reminders.enableMedicineReminders": "दवा के रिमाइंडर चालू करें",
  "reminders.enableBirthdayReminders": "जन्मदिन के रिमाइंडर चालू करें",
  "reminders.enableAnniversaryReminders": "सालगिरह के रिमाइंडर चालू करें",
  "reminders.enableCustomReminders": "कस्टम रिमाइंडर चालू करें",
  "reminders.saveWaterSettings": "पानी की सेटिंग सहेजें",
  "reminders.waterSettingsSaved": "पानी के रिमाइंडर की सेटिंग सहेजी गई।",
  "tabs.home": "होम",
  "tabs.reminders": "रिमाइंडर",
  "common.notAvailable": "उपलब्ध नहीं",
  "common.remove": "हटाएँ",
  "common.cancel": "रद्द करें",
  "common.done": "पुष्टि करें",
  "common.am": "पूर्वाह्न",
  "common.pm": "अपराह्न",
  "home.loading": "HydroMate लोड हो रहा है...",
  "home.welcome": "HydroMate में आपका स्वागत है",
  "home.enterName": "जारी रखने के लिए अपना नाम दर्ज करें",
  "home.yourName": "आपका नाम",
  "home.continue": "जारी रखें",
  "home.phoneLater": "आप बाद में अपना फ़ोन नंबर जोड़ और सत्यापित कर सकते हैं।",
  "home.goodMorning": "सुप्रभात",
  "home.goodAfternoon": "नमस्कार",
  "home.goodEvening": "शुभ संध्या",
  "home.editProfile": "प्रोफ़ाइल संपादित करें",
  "home.language": "भाषा",
  "home.selectLanguage": "भाषा चुनें",
  "home.tagline": "हाइड्रेटेड रहें, स्वस्थ रहें।",
  "home.todaysWater": "आज का पानी",
  "home.dailyHistory": "दैनिक पानी का इतिहास",
  "home.sevenDayAverage": "7-दिन का औसत: {amount} मि.ली.",
  "home.goalAchieved": "लक्ष्य पूरा: {achieved} / {total} दिन",
  "home.currentStreak": "वर्तमान सिलसिला: {count} {days} 🔥",
  "home.bestStreak": "सर्वश्रेष्ठ सिलसिला: {count} {days} 🏆",
  "home.weeklyProgress": "साप्ताहिक प्रगति: {total} में से {count} लक्ष्य {days}",
  "home.day": "दिन",
  "home.days": "दिन",
  "home.noHistory": "अभी कोई इतिहास नहीं",
  "home.percentOfGoal": "लक्ष्य का {percent}%",
  "home.percentOfTodaysGoal": "आज के लक्ष्य का {percent}%",
  "home.nextReminder": "अगला रिमाइंडर",
  "home.mode": "मोड: {mode}",
  "home.smart": "स्मार्ट",
  "home.fixed": "निश्चित",
  "home.addWater": "पानी जोड़ें",
  "home.custom": "अन्य मात्रा",
  "home.customWaterPlaceholder": "पानी की मात्रा मि.ली. में दर्ज करें",
  "home.invalidWater": "कृपया पानी की सही मात्रा दर्ज करें",
  "home.undoLastWater": "↩ पिछली {amount} मि.ली. प्रविष्टि हटाएँ",
  "home.todaysStatus": "आज की स्थिति",
  "home.goalCompleted": "🎉 दैनिक लक्ष्य पूरा हुआ!",
  "home.litersRemaining": "{amount} लीटर शेष",
  "home.footer": "हर घूंट मायने रखता है 💙",
  "home.enterYourName": "कृपया अपना नाम दर्ज करें",
  "home.otpSent": "OTP सफलतापूर्वक भेजा गया",
  "home.otpError": "OTP त्रुटि\n\nकोड: {code}\n\n{message}",
  "home.unknown": "अज्ञात",
  "home.unknownError": "अज्ञात त्रुटि",
  "home.sendOtpFirst": "कृपया पहले OTP भेजें",
  "home.phoneVerified": "फ़ोन नंबर सफलतापूर्वक सत्यापित हुआ",
  "home.invalidOtp": "OTP अमान्य है। कृपया फिर प्रयास करें।",
  "home.verifyPhoneFirst": "कृपया पहले अपना फ़ोन नंबर सत्यापित करें",
  "home.invalidPhone": "कृपया 10 अंकों का सही फ़ोन नंबर दर्ज करें",
  "feedback.rowTitle": "फ़ीडबैक भेजें",
  "feedback.modalTitle": "बीटा फ़ीडबैक",
  "feedback.typeLabel": "फ़ीडबैक का प्रकार",
  "feedback.bug": "बग",
  "feedback.suggestion": "सुझाव",
  "feedback.other": "अन्य",
  "feedback.messagePlaceholder": "हमें बताएं कि क्या हुआ या आप क्या सुधारना चाहते हैं",
  "feedback.submit": "भेजें",
  "feedback.submitting": "भेजा जा रहा है...",
  "feedback.requiredTitle": "फ़ीडबैक आवश्यक है",
  "feedback.requiredMessage": "कृपया भेजने से पहले अपना फ़ीडबैक दर्ज करें।",
  "feedback.thankYou": "आपके फ़ीडबैक के लिए धन्यवाद।",
  "feedback.saveErrorTitle": "फ़ीडबैक सहेजा नहीं जा सका",
  "feedback.saveError": "कृपया फिर से प्रयास करें।",
  "feedback.shareFeedback": "फ़ीडबैक साझा करें",
  "feedback.sharePrompt": "आपका फ़ीडबैक स्थानीय रूप से सहेज लिया गया है। क्या आप इसे साझा करना चाहते हैं?",
  "feedback.later": "बाद में",
  "feedback.shareHeading": "HydroMate बीटा फ़ीडबैक",
  "feedback.shareType": "प्रकार",
  "feedback.shareMessage": "संदेश",
  "feedback.shareLanguage": "भाषा",
  "feedback.shareDateTime": "दिनांक/समय",
  "feedback.shareAppVersion": "ऐप संस्करण",
  "feedback.shareErrorTitle": "फ़ीडबैक साझा नहीं किया जा सका",
  "feedback.shareError": "कृपया फिर से प्रयास करें।",
  "feedback.history": "फ़ीडबैक इतिहास",
  "feedback.historyLoading": "फ़ीडबैक इतिहास लोड हो रहा है...",
  "feedback.historyEmpty": "अभी कोई सहेजा गया फ़ीडबैक नहीं है।",
  "feedback.detailsTitle": "फ़ीडबैक विवरण",
  "feedback.back": "वापस",
  "feedback.clearHistory": "फ़ीडबैक इतिहास साफ़ करें",
  "feedback.clearConfirmTitle": "फ़ीडबैक इतिहास साफ़ करें?",
  "feedback.clearConfirmMessage": "यह स्थानीय रूप से सहेजे गए सभी फ़ीडबैक को स्थायी रूप से हटा देगा।",
  "feedback.clear": "साफ़ करें",
  "feedback.historyCleared": "फ़ीडबैक इतिहास साफ़ कर दिया गया।",
  "feedback.historyErrorTitle": "फ़ीडबैक इतिहास लोड नहीं किया जा सका",
  "feedback.historyError": "कृपया फिर से प्रयास करें।",
  "feedback.clearErrorTitle": "फ़ीडबैक इतिहास साफ़ नहीं किया जा सका",
  "feedback.clearError": "कृपया फिर से प्रयास करें।",
  "feedback.languageEnglish": "अंग्रेज़ी",
  "feedback.languageHindi": "हिंदी",
  "voice.rowTitle": "वॉइस रिमाइंडर",
  "voice.on": "चालू",
  "voice.off": "बंद",
  "voice.modalTitle": "वॉइस रिमाइंडर",
  "voice.enabledLabel": "वॉइस रिमाइंडर चालू/बंद",
  "voice.currentLanguage": "वर्तमान भाषा",
  "voice.languageEnglish": "अंग्रेज़ी",
  "voice.languageHindi": "हिंदी",
  "voice.voiceSelection": "आवाज़",
  "voice.systemDefault": "सिस्टम डिफ़ॉल्ट",
  "voice.loadingVoices": "इंस्टॉल की गई आवाज़ें लोड हो रही हैं...",
  "voice.noCompatibleVoices": "कोई संगत इंस्टॉल की गई आवाज़ नहीं मिली।",
  "voice.testVoice": "आवाज़ जाँचें",
  "voice.testingVoice": "आवाज़ जाँची जा रही है...",
  "voice.openOnlyInfo": "वॉइस रिमाइंडर अभी केवल HydroMate खुला होने पर काम करते हैं। सामान्य नोटिफ़िकेशन ध्वनि काम करती रहेगी।",
  "voice.waterSpeech": "पानी पीने का समय हो गया है।",
  "voice.medicineSpeech": "{name} लेने का समय हो गया है।",
  "voice.customSpeech": "याद दिलाना: {message}",
  "voice.birthdaySpeech": "आज {name} का जन्मदिन है।",
  "voice.anniversarySpeech": "आज {name} की सालगिरह है।",
  "voice.unavailableTitle": "आवाज़ उपलब्ध नहीं है",
  "voice.unavailableMessage": "वर्तमान भाषा के लिए कोई संगत आवाज़ इंस्टॉल नहीं है। सामान्य नोटिफ़िकेशन ध्वनि काम करती रहेगी।",
  "voice.busyTitle": "आवाज़ अभी व्यस्त है",
  "voice.busyMessage": "कृपया मौजूदा आवाज़ पूरी होने तक प्रतीक्षा करें और फिर प्रयास करें।",
  "voice.testErrorTitle": "आवाज़ की जाँच नहीं हो सकी",
  "voice.testErrorMessage": "कृपया डिवाइस की टेक्स्ट-टू-स्पीच सेटिंग जाँचें और फिर प्रयास करें।",
  "voice.saveErrorTitle": "वॉइस सेटिंग सहेजी नहीं जा सकी",
  "voice.saveErrorMessage": "कृपया फिर से प्रयास करें।",
  "reminders.title": "💧 रिमाइंडर सेटिंग्स",
  "reminders.subtitle": "चुनें कि HydroMate आपको कब याद दिलाए।",
  "reminders.type": "रिमाइंडर प्रकार",
  "reminders.water": "पानी",
  "reminders.medicine": "दवा",
  "reminders.birthday": "जन्मदिन",
  "reminders.anniversary": "सालगिरह",
  "reminders.custom": "कस्टम",
  "reminders.birthdayName": "जन्मदिन का नाम",
  "reminders.birthdayExample": "जैसे रोहित",
  "reminders.birthdayDate": "जन्मदिन की तारीख",
  "reminders.savedBirthdays": "सहेजे गए जन्मदिन",
  "reminders.reminderTime": "रिमाइंडर का समय",
  "reminders.enterBirthdayName": "कृपया जन्मदिन का नाम दर्ज करें",
  "reminders.enterBirthdayDate": "कृपया जन्मदिन की तारीख DD/MM में दर्ज करें",
  "reminders.enterTime": "कृपया समय HH:MM में दर्ज करें",
  "reminders.birthdayAdded": "जन्मदिन रिमाइंडर जोड़ दिया गया",
  "reminders.addBirthday": "🎂 जन्मदिन जोड़ें",
  "reminders.anniversaryName": "सालगिरह का नाम",
  "reminders.anniversaryExample": "जैसे रोहित और आकृति",
  "reminders.anniversaryDate": "सालगिरह की तारीख",
  "reminders.enterAnniversaryName": "कृपया सालगिरह का नाम दर्ज करें",
  "reminders.invalidAnniversaryDate": "कृपया सालगिरह की सही तारीख दर्ज करें",
  "reminders.anniversaryAdded": "सालगिरह रिमाइंडर जोड़ दिया गया",
  "reminders.addAnniversary": "💍 सालगिरह जोड़ें",
  "reminders.savedAnniversaries": "सहेजी गई सालगिरहें",
  "reminders.customName": "कस्टम रिमाइंडर का नाम",
  "reminders.customExample": "जैसे डॉक्टर को फ़ोन करें",
  "reminders.reminderDate": "रिमाइंडर की तारीख",
  "reminders.enterReminderName": "कृपया रिमाइंडर का नाम दर्ज करें",
  "reminders.invalidDate": "कृपया सही तारीख दर्ज करें",
  "reminders.customAdded": "कस्टम रिमाइंडर जोड़ दिया गया",
  "reminders.addCustom": "📝 कस्टम रिमाइंडर जोड़ें",
  "reminders.savedCustom": "सहेजे गए कस्टम रिमाइंडर",
  "reminders.healthType": "स्वास्थ्य रिमाइंडर प्रकार",
  "reminders.tablet": "💊 गोली",
  "reminders.cream": "🧴 क्रीम",
  "reminders.drops": "💧 ड्रॉप्स",
  "reminders.injection": "💉 इंजेक्शन",
  "reminders.other": "🩹 अन्य",
  "reminders.medicineName": "दवा का नाम",
  "reminders.medicineExample": "जैसे विटामिन D, BP की दवा",
  "reminders.addTime": "+ समय जोड़ें",
  "reminders.selectTime": "रिमाइंडर का समय चुनें",
  "reminders.hour": "घंटा",
  "reminders.minutes": "मिनट",
  "reminders.minute": "मिनट",
  "reminders.customMinute": "कस्टम",
  "reminders.selectCustomTime": "कस्टम समय चुनें",
  "reminders.useTime": "यह समय चुनें",
  "reminders.timesDaily": "⏰ रोज़ {count} {times}",
  "reminders.time": "बार",
  "reminders.times": "बार",
  "reminders.enterMedicineName": "कृपया दवा का नाम दर्ज करें",
  "reminders.addReminderTime": "कृपया रिमाइंडर का समय जोड़ें",
  "reminders.addMedicine": "💊 दवा जोड़ें",
  "reminders.mode": "रिमाइंडर मोड",
  "reminders.on": "रिमाइंडर चालू",
  "reminders.off": "रिमाइंडर बंद",
  "reminders.allOff": "सभी रिमाइंडर बंद कर दिए गए हैं",
  "reminders.savedOn": "सहेजे गए रिमाइंडर चालू कर दिए गए हैं",
  "reminders.statusOn": "✅ रिमाइंडर चालू",
  "reminders.statusOff": "⛔ रिमाइंडर बंद",
  "reminders.smartSchedule": "⭐ स्मार्ट शेड्यूल",
  "reminders.fixedInterval": "⏰ निश्चित अंतराल",
  "reminders.smartSchedulePlain": "स्मार्ट शेड्यूल",
  "reminders.fixedIntervalPlain": "निश्चित अंतराल",
  "reminders.dailyGoal": "दैनिक पानी का लक्ष्य (मि.ली.)",
  "reminders.amountPerReminder": "प्रति रिमाइंडर मात्रा (मि.ली.)",
  "reminders.intervalMinutes": "रिमाइंडर अंतराल (मिनट)",
  "reminders.startHour": "शुरू होने का समय",
  "reminders.endHour": "समाप्ति का समय",
  "reminders.endAfterStart": "समाप्ति का समय शुरू होने के समय से बाद का होना चाहिए।",
  "reminders.summary": "रिमाइंडर सारांश",
  "reminders.summaryMode": "मोड: {mode}",
  "reminders.summaryGoal": "दैनिक लक्ष्य: {amount} मि.ली.",
  "reminders.summaryAmount": "प्रति रिमाइंडर मात्रा: {amount} मि.ली.",
  "reminders.summaryTime": "समय: {start} - {end}",
  "reminders.smartInfo": "⭐ आपके दैनिक लक्ष्य को पूरा करने में मदद के लिए HydroMate इस समयावधि में रिमाइंडर अपने-आप बाँटेगा।",
  "reminders.planned": "नियोजित रिमाइंडर: {count}",
  "reminders.schedule": "शेड्यूल: {times}",
  "reminders.next": "अगला रिमाइंडर: {time}",
  "reminders.interval": "अंतराल: हर {minutes} मिनट",
  "reminders.todaysSchedule": "आज का शेड्यूल: {times}",
  "reminders.remaining": "आज शेष: {count} रिमाइंडर",
  "reminders.plannedWater": "नियोजित पानी: {amount} मि.ली.",
  "reminders.perfectMatch": "🎯 बिल्कुल सही! आपका शेड्यूल ठीक {amount} मि.ली. देता है—लक्ष्य के अनुसार।",
  "reminders.goalCovered": "🎉 लक्ष्य पूरा! आपकी योजना {planned} मि.ली. देती है, जो {goal} मि.ली. के दैनिक लक्ष्य को पूरा करती है।",
  "reminders.aboveGoal": "💧 आप लक्ष्य से {amount} मि.ली. ऊपर हैं—यह योजना रख सकते हैं या अंतराल थोड़ा बढ़ा सकते हैं।",
  "reminders.hydrationCheck": "💧 हाइड्रेशन जाँच! केवल {planned} रिमाइंडर नियोजित हैं, लेकिन लक्ष्य के लिए {needed} चाहिए। ⭐ स्मार्ट शेड्यूल आज़माएँ या अंतराल घटाएँ!",
  "reminders.meetsGoal": "✅ यह शेड्यूल आपका दैनिक लक्ष्य पूरा करता है।",
  "reminders.exceedsGoal": "⚠️ यह शेड्यूल दैनिक लक्ष्य से {amount} मि.ली. अधिक है।",
  "reminders.enableWater": "🔔 पानी के रिमाइंडर चालू करें",
  "reminders.disableWater": "🔕 पानी के रिमाइंडर बंद करें",
  "reminders.invalidTimeTitle": "समय अमान्य है",
  "reminders.invalidAmountTitle": "मात्रा अमान्य है",
  "reminders.invalidAmount": "दैनिक लक्ष्य और प्रति रिमाइंडर मात्रा 0 से अधिक होनी चाहिए।",
  "reminders.invalidIntervalTitle": "अंतराल अमान्य है",
  "reminders.invalidInterval": "रिमाइंडर अंतराल 0 से अधिक होना चाहिए।",
  "reminders.scheduled": "{count} रिमाइंडर शेड्यूल हुए।\n\nकुल नियोजित: {amount} मि.ली.",
  "reminders.somethingWrong": "कुछ गलत हुआ",
  "reminders.scheduleFailed": "आपके रिमाइंडर सहेजे या शेड्यूल नहीं किए जा सके।",
  "reminders.waterOff": "पानी के रिमाइंडर बंद कर दिए गए हैं।",
  "reminders.error": "त्रुटि",
  "reminders.turnOffFailed": "रिमाइंडर बंद नहीं किए जा सके।",
  "reminders.noTime": "कोई समय नहीं",
  "reminders.invalidTime": "समय अमान्य है"
  ,"tabs.today": "आज"
  ,"today.nextReminder": "अगला रिमाइंडर"
  ,"today.earlier": "पहले"
  ,"today.laterToday": "आज बाद में"
  ,"today.upcoming": "आगामी"
  ,"today.past": "बीता हुआ"
  ,"today.noMore": "आज कोई और रिमाइंडर नहीं है।"
  ,"today.allCaughtUp": "आज के लिए सब पूरा हो गया।"
  ,"today.viewToday": "आज देखें"
  ,"today.nextUp": "अगला"
  ,"today.reminderCount": "{count} रिमाइंडर"
  ,"today.summary": "{past} बीते • {upcoming} आगामी"
  ,"today.inMinutes": "{count} मिनट में"
  ,"today.inOneMinute": "1 मिनट में"
  ,"today.dueNow": "अभी"
  ,"today.paused": "रिमाइंडर रुके हुए हैं"
  ,"today.pausedMessage": "आज की समयरेखा देखने के लिए मास्टर रिमाइंडर चालू करें।"
  ,"today.waterTitle": "{amount} ml पानी पिएँ"
  ,"today.birthdayTitle": "{name} का जन्मदिन"
  ,"today.anniversaryTitle": "{name} की सालगिरह"
  ,"today.take": "ले लें"
  ,"today.taken": "ले ली"
  ,"today.snooze": "बाद में याद दिलाएँ"
  ,"today.skip": "छोड़ें"
  ,"today.skipped": "छोड़ा गया"
  ,"today.snoozed": "बाद के लिए रखा"
  ,"today.undo": "वापस करें"
  ,"today.snoozeFor": "इतनी देर बाद याद दिलाएँ"
  ,"today.minutesOption": "{count} मिनट"
  ,"today.snoozedReminder": "बाद में याद दिलाने वाला रिमाइंडर"
  ,"today.actionErrorTitle": "दवा अपडेट नहीं हुई"
  ,"today.actionErrorMessage": "कृपया फिर से कोशिश करें।"
  ,"today.snoozeErrorMessage": "इस दवा को बाद के लिए नहीं रखा जा सका। जाँचें कि दवा रिमाइंडर चालू हैं।"
  ,"assistant.openButton": "हे HydroMate"
  ,"assistant.title": "HydroMate से पूछें"
  ,"assistant.tapToTalk": "बोलने के लिए टैप करें या रिमाइंडर लिखें"
  ,"assistant.greetingName": "नमस्ते {name}, आप कौन सा रिमाइंडर जोड़ना चाहते हैं?"
  ,"assistant.greeting": "आप कौन सा रिमाइंडर जोड़ना चाहते हैं?"
  ,"assistant.confirmationTitle": "सेव करने से पहले इस रिमाइंडर को जाँच लें।"
  ,"assistant.question.category": "यह किस तरह का रिमाइंडर है?"
  ,"assistant.question.medicineName": "कौन सी दवा?"
  ,"assistant.question.waterAmount": "कितना पानी, मिलीलीटर में?"
  ,"assistant.question.waterAmountInvalid": "कृपया 10 से 2000 मिलीलीटर के बीच मात्रा बताएं।"
  ,"assistant.question.title": "मैं आपको किस बारे में याद दिलाऊँ?"
  ,"assistant.question.date": "कौन सी तारीख रखूँ?"
  ,"assistant.question.time": "किस समय? कृपया AM या PM भी बताएँ।"
  ,"assistant.question.medicineDaily": "दवा रिमाइंडर अभी रोज दोहरते हैं। इसे हर दिन इसी समय जोड़ें?"
  ,"assistant.question.unsupportedMedicineDate": "एक बार का तारीख वाला दवा रिमाइंडर अभी उपलब्ध नहीं है। रोज का समय बताएँ या रद्द करें।"
  ,"assistant.question.pastTime": "आज यह समय बीत चुका है। आगे का समय बताएँ या कल कहें।"
  ,"assistant.question.unclear": "मैं समझ नहीं पाया। फिर से बोलें या रिमाइंडर लिखें।"
  ,"assistant.speechPermissionDenied": "माइक्रोफोन की अनुमति नहीं मिली। आप नीचे रिमाइंडर लिख सकते हैं।"
  ,"assistant.speechTimeout": "मुझे कुछ सुनाई नहीं दिया। फिर कोशिश करें या लिखें।"
  ,"assistant.speechLocaleUnavailable": "इस डिवाइस पर इस भाषा की वॉइस पहचान उपलब्ध नहीं है। आप लिख सकते हैं।"
  ,"assistant.speechUnavailable": "इस डिवाइस पर वॉइस पहचान उपलब्ध नहीं है। आप रिमाइंडर लिख सकते हैं।"
  ,"assistant.speechError": "वॉइस पहचान अचानक रुक गई। फिर कोशिश करें या लिखें।"
  ,"assistant.waterAmount": "{amount} ml पानी पिएँ"
  ,"assistant.editPrompt": "सही किया हुआ रिमाइंडर बताएँ।"
  ,"assistant.cancelled": "ठीक है, मैंने वह रिमाइंडर रद्द कर दिया।"
  ,"assistant.saved": "हो गया। आपका रिमाइंडर जोड़ दिया गया है।"
  ,"assistant.savedMasterOff": "रिमाइंडर सेव है, लेकिन मास्टर रिमाइंडर अभी बंद है।"
  ,"assistant.savedCategoryOff": "रिमाइंडर सेव है, लेकिन {category} रिमाइंडर अभी बंद हैं।"
  ,"assistant.saveError": "रिमाइंडर सेव नहीं हो सका। क्या मैं फिर कोशिश करूँ?"
  ,"assistant.stillListening": "मैं अभी सुन रहा हूँ। {question}"
  ,"assistant.question.timePeriodSlot": "{time} सुबह है या शाम?"
  ,"assistant.youSaid": "आपने कहा"
  ,"assistant.yes": "हाँ, रोज"
  ,"assistant.no": "नहीं"
  ,"assistant.understood": "मैंने समझा"
  ,"assistant.everyDayAt": "हर दिन {time} पर"
  ,"assistant.dateAt": "{date} को {time} पर"
  ,"assistant.waterReplaceWarning": "पुष्टि करने पर आपका मौजूदा पानी शेड्यूल इस एक रोजाना रिमाइंडर से बदल जाएगा।"
  ,"assistant.repeatsYearly": "यह मौजूदा सालाना रिमाइंडर मॉडल का उपयोग करता है।"
  ,"assistant.confirm": "पुष्टि करें"
  ,"assistant.microphoneTitle": "माइक्रोफोन की अनुमति"
  ,"assistant.microphoneMessage": "HydroMate केवल Continue टैप करने के बाद माइक्रोफोन इस्तेमाल करता है, एक नतीजे या छोटे टाइमआउट पर रुक जाता है और कच्चा ऑडियो सेव नहीं करता।"
  ,"assistant.continue": "जारी रखें"
  ,"assistant.notNow": "अभी नहीं"
  ,"assistant.textFallback": "आप हमेशा लिख भी सकते हैं।"
  ,"assistant.inputPlaceholder": "रिमाइंडर लिखें..."
  ,"assistant.send": "भेजें"
  ,"assistant.listen": "सुनें"
  ,"assistant.stopListening": "सुनना बंद करें"
  ,"assistant.listeningWaiting": "सुन रहा हूँ…"
  ,"assistant.listeningSpeech": "सुन रहा हूँ…"
  ,"assistant.listeningConfirmation": "आपकी पुष्टि सुन रहा हूँ…"
  ,"reminders.routine": "दिनचर्या"
  ,"reminders.routineReminder": "दिनचर्या रिमाइंडर"
  ,"reminders.routineName": "दिनचर्या का नाम"
  ,"reminders.routineExample": "जैसे टहलना, आहार, ध्यान"
  ,"reminders.routineAdded": "दिनचर्या रिमाइंडर जोड़ दिया गया"
  ,"reminders.addRoutine": "📝 दिनचर्या जोड़ें"
  ,"reminders.savedRoutines": "सहेजी गई दिनचर्याएँ"
  ,"reminders.updateRoutine": "दिनचर्या अपडेट करें"
  ,"reminders.enableRoutineReminders": "दिनचर्या रिमाइंडर चालू करें"
  ,"reminders.duration": "अवधि"
  ,"reminders.oneDay": "1 दिन"
  ,"reminders.threeDays": "3 दिन"
  ,"reminders.fiveDays": "5 दिन"
  ,"reminders.sevenDays": "7 दिन"
  ,"reminders.customDuration": "अपनी अवधि"
  ,"reminders.ongoing": "लगातार"
  ,"reminders.days": "दिन"
  ,"reminders.durationDaysPlaceholder": "दिनों की संख्या लिखें"
  ,"reminders.invalidDuration": "दिनों की सही धनात्मक संख्या लिखें"
  ,"reminders.durationSummary": "{count} दिन"
  ,"reminders.ongoingHelp": "इसे बदलने या हटाने तक यह हर दिन चलता रहेगा।"
  ,"reminders.legacyRoutineHelp": "अवधि चुनने तक यह पुराना रिमाइंडर अपने पिछले सालाना समय पर चलता रहेगा।"
  ,"assistant.question.duration": "यह कितने दिन चले? सही धनात्मक संख्या लिखें।"
  ,"reminders.startDate": "शुरू होने की तारीख"
  ,"assistant.question.timePeriod": "आपका मतलब सुबह AM है या शाम PM?"
  ,"assistant.speechPermissionBlocked": "माइक्रोफ़ोन अनुमति बंद है। Android सेटिंग में इसे चालू करें या नीचे रिमाइंडर लिखें।"
  ,"assistant.reviewTranscript": "सुने गए वाक्य को जाँचें या बदलें, फिर भेजें दबाएँ।"
  ,"assistant.understoodCount": "मैंने {count} रिमाइंडर समझे"
  ,"assistant.editItemPrompt": "सही रिमाइंडर बताइए। केवल यह ड्राफ्ट बदलेगा।"
  ,"assistant.addAnotherPrompt": "अब कौन सा रिमाइंडर जोड़ना है?"
  ,"assistant.addAnother": "एक और जोड़ें"
  ,"assistant.confirmAll": "सभी पक्का करें"
  ,"assistant.savedAll": "हो गया। {count} रिमाइंडर जोड़ दिए गए।"
  ,"assistant.savedSomeCategoriesOff": "रिमाइंडर सहेजे गए। बंद श्रेणियों के रिमाइंडर शेड्यूल नहीं हुए।"
  ,"assistant.saveAsPlan": "30-दिन की योजना के रूप में सहेजें"
  ,"assistant.question.timesPerDay": "आपको दिन में कितनी बार यह रिमाइंडर चाहिए? एक बार, 2 बार, 3 बार या जितनी बार आप चाहें।"
  ,"assistant.question.timesPerDayInvalid": "कृपया सिर्फ़ एक बार या दिन में 1 से 12 बार चुनें।"
  ,"assistant.question.durationDays": "आप यह रिमाइंडर कितने दिनों के लिए रखना चाहते हैं? सिर्फ़ एक बार, 7 दिन, 30 दिन या जितने दिन आप चाहें।"
  ,"assistant.question.durationDaysInvalid": "कृपया 1 से 365 दिनों के बीच की अवधि चुनें।"
  ,"assistant.question.recurrenceTimes": "कौन-कौन से समय पर याद दिलाऊँ? हर समय के साथ AM या PM बताएँ।"
  ,"assistant.question.recurrenceTimesInvalid": "कृपया ठीक {count} अलग समय बताएँ और हर समय के साथ AM या PM कहें।"
  ,"assistant.onceChoice": "सिर्फ़ एक बार"
  ,"assistant.timesDailyChoice": "दिन में {count} बार"
  ,"assistant.daysChoice": "{count} दिन"
  ,"assistant.onceSummary": "यह रिमाइंडर सिर्फ़ एक बार सेट होगा।"
  ,"assistant.recurringSummary": "दिन में {times} बार, {days} दिनों के लिए।"
  ,"assistant.rolloverToday": "{times} बजे के पहले रिमाइंडर आज होंगे।"
  ,"assistant.rolloverTomorrow": "{times} बजे के रिमाइंडर कल से शुरू होंगे।"
  ,"assistant.rolloverMixed": "पहला रिमाइंडर आज {todayTimes} बजे होगा, और {tomorrowTimes} बजे वाला रिमाइंडर कल से शुरू होगा।"
  ,"assistant.explicitTimesSummary": "समय: {times}"
  ,"assistant.question.confirmation": "{summary} क्या मैं इसे सेट कर दूँ?"
  ,"assistant.question.confirmationInvalid": "क्या मैं यह रिमाइंडर सेट कर दूँ? कृपया हाँ या नहीं कहें।"
  ,"assistant.relativeTimeSummary": "{count} मिनट बाद।"
  ,"assistant.defaultPlanName": "स्वास्थ्य रिमाइंडर योजना"
  ,"assistant.planNamePlaceholder": "योजना का नाम"
  ,"assistant.planProgress": "दिन {day}, कुल {total}"
  ,"assistant.planFinished": "आपकी {name} पूरी हो गई है।"
  ,"assistant.planFinishedQuestion": "अब आप क्या करना चाहेंगे?"
  ,"assistant.continueDays": "{count} दिन जारी रखें"
  ,"assistant.updatePlan": "योजना बदलें"
  ,"assistant.updatePlanPrompt": "सुधारे या नए रिमाइंडर जोड़ें, फिर सभी पक्का करें।"
  ,"assistant.archivePlan": "योजना संग्रहित करें"
  ,"assistant.microphoneSettingsTitle": "माइक्रोफ़ोन अनुमति बंद है"
  ,"assistant.microphoneSettingsMessage": "Android सेटिंग › ऐप्स › HydroMate › अनुमतियाँ में माइक्रोफ़ोन चालू करें। लिखकर रिमाइंडर देना उपलब्ध है।"
  ,"assistant.continueCustom": "अपनी अवधि"
  ,"assistant.customContinuePrompt": "यह योजना और कितने दिन चले?"
  ,"assistant.planContinued": "योजना {count} दिन और चलेगी।"
  ,"assistant.recentReviewCount": "आपके {count} रिमाइंडर समीक्षा के लिए तैयार हैं।"
  ,"assistant.reviewRecent": "हाल के रिमाइंडर देखें"
  ,"assistant.recentReminders": "हाल के Ask HydroMate रिमाइंडर"
  ,"assistant.hideRecent": "छिपाएँ"
  ,"assistant.showRecent": "{count} दिखाएँ"
  ,"assistant.readyForReview": "समीक्षा के लिए तैयार"
  ,"assistant.addedToday": "आज जोड़ा गया"
  ,"assistant.addedDaysAgo": "{count} दिन पहले जोड़ा गया"
  ,"assistant.recentSevenDayMessage": "यह रिमाइंडर आपकी हाल की सूची में 7 दिनों से है।"
  ,"assistant.keepRecent": "रखें"
  ,"assistant.removeFromRecent": "हाल की सूची से हटाएँ"
  ,"assistant.reviewAgainSevenDays": "रखा गया। मैं 7 दिन बाद फिर पूछूँगा।"
  ,"wakeWord.title": "Hey HydroMate वेक वर्ड"
  ,"wakeWord.consentTitle": "Hey HydroMate चालू करें?"
  ,"wakeWord.privacyExplanation": "चालू होने पर HydroMate ऐप खुले रहने के दौरान केवल “Hey HydroMate” पहचानने के लिए माइक्रोफ़ोन का उपयोग करता है। वेक ऑडियो इसी डिवाइस पर प्रोसेस होता है और न सहेजा जाता है, न अपलोड किया जाता है। पूरी वाणी पहचान केवल वेक वाक्य या Listen दबाने के बाद शुरू होती है।"
  ,"wakeWord.batteryNotice": "वेक-वर्ड सुनना अतिरिक्त बैटरी उपयोग कर सकता है। आप इसे कभी भी बंद कर सकते हैं।"
  ,"wakeWord.enable": "वेक वर्ड चालू करें"
  ,"wakeWord.foregroundExplanation": "केवल HydroMate खुला होने पर स्थानीय रूप से सुनता है।"
  ,"wakeWord.listening": "“Hey HydroMate” के लिए सुन रहा है"
  ,"wakeWord.paused": "सहायक सक्रिय है, वेक वर्ड रुका है"
  ,"wakeWord.permissionRequired": "माइक्रोफ़ोन अनुमति आवश्यक है"
  ,"wakeWord.unavailable": "इस डिवाइस पर वेक वर्ड उपलब्ध नहीं है"
  ,"wakeWord.foregroundOnly": "वेक सुनना फिर शुरू करने के लिए HydroMate खोलें"
  ,"wakeWord.off": "वेक वर्ड बंद है"
  ,"wakeWord.responseWaitTitle": "प्रतिक्रिया प्रतीक्षा समय"
  ,"wakeWord.responseWaitExplanation": "चुनें कि Ask HydroMate आपके बोलना शुरू करने के लिए कितनी देर प्रतीक्षा करे।"
  ,"wakeWord.secondsShort": "{count} सेकंड"
  ,"wakeWord.custom": "कस्टम"
  ,"wakeWord.customSecondsPlaceholder": "सेकंड"
  ,"wakeWord.saveResponseWait": "सहेजें"
  ,"wakeWord.responseWaitRange": "{min} से {max} सेकंड के बीच पूर्ण संख्या दर्ज करें।"
};
