import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SpatialNavigationFocusableView } from 'react-tv-space-navigation';
import { scaledPixels } from '../hooks/useScale';

interface ScreenTopControlsProps {
  onBack: () => void;
  onMenu: () => void;
}

export default function ScreenTopControls({ onBack, onMenu }: ScreenTopControlsProps) {
  return (
    <View style={styles.container}>
      <SpatialNavigationFocusableView onSelect={onBack}>
        {({ isFocused }) => (
          <Pressable
            accessibilityLabel="Back to Home"
            onPress={onBack}
            style={[styles.control, isFocused && styles.controlFocused]}
          >
            <Text style={[styles.backIcon, isFocused && styles.iconFocused]}>←</Text>
          </Pressable>
        )}
      </SpatialNavigationFocusableView>
      <SpatialNavigationFocusableView onSelect={onMenu}>
        {({ isFocused }) => (
          <Pressable
            accessibilityLabel="Open menu"
            onPress={onMenu}
            style={[styles.control, styles.menuControl, isFocused && styles.controlFocused]}
          >
            <Text style={[styles.menuIcon, isFocused && styles.iconFocused]}>☰</Text>
          </Pressable>
        )}
      </SpatialNavigationFocusableView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: scaledPixels(12),
    left: scaledPixels(24),
    position: 'absolute',
    top: scaledPixels(20),
    zIndex: 30,
  },
  control: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: scaledPixels(26),
    borderWidth: scaledPixels(1),
    height: scaledPixels(52),
    justifyContent: 'center',
    width: scaledPixels(52),
  },
  menuControl: {
    marginLeft: scaledPixels(2),
  },
  controlFocused: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.08 }],
  },
  backIcon: {
    color: '#FFFFFF',
    fontSize: scaledPixels(34),
    lineHeight: scaledPixels(38),
  },
  menuIcon: {
    color: '#FFFFFF',
    fontSize: scaledPixels(25),
  },
  iconFocused: {
    color: '#10141C',
  },
});
