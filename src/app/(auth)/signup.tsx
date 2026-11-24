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
import { Lock, Mail, User, Sparkles, Compass } from 'lucide-react-native';
import { Logo } from '@/components/common/Logo';

export default function SignupScreen() {
  const { signUp, signInAsDemo } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError(null);
    setLoading(true);

    const { error: signUpError } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Failed to create account');
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  const handleTryDemo = async () => {
    setError(null);
    setDemoLoading(true);
    await signInAsDemo();
    setDemoLoading(false);
    router.replace('/(tabs)/dashboard');
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

          {/* Signup Card */}
          <Card variant="elevated" style={styles.card}>
            <Text style={styles.cardTitle}>Get Started</Text>
            <Text style={styles.cardSubtitle}>
              Create your account to organize your semester
            </Text>

            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <Input
              label="Full Name"
              placeholder="Alex Johnson"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              leftIcon={<User size={18} color={Colors.light.textMuted} />}
            />

            <Input
              label="Email Address"
              placeholder="alex@university.edu"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Mail size={18} color={Colors.light.textMuted} />}
            />

            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              leftIcon={<Lock size={18} color={Colors.light.textMuted} />}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIcon={<Lock size={18} color={Colors.light.textMuted} />}
            />

            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              fullWidth
              style={styles.signupButton}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Try Demo Option */}
            <Button
              title="Explore Demo Instead"
              variant="outline"
              icon={<Compass size={18} color={Colors.light.primary} />}
              onPress={handleTryDemo}
              loading={demoLoading}
              fullWidth
              style={styles.demoButton}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={styles.loginLink}>Sign in</Text>
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
  signupButton: {
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    ...Typography.xs,
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.three,
    fontWeight: '600',
  },
  demoButton: {
    borderColor: Colors.light.primary,
    borderWidth: 1.5,
    backgroundColor: '#F0F7FF',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  footerText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
  },
  loginLink: {
    ...Typography.sm,
    fontWeight: '700',
    color: Colors.light.primary,
  },
});
