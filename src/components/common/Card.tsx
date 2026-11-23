import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, StyleProp } from 'react-native';
import { Colors } from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
  selected?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  variant = 'outlined',
  selected = false,
}: CardProps) {
  const containerStyles: StyleProp<ViewStyle> = [
    styles.card,
    variant === 'elevated' && Shadows?.md,
    variant === 'outlined' && styles.outlined,
    variant === 'flat' && styles.flat,
    selected && styles.selected,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [containerStyles, pressed && styles.pressed]}>
        {children}
      </Pressable>
    );
  }

  return <View style={containerStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  flat: {
    backgroundColor: Colors.light.backgroundElement,
  },
  selected: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
    backgroundColor: Colors.light.primaryLight,
  },
  pressed: {
    opacity: 0.92,
  },
});
