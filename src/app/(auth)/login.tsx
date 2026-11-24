import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router, Link } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { Lock, Mail, Sparkles } from 'lucide-react-native';
import { Logo } from '@/components/common/Logo';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError(null);
    setLoading(true);

    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);

    if (signInError) {
      setError(signInError.message || 'Invalid login credentials');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardView}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <Logo width={270} containerStyle={styles.logoWrapper} />
            <View style={styles.taglineBadge}>
              <Sparkles size={13} color={Colors.light.primary} />
              <Text style={styles.taglineText}>Your syllabus. Your semester. In sync.</Text>
            </View>
          </View>

          {/* Login Card */}
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to access your course dashboards</Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <Input
              label="Email Address"
              placeholder="student@university.edu"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Mail size={18} color={Colors.light.textMuted} />}
            />

            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Lock size={18} color={Colors.light.textMuted} />}
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              style={styles.loginButton}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don&apos;t have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <Pressable>
                  <Text style={styles.signupLink}>Create an account</Text>
                </Pressable>
              </Link>
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  logoWrapper: {
    marginBottom: Spacing.three,
  },
  brandTitle: {
    ...Typography['2xl'],
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.6,
  },
  taglineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.two,
  },
  taglineText: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  card: {
    width: '100%',
    padding: Spacing.six,
    borderRadius: BorderRadius.xl,
  },
  cardTitle: {
    ...Typography.xl,
    fontWeight: '700',
    color: Colors.light.text,
  },
  cardSubtitle: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.five,
    marginTop: Spacing.one,
  },
  errorBanner: {
    backgroundColor: Colors.light.dangerLight,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    ...Typography.sm,
    color: Colors.light.danger,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  footerText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
  },
  signupLink: {
    ...Typography.sm,
    fontWeight: '700',
    color: Colors.light.primary,
  },
});
