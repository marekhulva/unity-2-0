import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface GoalCardProps {
  title: string;
  currentDay?: number;
  totalDays?: number;
  progressPercent: number;
  onPress?: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ 
  title, 
  currentDay = 1,
  totalDays = 30,
  progressPercent,
  onPress 
}) => {
  const pressAnimation = useSharedValue(0);
  const liquidAnimation = useSharedValue(0);
  const waveAnimation = useSharedValue(0);
  const shimmerAnimation = useSharedValue(0);
  const fillHeight = useSharedValue(0);
  
  // Animate liquid fill on mount and when progress changes
  useEffect(() => {
    fillHeight.value = withSpring(progressPercent, {
      damping: 12,
      stiffness: 80,
    });
    
    // Wave animation for liquid effect
    waveAnimation.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
    
    // Shimmer animation disabled - no more moving glow
    // shimmerAnimation.value = withRepeat(
    //   withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
    //   -1,
    //   true
    // );
  }, [progressPercent]);
  
  const handlePressIn = () => {
    pressAnimation.value = withSpring(1, { damping: 15 });
  };
  
  const handlePressOut = () => {
    pressAnimation.value = withSpring(0, { damping: 15 });
  };
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(pressAnimation.value, [0, 1], [0, -1]) }
    ],
    shadowOpacity: interpolate(pressAnimation.value, [0, 1], [0.45, 0.55]),
  }));
  
  // Liquid fill animation
  const liquidFillStyle = useAnimatedStyle(() => ({
    height: `${fillHeight.value}%`,
    transform: [
      { translateY: interpolate(waveAnimation.value, [0, 1], [0, -3]) }
    ],
  }));
  
  // Wave overlay animation
  const waveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(waveAnimation.value, [0, 1], [-50, 50]) },
      { scaleY: interpolate(waveAnimation.value, [0, 0.5, 1], [1, 1.1, 1]) }
    ],
  }));
  
  // Shimmer animation
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnimation.value, [0, 0.5, 1], [0, 0.6, 0]),
    transform: [
      { translateX: interpolate(shimmerAnimation.value, [0, 1], [-200, 200]) }
    ],
  }));
  
  const dayLabel = `Day ${currentDay} of ${totalDays}`;
  
  return (
    <Pressable 
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* Glass background with blur */}
        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFillObject} />
        
        {/* Base background */}
        <View style={[StyleSheet.absoluteFillObject, styles.baseBackground]} />
        
        {/* Liquid Gold Fill Effect - DISABLED by setting opacity to 0 */}
        <Animated.View style={[styles.liquidFill, liquidFillStyle, { opacity: 0 }]}>
          {/* Base liquid gradient - Uniform opacity */}
          <LinearGradient
            colors={['rgba(255, 215, 0, 0.6)', 'rgba(255, 195, 0, 0.6)', 'rgba(255, 170, 0, 0.6)']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 1 }}
            end={{ x: 0.5, y: 0 }}
          />
          
          {/* Wave effect overlay */}
          <Animated.View style={[styles.waveOverlay, waveStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255, 223, 0, 0.5)', 'transparent']}
              style={styles.wave}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
          
          {/* Top edge glow - Subtle */}
          <View style={styles.liquidEdge}>
            <LinearGradient
              colors={['rgba(255, 223, 0, 0.3)', 'rgba(255, 215, 0, 0.2)', 'transparent']}
              style={styles.edgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
          </View>
        </Animated.View>
        
        {/* Glass shimmer effect - DISABLED */}
        
        {/* Inner highlight */}
        <View style={styles.innerHighlight} />
        
        {/* Content */}
        <View style={styles.content}>
          {/* Left zone - Title */}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          
          {/* Right zone - Day counter and progress bar */}
          <View style={styles.rightZone}>
            {/* Day counter with gradient text (fallback to solid gold) */}
            <Text style={styles.dayTextGold}>{dayLabel}</Text>
            
            {/* Compact progress bar */}
            <View style={styles.progressBar}>
              {/* Track with inner shadow */}
              <View style={styles.progressTrack}>
                <View style={styles.trackInnerShadow} />
              </View>
              
              {/* Fill with gradient and glow */}
              {progressPercent > 0 && (
                <View style={[styles.progressFillContainer, { width: `${progressPercent}%` }]}>
                  {/* Glow effect */}
                  <View style={styles.progressGlow} />
                  
                  {/* Gradient fill */}
                  <LinearGradient
                    colors={['#FFD168', '#F5A623']}
                    style={styles.progressFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 76,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 10, 12, 0.3)', // Much more transparent
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)', // Gold border
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  baseBackground: {
    backgroundColor: 'transparent', // Remove grey background
  },
  liquidFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  waveOverlay: {
    position: 'absolute',
    top: -10,
    left: -50,
    right: -50,
    height: 30,
  },
  wave: {
    flex: 1,
    borderRadius: 50,
  },
  liquidEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 8,
  },
  edgeGradient: {
    flex: 1,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    zIndex: 10,
  },
  shimmerGradient: {
    flex: 1,
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 76,
  },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.96)',
    letterSpacing: 0.1,
    flex: 1,
    marginRight: 12,
  },
  rightZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTextGold: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.15,
    color: '#FFC84A', // Solid gold fallback since React Native doesn't support text gradients easily
  },
  progressBar: {
    width: 72,
    height: 10,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    position: 'relative',
    overflow: 'hidden',
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  trackInnerShadow: {
    position: 'absolute',
    top: 1,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
  },
  progressFillContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'visible',
  },
  progressGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: 'rgba(245, 166, 35, 0.25)',
    borderRadius: 9999,
    // Apply blur programmatically if needed
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 9999,
  },
});