import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { LocalizationProvider } from '@/localization';
import { VoiceReminderBridge } from '@/components/voice-reminder-bridge';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showOpeningScreen, setShowOpeningScreen] = useState(true);

useEffect(() => {
  const timer = setTimeout(() => {
    setShowOpeningScreen(false);
  }, 2500);

  return () => clearTimeout(timer);
}, []);
if (showOpeningScreen) {
  return (
    <View style={{ flex: 1 }}>
      <Image
        source={require("../assets/images/hydromate-splash.png")}
        style={{
          width: "100%",
          height: "100%",
        }}
        resizeMode="cover"
      />
    </View>
  );
}
  return (
    <LocalizationProvider>
      <VoiceReminderBridge />
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </LocalizationProvider>
  );
}
