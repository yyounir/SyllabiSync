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
import { BookOpen, Lock, Mail, User, Sparkles } from 'lucide-react-native';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    const { error: signUpError } = await signUp(
      email.trim(),
      password,
      fullName.trim()
    );
    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Error creating account');
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
            <View style={styles.logoIcon}>
              <BookOpen size={30} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <Text style={styles.brandTitle}>SyllabiSync</Text>
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
    paddingVertical: Spacing.six,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
    ...Platform.select({
      web: { boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.35)' },
      default: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
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
    marginBottom: Spacing.four,
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
  loginLink: {
    ...Typography.sm,
    fontWeight: '700',
    color: Colors.light.primary,
  },
});
