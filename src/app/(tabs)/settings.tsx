import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { googleCalendarService } from '@/services/google-calendar.service';
import { classService } from '@/services/class.service';
import { academicItemService } from '@/services/academic-item.service';
import { GoogleCalendarConnection } from '@/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius, MaxContentWidth } from '@/constants/theme';
import {
  BookOpen,
  Calendar,
  LogOut,
  RefreshCw,
  User,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { user, profile, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({ classesCount: 0, itemsCount: 0 });

  const loadSettingsData = useCallback(async () => {
    if (!user) return;
    try {
      const [connRes, classesRes, itemsRes] = await Promise.all([
        googleCalendarService.getConnection(user.id),
        classService.getClasses(user.id),
        academicItemService.getItems(user.id),
      ]);

      if (connRes.data) setConnection(connRes.data);
      setStats({
        classesCount: classesRes.data?.length || 0,
        itemsCount: itemsRes.data?.length || 0,
      });
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
    }, [loadSettingsData])
  );

  const handleConnectOrSync = async () => {
    if (!user) return;
    setSyncing(true);

    if (!connection) {
      await googleCalendarService.saveConnection(
        user.id,
        user.email || 'student@gmail.com'
      );
    }

    const { data: allItems } = await academicItemService.getItems(user.id);
    if (allItems) {
      await googleCalendarService.syncItemsToGoogleCalendar(user.id, allItems);
    }

    await loadSettingsData();
    setSyncing(false);
  };

  const handleDisconnect = async () => {
    if (!user) return;
    await googleCalendarService.disconnect(user.id);
    setConnection(null);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <View style={[styles.innerContent, isDesktop && styles.desktopContent]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings & Integrations</Text>
          <Text style={styles.subtitle}>
            Manage your account, Google Calendar synchronization, and preferences
          </Text>
        </View>

        {/* Profile Card */}
        <Card variant="elevated" style={styles.card}>
          <Text style={styles.sectionTitle}>Account Profile</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatarBox}>
              <User size={24} color={Colors.light.primary} />
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {profile?.full_name || user?.email?.split('@')[0] || 'Student'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.accountType}>Active Student Account</Text>
            </View>
          </View>
        </Card>

        {/* Google Calendar Sync Settings */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Calendar size={20} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>Google Calendar Integration</Text>
            </View>
            <Badge
              label={connection ? 'Connected' : 'Disconnected'}
              variant={connection ? 'success' : 'default'}
            />
          </View>

          <Text style={styles.sectionDescription}>
            Automatically export your extracted syllabus assignments, exams, and project
            deadlines directly to your primary Google Calendar.
          </Text>

          {connection ? (
            <View style={styles.connectedDetailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Connected Google Email</Text>
                <Text style={styles.detailValue}>{connection.google_email}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Sync Timestamp</Text>
                <Text style={styles.detailValue}>
                  {connection.last_synced_at
                    ? new Date(connection.last_synced_at).toLocaleString()
                    : 'Not synced yet'}
                </Text>
              </View>

              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleTitle}>Automatic Sync</Text>
                  <Text style={styles.toggleSubtitle}>
                    Update Google Calendar whenever assignments are modified
                  </Text>
                </View>
                <Switch
                  value={autoSync}
                  onValueChange={setAutoSync}
                  trackColor={{ false: Colors.light.border, true: Colors.light.primary }}
                />
              </View>

              <View style={styles.connActions}>
                <Button
                  title={syncing ? 'Syncing...' : 'Sync Deadlines Now'}
                  icon={<RefreshCw size={15} color="#FFFFFF" />}
                  onPress={handleConnectOrSync}
                  loading={syncing}
                />
                <Button
                  title="Disconnect Calendar"
                  variant="outline"
                  onPress={handleDisconnect}
                />
              </View>
            </View>
          ) : (
            <View style={styles.notConnectedBox}>
              <Text style={styles.notConnectedText}>
                No Google Calendar connected. Click below to authorize SyllabiSync.
              </Text>
              <Button
                title="Connect Google Calendar"
                icon={<Calendar size={16} color="#FFFFFF" />}
                onPress={handleConnectOrSync}
                loading={syncing}
              />
            </View>
          )}
        </Card>

        {/* Workspace Summary */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Academic Workspace Data</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.classesCount}</Text>
              <Text style={styles.statLabel}>Active Courses</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.itemsCount}</Text>
              <Text style={styles.statLabel}>Deadlines Tracked</Text>
            </View>
          </View>
        </Card>

        {/* App Info & Sign out */}
        <Card style={styles.card}>
          <View style={styles.appInfoRow}>
            <View style={styles.appIconCircle}>
              <BookOpen size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.appName}>SyllabiSync</Text>
              <Text style={styles.appTagline}>
                Your syllabus. Your semester. In sync.
              </Text>
              <Text style={styles.versionText}>Version 1.0.0 (Production Build)</Text>
            </View>
          </View>

          <Button
            title="Sign Out of SyllabiSync"
            variant="danger"
            icon={<LogOut size={16} color="#FFFFFF" />}
            onPress={handleSignOut}
            style={styles.signOutButton}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
    alignItems: 'center',
  },
  innerContent: {
    width: '100%',
  },
  desktopContent: {
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  header: {
    marginBottom: Spacing.five,
  },
  title: {
    ...Typography['2xl'],
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  card: {
    padding: Spacing.five,
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
  },
  sectionDescription: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
    lineHeight: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    ...Typography.md,
    fontWeight: '700',
    color: Colors.light.text,
  },
  profileEmail: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  accountType: {
    ...Typography.xs,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  connectedDetailsBox: {
    gap: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: BorderRadius.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  detailValue: {
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.text,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: Spacing.two,
  },
  toggleTitle: {
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
  },
  toggleSubtitle: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    maxWidth: 240,
  },
  connActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  notConnectedBox: {
    gap: Spacing.three,
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.four,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  notConnectedText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.xl,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  statLabel: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  appInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  appIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    ...Typography.md,
    fontWeight: '800',
    color: Colors.light.text,
  },
  appTagline: {
    ...Typography.xs,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  versionText: {
    ...Typography.xs,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  signOutButton: {
    marginTop: Spacing.two,
  },
});
