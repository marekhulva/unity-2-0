import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { RadialProgress } from '../../ui/RadialProgress';

interface HeroCardV1Props {
  progress: number;
  completed: number;
  total: number;
  currentStreak: number;
  heroCardStyle?: any;
  progressRingStyle?: any;
  shimmerStyle?: any;
}

export const HeroCardV1: React.FC<HeroCardV1Props> = ({
  progress,
  completed,
  total,
  currentStreak,
  heroCardStyle,
  progressRingStyle,
  shimmerStyle,
}) => {
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
      
      {/* Main Progress Ring */}
      <Animated.View style={[styles.progressRing, progressRingStyle]}>
        <RadialProgress 
          progress={progress} 
          size={120} 
          strokeWidth={5}
          color={progress === 100 ? '#FFD700' : '#FFFFFF'}
        />
      </Animated.View>
      
      {/* Quick Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{completed}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        {/* Streak */}
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.streakValue]}>{currentStreak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>
      
      {/* Motivational Message */}
      <View style={styles.messageContainer}>
        {progress === 100 ? (
          <View style={styles.completionMessage}>
            <Text style={styles.completionText}>Complete ✓</Text>
          </View>
        ) : progress >= 80 ? (
          <Text style={styles.motivationText}>So close</Text>
        ) : progress >= 50 ? (
          <Text style={styles.motivationText}>Halfway there</Text>
        ) : progress > 0 ? (
          <Text style={styles.motivationText}>Good start</Text>
        ) : (
          <Text style={styles.motivationText}>Start your day</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 20,
    padding: 16,
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
  progressRing: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  streakValue: {
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageContainer: {
    marginTop: 8,
  },
  completionMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  motivationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
});