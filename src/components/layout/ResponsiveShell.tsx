import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
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

interface ResponsiveShellProps {
  children: React.ReactNode;
}

export function ResponsiveShell({ children }: ResponsiveShellProps) {
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();
  const isDesktop = width >= 768;

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

  if (!isDesktop) {
    return <View style={styles.mobileWrapper}>{children}</View>;
  }

  return (
    <View style={styles.desktopContainer}>
      {/* Desktop Sidebar */}
      <View style={styles.sidebar}>
        {/* Brand */}
        <View style={styles.brandRow}>
          <View style={styles.brandLogo}>
            <BookOpen size={22} color="#FFFFFF" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.brandName}>SyllabiSync</Text>
            <Text style={styles.brandTagline}>In sync.</Text>
          </View>
        </View>

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

      {/* Main Desktop Content Area */}
      <View style={styles.mainContent}>{children}</View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.five,
    paddingHorizontal: Spacing.two,
  },
  brandLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    ...Typography.lg,
    fontWeight: '800',
    color: Colors.light.text,
    letterSpacing: -0.4,
  },
  brandTagline: {
    ...Typography.xs,
    color: Colors.light.primary,
    fontWeight: '700',
    marginTop: -2,
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
    paddingVertical: 8,
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
    gap: Spacing.one,
  },
  sectionHeader: {
    ...Typography.xs,
    fontWeight: '700',
    color: Colors.light.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  navItemActive: {
    backgroundColor: Colors.light.primaryLight,
  },
  navItemText: {
    ...Typography.sm,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  navItemTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: Spacing.three,
  },
  userProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
  },
  mainContent: {
    flex: 1,
    height: '100%',
    backgroundColor: Colors.light.background,
  },
  pressed: {
    opacity: 0.85,
  },
});
