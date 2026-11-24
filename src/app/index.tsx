import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { Typography, Spacing } from '@/constants/theme';
import { Sparkles } from 'lucide-react-native';
import { Logo } from '@/components/common/Logo';

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
      <Logo width={290} containerStyle={styles.logoContainer} />
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
  logoContainer: {
    marginBottom: Spacing.three,
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
