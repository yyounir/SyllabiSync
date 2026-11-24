import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

export interface LogoProps {
  /** Width in density-independent pixels. Height defaults to maintaining the 6.06:1 aspect ratio. */
  width?: number;
  /** Explicit height override */
  height?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}

const LOGO_ASPECT_RATIO = 1024 / 169; // ~6.059

export const Logo: React.FC<LogoProps> = ({
  width = 240,
  height,
  style,
  containerStyle,
  resizeMode = 'contain',
}) => {
  const calculatedHeight = height ?? Math.round(width / LOGO_ASPECT_RATIO);

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={require('../../../assets/images/Logo.png')}
        style={[
          {
            width,
            height: calculatedHeight,
          },
          styles.image,
          style,
        ]}
        resizeMode={resizeMode}
        accessibilityLabel="SyllabiSync Logo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    maxWidth: '100%',
  },
});
