import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useIsDesktop } from '@/hooks/useResponsive';
import { Colors } from '@/constants/colors';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  Settings,
  LogOut,
  Plus,
  Upload,
  User,
} from 'lucide-react-native';
import { Logo } from '@/components/common/Logo';

interface ResponsiveShellProps {
  children: React.ReactNode;
}

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  const isDesktop = useIsDesktop();
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const navItems = [
    {
      label: 'Dashboard',
      route: '/(tabs)/dashboard',
      icon: LayoutDashboard,
      isActive: pathname.includes('dashboard') || pathname === '/',
    },
    {
      label: 'My Classes',
      route: '/(tabs)/classes',
      icon: BookOpen,
      isActive: pathname.includes('classes') && !pathname.includes('upload') && !pathname.includes('create'),
    },
    {
      label: 'Calendar & Sync',
      route: '/(tabs)/calendar',
      icon: Calendar,
      isActive: pathname.includes('calendar'),
    },
    {
      label: 'Settings',
      route: '/(tabs)/settings',
      icon: Settings,
      isActive: pathname.includes('settings'),
    },
  ];

  return (
    <View style={isDesktop ? styles.desktopContainer : styles.mobileWrapper}>
      {/* Desktop Sidebar (mounted only after client hydration on desktop viewports) */}
      {isDesktop ? (
        <View style={styles.sidebar}>
          {/* Brand */}
          <Pressable
            onPress={() => router.push('/(tabs)/dashboard')}
            style={({ pressed }) => [styles.brandRow, pressed && styles.pressed]}>
            <Logo width={195} containerStyle={{ alignItems: 'flex-start' }} />
          </Pressable>

          {/* Quick Actions */}
          <View style={styles.quickActionSection}>
            <Pressable
              style={({ pressed }) => [styles.uploadButton, pressed && styles.pressed]}
              onPress={() => router.push('/classes/upload-syllabus')}>
              <Upload size={16} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Upload Syllabus</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.addClassButton, pressed && styles.pressed]}
              onPress={() => router.push('/classes/create')}>
              <Plus size={16} color={Colors.light.text} />
              <Text style={styles.addClassButtonText}>New Class</Text>
            </Pressable>
          </View>

          {/* Nav Links */}
          <View style={styles.navSection}>
            <Text style={styles.sectionHeader}>ACADEMIC WORKSPACE</Text>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.route}
                  style={[styles.navItem, item.isActive && styles.navItemActive]}
                  onPress={() => router.push(item.route as any)}>
                  <Icon
                    size={19}
                    color={item.isActive ? Colors.light.primary : Colors.light.textSecondary}
                    strokeWidth={item.isActive ? 2.4 : 1.8}
                  />
                  <Text
                    style={[styles.navItemText, item.isActive && styles.navItemTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* User Profile & Sign Out Footer */}
          <View style={styles.sidebarFooter}>
            <View style={styles.userProfileRow}>
              <View style={styles.userAvatar}>
                <User size={18} color={Colors.light.primary} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {profile?.full_name || user?.email?.split('@')[0] || 'Student'}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {user?.email || ''}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  signOut();
                  router.replace('/(auth)/login');
                }}
                style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}>
                <LogOut size={16} color={Colors.light.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Main Content Area */}
      <View style={isDesktop ? styles.mainContent : styles.mobileWrapper}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileWrapper: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.light.background,
    height: '100%',
    overflow: 'hidden',
  },
  sidebar: {
    width: 260,
    backgroundColor: Colors.light.card,
    borderRightWidth: 1,
    borderRightColor: Colors.light.border,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
    height: '100%',
  },
  brandRow: {
    marginBottom: Spacing.five,
    paddingHorizontal: Spacing.one,
  },
  quickActionSection: {
    gap: Spacing.two,
    marginBottom: Spacing.five,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.primary,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  uploadButtonText: {
    ...Typography.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addClassButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  addClassButtonText: {
    ...Typography.sm,
    fontWeight: '600',
    color: Colors.light.text,
  },
  navSection: {
    flex: 1,
    gap: 4,
  },
  sectionHeader: {
    ...Typography.xs,
    color: Colors.light.textMuted,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  navItemActive: {
    backgroundColor: Colors.light.primaryLight,
  },
  navItemText: {
    ...Typography.sm,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
  navItemTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  sidebarFooter: {
    paddingTop: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.sm,
    fontWeight: '700',
    color: Colors.light.text,
  },
  userEmail: {
    ...Typography.xs,
    color: Colors.light.textMuted,
  },
  logoutBtn: {
    padding: Spacing.two,
    borderRadius: BorderRadius.sm,
  },
  mainContent: {
    flex: 1,
    height: '100%',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.8,
  },
});
