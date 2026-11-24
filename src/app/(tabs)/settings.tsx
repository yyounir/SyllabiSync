import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
  Pressable,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useIsDesktop } from '@/hooks/useResponsive';
import { format } from 'date-fns';
import { googleCalendarService } from '@/services/google-calendar.service';
import { classService } from '@/services/class.service';
import { academicItemService } from '@/services/academic-item.service';
import { GoogleCalendarConnection } from '@/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius, MaxContentWidth } from '@/constants/theme';
import {
  Calendar,
  CheckCircle2,
  LogOut,
  Mail,
  RefreshCw,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';
import { Logo } from '@/components/common/Logo';

export default function SettingsScreen() {
  const { user, profile, signOut, isDemo } = useAuth();
  const isDesktop = useIsDesktop();

  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({ classesCount: 0, itemsCount: 0 });
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Connect Google Modal
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState(user?.email || 'student@gmail.com');
  const [connecting, setConnecting] = useState(false);

  const currentUserId = user?.id || 'guest_student';

  const loadSettingsData = useCallback(async () => {
    try {
      const [connRes, classesRes, itemsRes] = await Promise.all([
        googleCalendarService.getConnection(currentUserId),
        classService.getClasses(currentUserId),
        academicItemService.getItems(currentUserId),
      ]);

      if (connRes.data) setConnection(connRes.data);
      setStats({
        classesCount: classesRes.data?.length || 0,
        itemsCount: itemsRes.data?.length || 0,
      });
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadSettingsData();
    }, [loadSettingsData])
  );

  const handleOpenConnectModal = () => {
    setGoogleEmailInput(user?.email || 'student@gmail.com');
    setConnectModalVisible(true);
  };

  const handleConfirmConnect = async () => {
    if (!googleEmailInput.trim()) return;
    setConnecting(true);

    const { data: newConn } = await googleCalendarService.saveConnection(
      currentUserId,
      googleEmailInput.trim()
    );

    if (newConn) {
      setConnection(newConn);
      setSyncSuccessMessage(`Connected Google Calendar: ${newConn.google_email}`);
    }

    setConnecting(false);
    setConnectModalVisible(false);

    // Sync items immediately
    handleSyncNow();
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncSuccessMessage(null);

    const { data: allItems } = await academicItemService.getItems(currentUserId);
    if (allItems) {
      const { syncedCount } = await googleCalendarService.syncItemsToGoogleCalendar(
        currentUserId,
        allItems
      );
      setSyncSuccessMessage(`Synchronized ${syncedCount} deadlines to your Google Calendar!`);
    }

    await loadSettingsData();
    setSyncing(false);

    setTimeout(() => {
      setSyncSuccessMessage(null);
    }, 4500);
  };

  const handleDisconnect = async () => {
    await googleCalendarService.disconnect(currentUserId);
    setConnection(null);
    setSyncSuccessMessage('Disconnected from Google Calendar');
    setTimeout(() => setSyncSuccessMessage(null), 3000);
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
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionTitle}>Account Profile</Text>
            {isDemo && (
              <Badge label="Demo Mode" variant="primary" />
            )}
          </View>
          <View style={styles.profileRow}>
            <View style={styles.avatarBox}>
              <User size={24} color={Colors.light.primary} />
            </View>
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>
                {profile?.full_name || (isDemo ? 'Demo Student' : user?.email?.split('@')[0]) || 'Student'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email || 'demo.student@syllabisync.edu'}</Text>
              <Text style={styles.accountType}>
                {isDemo ? 'Local Interactive Demo Session' : 'Active Student Workspace'}
              </Text>
            </View>
          </View>

          {isDemo && (
            <View style={styles.demoNoticeBox}>
              <Sparkles size={16} color={Colors.light.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.demoNoticeTitle}>You are exploring in Demo Mode</Text>
                <Text style={styles.demoNoticeText}>
                  All sample courses, syllabus uploads, and deadline edits are saved locally on this device. You can create a free account anytime to enable cloud syncing.
                </Text>
                <Button
                  title="Create Free Account"
                  variant="outline"
                  onPress={async () => {
                    await signOut();
                    router.replace('/(auth)/signup');
                  }}
                  style={styles.demoCreateAccountBtn}
                />
              </View>
            </View>
          )}
        </Card>

        {/* Google Calendar Sync Settings */}
        <Card variant="elevated" style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <Calendar size={20} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>Google Calendar Integration</Text>
            </View>
            <Badge
              label={connection ? 'Connected' : 'Not Connected'}
              variant={connection ? 'success' : 'default'}
            />
          </View>

          <Text style={styles.sectionDescription}>
            Automatically export your extracted syllabus assignments, exams, and project
            deadlines directly to your primary Google Calendar.
          </Text>

          {syncSuccessMessage && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={16} color={Colors.light.success} />
              <Text style={styles.successText}>{syncSuccessMessage}</Text>
            </View>
          )}

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
                    ? format(new Date(connection.last_synced_at), 'MMM d, yyyy h:mm a')
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
                  onPress={handleSyncNow}
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
                onPress={handleOpenConnectModal}
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
            <View>
              <Logo width={210} containerStyle={{ alignItems: 'flex-start', marginBottom: Spacing.two }} />
              <Text style={styles.appTagline}>
                Your syllabus. Your semester. In sync.
              </Text>
              <Text style={styles.versionText}>Version 1.0.0 (Production Build)</Text>
            </View>
          </View>

          <Button
            title={isDemo ? "Exit Demo Mode" : "Sign Out of SyllabiSync"}
            variant="danger"
            icon={<LogOut size={16} color="#FFFFFF" />}
            onPress={handleSignOut}
            style={styles.signOutButton}
          />
        </Card>

        {/* Connect Google Calendar Modal */}
        <Modal
          visible={connectModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setConnectModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <Card style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderBrand}>
                  <Calendar size={22} color={Colors.light.primary} />
                  <Text style={styles.modalTitle}>Connect Google Calendar</Text>
                </View>
                <Pressable onPress={() => setConnectModalVisible(false)}>
                  <X size={20} color={Colors.light.textSecondary} />
                </Pressable>
              </View>

              <Text style={styles.modalSubtitle}>
                Authorize SyllabiSync to synchronize academic assignments, exam dates, and
                project milestones with your Google Calendar.
              </Text>

              <Input
                label="Google Account Email"
                placeholder="your.email@gmail.com"
                value={googleEmailInput}
                onChangeText={setGoogleEmailInput}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={<Mail size={16} color={Colors.light.textMuted} />}
              />

              <View style={styles.permissionsBox}>
                <Text style={styles.permissionsTitle}>Permissions requested:</Text>
                <Text style={styles.permissionsItem}>
                  ✓ Create syllabus deadlines in your primary calendar
                </Text>
                <Text style={styles.permissionsItem}>
                  ✓ Update deadlines when dates change in SyllabiSync
                </Text>
                <Text style={styles.permissionsItem}>
                  ✓ Distinguish all-day deadlines from timed exams
                </Text>
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setConnectModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Connect & Authorize"
                  loading={connecting}
                  onPress={handleConfirmConnect}
                  style={{ flex: 1.5 }}
                />
              </View>
            </Card>
          </View>
        </Modal>
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.successLight,
    padding: Spacing.two,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.three,
  },
  successText: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.success,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    padding: Spacing.six,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  modalHeaderBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  modalTitle: {
    ...Typography.lg,
    fontWeight: '800',
    color: Colors.light.text,
  },
  modalSubtitle: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.four,
  },
  permissionsBox: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    gap: 4,
    marginBottom: Spacing.four,
  },
  permissionsTitle: {
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 2,
  },
  permissionsItem: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  demoNoticeBox: {
    flexDirection: 'row',
    gap: Spacing.three,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    marginTop: Spacing.four,
  },
  demoNoticeTitle: {
    ...Typography.sm,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  demoNoticeText: {
    ...Typography.xs,
    color: '#3B82F6',
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  demoCreateAccountBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderColor: '#93C5FD',
  },
});
