import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.light.background },
          animation: 'fade',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="classes/create"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="classes/upload-syllabus"
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="classes/review-syllabus"
          options={{
            presentation: 'card',
          }}
        />
        <Stack.Screen name="classes/[classId]" />
      </Stack>
    </AuthProvider>
  );
}
