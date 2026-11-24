import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useIsDesktop } from '@/hooks/useResponsive';
import { academicItemService } from '@/services/academic-item.service';
import { classService } from '@/services/class.service';
import { googleCalendarService } from '@/services/google-calendar.service';
import {
  AcademicItem,
  ClassItem,
  GoogleCalendarConnection,
  AcademicItemStatus,
} from '@/types/database';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge, TypeBadge } from '@/components/common/Badge';
import { Input } from '@/components/common/Input';
import { EmptyState } from '@/components/common/EmptyState';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius, MaxContentWidth } from '@/constants/theme';
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Mail,
  RefreshCw,
  X,
} from 'lucide-react-native';
import { format, isPast, parseISO } from 'date-fns';

export default function CalendarScreen() {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();

  const [items, setItems] = useState<AcademicItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [connection, setConnection] = useState<GoogleCalendarConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Connect Google Modal State
  const [connectModalVisible, setConnectModalVisible] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState(user?.email || 'student@gmail.com');
  const [connecting, setConnecting] = useState(false);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSyncFilter, setSelectedSyncFilter] = useState<'all' | 'synced' | 'not_synced'>('all');

  // Selected Item Modal
  const [activeItem, setActiveItem] = useState<AcademicItem | null>(null);

  const currentUserId = user?.id || 'guest_student';

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, classesRes, connRes] = await Promise.all([
        academicItemService.getItems(currentUserId),
        classService.getClasses(currentUserId),
        googleCalendarService.getConnection(currentUserId),
      ]);

      if (itemsRes.data) setItems(itemsRes.data);
      if (classesRes.data) setClasses(classesRes.data);
      if (connRes.data) setConnection(connRes.data);
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleToggleTaskStatus = async (itemId: string, currentStatus: AcademicItemStatus) => {
    const nextStatus: AcademicItemStatus =
      currentStatus === 'completed' ? 'pending' : 'completed';
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: nextStatus } : i))
    );
    await academicItemService.toggleStatus(itemId, currentStatus);
    loadData();
  };

  const handleOpenConnectModal = () => {
    setGoogleEmailInput(user?.email || 'student@gmail.com');
    setConnectModalVisible(true);
  };

  const handleConfirmGoogleConnect = async () => {
    if (!googleEmailInput.trim()) return;
    setConnecting(true);

    const { data: newConn } = await googleCalendarService.saveConnection(
      currentUserId,
      googleEmailInput.trim()
    );

    if (newConn) {
      setConnection(newConn);
      setSyncSuccessMessage(`Connected to Google Calendar as ${newConn.google_email}`);
    }

    setConnecting(false);
    setConnectModalVisible(false);

    // Auto-sync items right after connecting
    if (items.length > 0) {
      handleSyncGoogleCalendar();
    }
  };

  const handleDisconnectCalendar = async () => {
    await googleCalendarService.disconnect(currentUserId);
    setConnection(null);
    setSyncSuccessMessage('Disconnected from Google Calendar');
    setTimeout(() => setSyncSuccessMessage(null), 3000);
  };

  const handleSyncGoogleCalendar = async () => {
    if (!connection) {
      handleOpenConnectModal();
      return;
    }

    setSyncing(true);
    setSyncSuccessMessage(null);

    // Optimistically update all items with due dates to 'synced'
    setItems((prev) =>
      prev.map((i) => (i.due_date ? { ...i, google_sync_status: 'synced' } : i))
    );

    const { syncedCount } = await googleCalendarService.syncItemsToGoogleCalendar(
      currentUserId,
      items
    );

    setSyncing(false);
    setSyncSuccessMessage(
      `Successfully synchronized ${syncedCount} academic deadlines to your Google Calendar!`
    );

    loadData();

    setTimeout(() => {
      setSyncSuccessMessage(null);
    }, 4500);
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (selectedClassId !== 'all' && item.class_id !== selectedClassId) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (selectedSyncFilter === 'synced' && item.google_sync_status !== 'synced') return false;
    if (selectedSyncFilter === 'not_synced' && item.google_sync_status === 'synced') return false;
    return true;
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <View style={[styles.innerContent, isDesktop && styles.desktopContent]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Unified Calendar</Text>
            <Text style={styles.subtitle}>
              Cross-course deadlines, exam schedules, and Google Calendar sync
            </Text>
          </View>

          <Button
            title={
              syncing
                ? 'Syncing...'
                : connection
                ? 'Sync to Google Calendar'
                : 'Connect Google Calendar'
            }
            icon={
              connection ? (
                <RefreshCw size={15} color="#FFFFFF" />
              ) : (
                <CalendarIcon size={15} color="#FFFFFF" />
              )
            }
            loading={syncing}
            onPress={handleSyncGoogleCalendar}
          />
        </View>

        {/* Google Calendar Sync Card */}
        <Card style={styles.syncCard}>
          <View style={styles.syncCardContent}>
            <View style={styles.syncIconBox}>
              <CalendarIcon size={22} color={Colors.light.primary} />
            </View>
            <View style={styles.syncTextBox}>
              <View style={styles.syncStatusRow}>
                <Text style={styles.syncTitle}>Google Calendar Integration</Text>
                <Badge
                  label={connection ? 'Connected' : 'Not Connected'}
                  variant={connection ? 'success' : 'default'}
                />
              </View>
              <Text style={styles.syncEmail}>
                {connection
                  ? `Active: ${connection.google_email} • Last synced: ${
                      connection.last_synced_at
                        ? new Date(connection.last_synced_at).toLocaleTimeString()
                        : 'Just now'
                    }`
                  : 'Connect your Google account to automatically push syllabus deadlines to your personal calendar.'}
              </Text>
            </View>
            <View style={styles.syncActionButtons}>
              {connection ? (
                <>
                  <Button
                    title="Sync Now"
                    size="sm"
                    loading={syncing}
                    onPress={handleSyncGoogleCalendar}
                  />
                  <Button
                    title="Disconnect"
                    variant="outline"
                    size="sm"
                    onPress={handleDisconnectCalendar}
                  />
                </>
              ) : (
                <Button
                  title="Connect"
                  size="sm"
                  onPress={handleOpenConnectModal}
                />
              )}
            </View>
          </View>

          {syncSuccessMessage && (
            <View style={styles.successBanner}>
              <CheckCircle2 size={16} color={Colors.light.success} />
              <Text style={styles.successText}>{syncSuccessMessage}</Text>
            </View>
          )}
        </Card>

        {/* Filters */}
        <View style={styles.filterSection}>
          {/* Class Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}>
            <Pressable
              onPress={() => setSelectedClassId('all')}
              style={[
                styles.filterChip,
                selectedClassId === 'all' && styles.filterChipActive,
              ]}>
              <Text
                style={[
                  styles.filterChipText,
                  selectedClassId === 'all' && styles.filterChipTextActive,
                ]}>
                All Classes
              </Text>
            </Pressable>

            {classes.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setSelectedClassId(c.id)}
                style={[
                  styles.filterChip,
                  selectedClassId === c.id && [
                    styles.filterChipActive,
                    { borderColor: c.color, backgroundColor: `${c.color}15` },
                  ],
                ]}>
                <View
                  style={[styles.classDot, { backgroundColor: c.color || Colors.light.primary }]}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    selectedClassId === c.id && { color: c.color, fontWeight: '700' },
                  ]}>
                  {c.course_code}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Type & Sync Status Filters */}
          <View style={styles.secondaryFilterRow}>
            <View style={styles.secondaryFilters}>
              {['all', 'assignment', 'exam', 'quiz', 'project'].map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setSelectedType(t)}
                  style={[
                    styles.subChip,
                    selectedType === t && styles.subChipActive,
                  ]}>
                  <Text
                    style={[
                      styles.subChipText,
                      selectedType === t && styles.subChipTextActive,
                    ]}>
                    {t === 'all' ? 'All Types' : t}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.secondaryFilters}>
              <Pressable
                onPress={() =>
                  setSelectedSyncFilter(
                    selectedSyncFilter === 'all'
                      ? 'synced'
                      : selectedSyncFilter === 'synced'
                      ? 'not_synced'
                      : 'all'
                  )
                }
                style={styles.syncFilterToggle}>
                <RefreshCw size={12} color={Colors.light.textSecondary} />
                <Text style={styles.subChipText}>
                  {selectedSyncFilter === 'all'
                    ? 'All Events'
                    : selectedSyncFilter === 'synced'
                    ? 'Google Synced'
                    : 'Unsynced'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Timeline Events List */}
        {filteredItems.length === 0 && !loading ? (
          <EmptyState
            icon={<CalendarIcon size={32} color={Colors.light.primary} />}
            title="No Deadlines Found"
            description="No deadlines match your current filters. Add assignments or upload a syllabus to view your schedule."
          />
        ) : (
          <View style={styles.timelineList}>
            {filteredItems.map((item) => {
              const isCompleted = item.status === 'completed';
              const isSynced = item.google_sync_status === 'synced';

              let formattedDate = 'No Deadline';
              let isOverdue = false;

              if (item.due_date) {
                try {
                  const parsed = parseISO(item.due_date);
                  isOverdue = isPast(parsed) && !isCompleted;
                  formattedDate = format(parsed, 'EEEE, MMM d • h:mm a');
                } catch {
                  formattedDate = item.original_date_text || 'Date set';
                }
              }

              return (
                <Pressable
                  key={item.id}
                  onPress={() => setActiveItem(item)}
                  style={({ pressed }) => [
                    styles.eventCard,
                    isCompleted && styles.eventCompleted,
                    pressed && styles.pressed,
                  ]}>
                  {/* Left color bar matching course */}
                  <View
                    style={[
                      styles.eventColorBar,
                      { backgroundColor: item.course_color || Colors.light.primary },
                    ]}
                  />

                  {/* Checkbox */}
                  <Pressable
                    hitSlop={8}
                    onPress={() => handleToggleTaskStatus(item.id, item.status)}
                    style={styles.checkbox}>
                    {isCompleted ? (
                      <CheckCircle2 size={20} color={Colors.light.success} />
                    ) : (
                      <Circle size={20} color={Colors.light.textMuted} />
                    )}
                  </Pressable>

                  {/* Main Event Info */}
                  <View style={styles.eventBody}>
                    <View style={styles.eventTitleRow}>
                      <Text
                        style={[
                          styles.eventTitle,
                          isCompleted && styles.eventTitleCompleted,
                        ]}
                        numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.points ? (
                        <Text style={styles.pointsText}>{item.points} pts</Text>
                      ) : null}
                    </View>

                    <View style={styles.eventMetaRow}>
                      {item.course_code && (
                        <View
                          style={[
                            styles.coursePill,
                            {
                              backgroundColor: `${item.course_color || Colors.light.primary}18`,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.coursePillText,
                              { color: item.course_color || Colors.light.primary },
                            ]}>
                            {item.course_code}
                          </Text>
                        </View>
                      )}

                      <TypeBadge type={item.type} />

                      <View style={styles.timeRow}>
                        <Clock size={12} color={isOverdue ? Colors.light.danger : Colors.light.textMuted} />
                        <Text
                          style={[
                            styles.timeText,
                            isOverdue && styles.overdueText,
                          ]}>
                          {formattedDate}
                        </Text>
                      </View>

                      {/* Google Calendar Synced Badge */}
                      {isSynced ? (
                        <View style={styles.syncedBadge}>
                          <Check size={11} color={Colors.light.success} />
                          <Text style={styles.syncedText}>Synced</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

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
                  <CalendarIcon size={22} color={Colors.light.primary} />
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
                  onPress={handleConfirmGoogleConnect}
                  style={{ flex: 1.5 }}
                />
              </View>
            </Card>
          </View>
        </Modal>

        {/* Event Detail Modal */}
        {activeItem && (
          <Modal
            visible={Boolean(activeItem)}
            animationType="fade"
            transparent
            onRequestClose={() => setActiveItem(null)}>
            <View style={styles.modalOverlay}>
              <Card style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalCourseRow}>
                    <Text
                      style={[
                        styles.modalCourseCode,
                        { color: activeItem.course_color || Colors.light.primary },
                      ]}>
                      {activeItem.course_code}
                    </Text>
                    <TypeBadge type={activeItem.type} />
                  </View>
                  <Pressable onPress={() => setActiveItem(null)}>
                    <X size={20} color={Colors.light.textSecondary} />
                  </Pressable>
                </View>

                <Text style={styles.modalEventTitle}>{activeItem.title}</Text>

                <View style={styles.modalInfoRow}>
                  <CalendarIcon size={16} color={Colors.light.textMuted} />
                  <Text style={styles.modalInfoText}>
                    {activeItem.due_date
                      ? format(new Date(activeItem.due_date), 'MMM d, yyyy h:mm a')
                      : activeItem.original_date_text || 'No date set'}
                  </Text>
                </View>

                {activeItem.description ? (
                  <Text style={styles.modalDesc}>{activeItem.description}</Text>
                ) : null}

                {activeItem.source_excerpt ? (
                  <View style={styles.modalExcerpt}>
                    <Text style={styles.modalExcerptTitle}>Syllabus Excerpt:</Text>
                    <Text style={styles.modalExcerptContent}>
                      &ldquo;{activeItem.source_excerpt}&rdquo;
                    </Text>
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  <Button
                    title="View Class Dashboard"
                    variant="outline"
                    icon={<ExternalLink size={15} color={Colors.light.text} />}
                    onPress={() => {
                      const classId = activeItem.class_id;
                      setActiveItem(null);
                      router.push(`/classes/${classId}` as any);
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={
                      activeItem.status === 'completed'
                        ? 'Mark Incomplete'
                        : 'Mark Completed'
                    }
                    onPress={() => {
                      handleToggleTaskStatus(activeItem.id, activeItem.status);
                      setActiveItem(null);
                    }}
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            </View>
          </Modal>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
    flexWrap: 'wrap',
    gap: Spacing.three,
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
  syncCard: {
    padding: Spacing.four,
    marginBottom: Spacing.five,
    backgroundColor: Colors.light.card,
  },
  syncCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  syncIconBox: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTextBox: {
    flex: 1,
    minWidth: 200,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  syncTitle: {
    ...Typography.sm,
    fontWeight: '700',
    color: Colors.light.text,
  },
  syncEmail: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  syncActionButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.successLight,
    padding: Spacing.two,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.three,
  },
  successText: {
    ...Typography.xs,
    fontWeight: '600',
    color: Colors.light.success,
  },
  filterSection: {
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  filterScroll: {
    gap: Spacing.two,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipActive: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  classDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    ...Typography.xs,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  secondaryFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: 4,
  },
  secondaryFilters: {
    flexDirection: 'row',
    gap: Spacing.one,
    flexWrap: 'wrap',
  },
  subChip: {
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    borderRadius: BorderRadius.sm,
  },
  subChipActive: {
    backgroundColor: Colors.light.backgroundElement,
  },
  subChipText: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
    textTransform: 'capitalize',
  },
  subChipTextActive: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  syncFilterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: BorderRadius.sm,
  },
  timelineList: {
    gap: Spacing.two,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  eventCompleted: {
    backgroundColor: '#F8FAFC',
    opacity: 0.75,
  },
  eventColorBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  checkbox: {
    marginRight: Spacing.three,
    marginLeft: Spacing.one,
  },
  eventBody: {
    flex: 1,
  },
  eventTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTitle: {
    ...Typography.base,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  eventTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.light.textSecondary,
  },
  pointsText: {
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginLeft: Spacing.two,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.one,
    flexWrap: 'wrap',
  },
  coursePill: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
  },
  coursePillText: {
    ...Typography.xs,
    fontWeight: '700',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    ...Typography.xs,
    color: Colors.light.textSecondary,
  },
  overdueText: {
    color: Colors.light.danger,
    fontWeight: '600',
  },
  syncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.light.successLight,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
  },
  syncedText: {
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
    maxWidth: 520,
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
  modalCourseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  modalCourseCode: {
    ...Typography.sm,
    fontWeight: '800',
  },
  modalEventTitle: {
    ...Typography.xl,
    fontWeight: '800',
    color: Colors.light.text,
    marginBottom: Spacing.two,
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  modalInfoText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
  },
  modalDesc: {
    ...Typography.sm,
    color: Colors.light.text,
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  modalExcerpt: {
    backgroundColor: Colors.light.backgroundElement,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.primary,
    marginBottom: Spacing.four,
  },
  modalExcerptTitle: {
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.textMuted,
  },
  modalExcerptContent: {
    ...Typography.xs,
    fontStyle: 'italic',
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
});
