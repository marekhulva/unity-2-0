import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { RadialProgress } from '../../ui/RadialProgress';

interface HeroCardV2Props {
  progress: number;
  completed: number;
  total: number;
  heroCardStyle?: any;
  progressRingStyle?: any;
  shimmerStyle?: any;
}

export const HeroCardV2: React.FC<HeroCardV2Props> = ({
  progress,
  completed,
  total,
  heroCardStyle,
  progressRingStyle,
  shimmerStyle,
}) => {
  // Determine motivational message based on progress
  const getMessage = () => {
    if (progress === 100) return "Complete ✓";
    if (progress >= 80) return "Almost there";
    if (progress >= 50) return "Halfway done";
    if (progress > 0) return "Keep going";
    return "Start your day";
  };

  return (
    <Animated.View style={[styles.heroCard, heroCardStyle]}>
      {/* Glass background with blur */}
      <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFillObject} />
      
      {/* Liquid Gold Fill Effect - based on progress */}
      <Animated.View style={[styles.heroLiquidFill, { height: `${progress}%` }]}>
        <LinearGradient
          colors={['rgba(255, 215, 0, 0.6)', 'rgba(255, 170, 0, 0.7)', 'rgba(255, 140, 0, 0.5)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 1 }}
          end={{ x: 0.5, y: 0 }}
        />
        
        {/* Top edge glow */}
        <View style={styles.heroLiquidEdge}>
          <LinearGradient
            colors={['rgba(255, 223, 0, 0.9)', 'rgba(255, 215, 0, 0.4)', 'transparent']}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </View>
      </Animated.View>
      
      {/* Glass shimmer effect */}
      <Animated.View style={[styles.heroShimmer, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.1)', 'transparent']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
      
      {/* Main Content - Simplified */}
      <View style={styles.content}>
        {/* Large Percentage Display */}
        <View style={styles.percentageContainer}>
          <Text style={styles.percentageNumber}>{Math.round(progress)}</Text>
          <Text style={styles.percentageSymbol}>%</Text>
        </View>
        
        {/* Progress Label */}
        <Text style={styles.progressLabel}>DAILY PROGRESS</Text>
        
        {/* Motivational Message */}
        <View style={styles.messageContainer}>
          <Text style={[
            styles.message,
            progress === 100 && styles.messageComplete
          ]}>
            {getMessage()}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    backgroundColor: 'rgba(10, 10, 12, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    minHeight: 200,
  },
  heroLiquidFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  heroLiquidEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  heroShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 150,
    zIndex: 10,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  percentageNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: -2,
  },
  percentageSymbol: {
    fontSize: 36,
    fontWeight: '600',
    color: 'rgba(255, 215, 0, 0.9)',
    marginLeft: 2,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 16,
  },
  messageContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  messageComplete: {
    color: '#FFD700',
  },
});