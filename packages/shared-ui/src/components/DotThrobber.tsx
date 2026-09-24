import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const DOT_COUNT = 12;
const DOT_SIZE = 6;
const RADIUS = 22;
const THROBBER_SIZE = 56;
const STEP_DELAY = 90;

export default function DotThrobber() {
  const opacityValues = useRef(Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.25))).current;

  useEffect(() => {
    const animations = opacityValues.map((opacity, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * STEP_DELAY),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.25,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.delay((DOT_COUNT - index) * STEP_DELAY),
        ]),
      ),
    );

    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [opacityValues]);

  return (
    <View style={styles.container}>
      {opacityValues.map((opacity, index) => {
        const angle = (index / DOT_COUNT) * Math.PI * 2 - Math.PI / 2;
        const left = THROBBER_SIZE / 2 + Math.cos(angle) * RADIUS - DOT_SIZE / 2;
        const top = THROBBER_SIZE / 2 + Math.sin(angle) * RADIUS - DOT_SIZE / 2;

        return <Animated.View key={index} style={[styles.dot, { left, top, opacity }]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THROBBER_SIZE,
    position: 'relative',
    width: THROBBER_SIZE,
  },
  dot: {
    backgroundColor: '#A8FFF0',
    borderRadius: DOT_SIZE / 2,
    height: DOT_SIZE,
    position: 'absolute',
    width: DOT_SIZE,
  },
});
