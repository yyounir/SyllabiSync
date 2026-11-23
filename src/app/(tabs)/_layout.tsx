import React from 'react';
import { Tabs } from 'expo-router';
import { useWindowDimensions, Platform } from 'react-native';
import { ResponsiveShell } from '@/components/layout/ResponsiveShell';
import { Colors } from '@/constants/colors';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Settings,
} from 'lucide-react-native';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <ResponsiveShell>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors.light.primary,
          tabBarInactiveTintColor: Colors.light.textSecondary,
          tabBarStyle: isDesktop
            ? { display: 'none' }
            : {
                backgroundColor: '#FFFFFF',
                borderTopColor: Colors.light.border,
                borderTopWidth: 1,
                height: Platform.OS === 'ios' ? 84 : 64,
                paddingBottom: Platform.OS === 'ios' ? 24 : 10,
                paddingTop: 8,
              },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <LayoutDashboard size={size || 20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="classes"
          options={{
            title: 'Classes',
            tabBarIcon: ({ color, size }) => (
              <BookOpen size={size || 20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, size }) => (
              <Calendar size={size || 20} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Settings size={size || 20} color={color} />
            ),
          }}
        />
      </Tabs>
    </ResponsiveShell>
  );
}
