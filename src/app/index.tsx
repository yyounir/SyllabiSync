import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/theme';
import { BookOpen, Sparkles } from 'lucide-react-native';

export default function IndexScreen() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)/dashboard');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <BookOpen size={36} color="#FFFFFF" strokeWidth={2.2} />
      </View>
      <Text style={styles.brandTitle}>SyllabiSync</Text>
      <View style={styles.taglineBadge}>
        <Sparkles size={13} color={Colors.light.primary} />
        <Text style={styles.taglineText}>Your syllabus. Your semester. In sync.</Text>
      </View>
      <ActivityIndicator
        size="large"
        color={Colors.light.primary}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  brandTitle: {
    ...Typography['2xl'],
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: Spacing.three,
    borderRadius: 9999,
    marginTop: Spacing.two,
  },
  taglineText: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  spinner: {
    marginTop: Spacing.six,
  },
});
