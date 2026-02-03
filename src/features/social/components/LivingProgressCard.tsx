import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Post } from '../../../state/slices/socialSlice';
import { LuxuryTheme } from '../../../design/luxuryTheme';
import Svg, { Circle, Defs, Pattern, Rect, Line } from 'react-native-svg';

interface LivingProgressCardProps {
  post: Post;
}

export const LivingProgressCard: React.FC<LivingProgressCardProps> = ({ post }) => {
  const {
    user,
    avatar,
    completedActions = [],
    totalActions = 0,
    actionsToday = 0,
  } = post;

  const percentage = totalActions > 0 ? Math.round((actionsToday / totalActions) * 100) : 0;
  const isPerfectDay = percentage === 100;

  // Calculate remaining actions
  const remainingCount = totalActions - actionsToday;

  // Progress ring calculation
  const ringSize = 52; // Always 52 for consistent card height
  const radius = 21;
  const strokeWidth = 6; // Always 6 for visibility
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Card width calculation for fixed tile widths
  const [cardWidth, setCardWidth] = React.useState(0);

  const onCardLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setCardWidth(width);
  };

  // Tile width calculation: (cardInnerWidth - gap * 2) / 3
  const cardInnerWidth = cardWidth - 32; // 16px padding on each side
  const gap = 8;
  const tileWidth = cardInnerWidth > 0 ? (cardInnerWidth - gap * 2) / 3 : 110;

  // Aggressive tile label shortening - always single line
  const getTileLabel = (fullName: string): string => {
    if (!fullName) return '';

    // Remove parentheses and trim
    let label = fullName.replace(/\s*\([^)]*\)/g, '').trim();

    // Simple mappings
    if (label.toLowerCase().includes('progress') && label.toLowerCase().includes('photo')) return 'Photo';
    if (label.toLowerCase().startsWith('take progress')) return 'Photo';
    if (label.toLowerCase().startsWith('read')) return 'Read';
    if (label.toLowerCase().includes('breathwork')) return 'Breathwork';
    if (label.toLowerCase().includes('workout')) return 'Workout';
    if (label.toLowerCase().includes('journal')) return 'Journal';

    // Single word - return as is
    const words = label.split(/\s+/);
    if (words.length === 1) {
      return label.substring(0, 14);
    }

    // Multi-word - take first 1-2 words, cap at 14 chars
    const firstWord = words[0];
    if (firstWord.length >= 14) {
      return firstWord.substring(0, 14);
    }

    const twoWords = words.slice(0, 2).join(' ');
    if (twoWords.length <= 14) {
      return twoWords;
    }

    return firstWord.substring(0, 14);
  };

  // Smart tile selection - only show completed actions
  const getTileSlots = (): Array<{
    type: 'completed' | 'overflow';
    action?: any;
    overflowCount?: number;
  }> => {
    const slots = [];
    const completed = [...completedActions].sort((a, b) => b.order - a.order);

    // No completed actions - return empty array
    if (completed.length === 0) {
      return [];
    }

    // 1-3 completed actions - show all
    if (completed.length <= 3) {
      return completed.map(action => ({ type: 'completed' as const, action }));
    }

    // More than 3 completed - show 2 completed + overflow
    slots.push({ type: 'completed' as const, action: completed[0] });
    slots.push({ type: 'completed' as const, action: completed[1] });
    slots.push({ type: 'overflow' as const, overflowCount: completed.length - 2 });

    return slots;
  };

  const tileSlots = getTileSlots();

  // Overflow tap handler
  const handleOverflowTap = () => {
    if (__DEV__) console.log('📊 [LivingProgressCard] Overflow tap - show all actions');
  };

  // Long press handler for full action name
  const handleLongPress = (actionTitle: string) => {
    if (__DEV__) console.log('📋 [LivingProgressCard] Full action name:', actionTitle);
    // TODO: Show tooltip or bottom sheet with full name
  };

  return (
    <View style={[styles.card, isPerfectDay && styles.perfectDayCard]}>
      {/* Mesh texture overlay */}
      <Svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.01,
          pointerEvents: 'none',
        }}
      >
        <Defs>
          <Pattern
            id="meshGrid"
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
          >
            <Rect width="4" height="4" fill="transparent" />
            <Line x1="0" y1="2" x2="4" y2="2" stroke="white" strokeWidth="2" />
            <Line x1="2" y1="0" x2="2" y2="4" stroke="white" strokeWidth="2" />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#meshGrid)" />
      </Svg>

      {/* Perfect Day Gold Top Line */}
      {isPerfectDay && (
        <LinearGradient
          colors={['transparent', LuxuryTheme.colors.primary.gold, LuxuryTheme.colors.primary.gold, 'transparent']}
          locations={[0, 0.2, 0.8, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.perfectDayTopLine}
        />
      )}

      {/* Row 1: Header */}
      <View style={styles.header}>
        <View style={styles.leftGroup}>
          {/* Avatar */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{avatar || '👤'}</Text>
          </LinearGradient>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.username}>{user}</Text>
            <Text style={styles.metadata}>
              Today <Text style={styles.highlight}>{actionsToday} of {totalActions}</Text>  {percentage}%
            </Text>
          </View>
        </View>

        {/* Progress Ring */}
        <View style={[styles.progressRingContainer, { width: ringSize, height: ringSize }]}>
          {isPerfectDay && (
            <View style={styles.perfectDayGlow} />
          )}
          <Svg width={ringSize} height={ringSize} style={styles.progressRing}>
            {/* Background circle */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle */}
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={LuxuryTheme.colors.primary.gold}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              fill="none"
              transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            />
          </Svg>
          <Text style={styles.progressPercentage}>{percentage}%</Text>
        </View>

        {/* Perfect Day label in header */}
        {isPerfectDay && (
          <Text style={styles.perfectDayLabel}>Perfect Day</Text>
        )}
      </View>

      {/* Section Label */}
      <Text style={styles.sectionLabel}>COMPLETED</Text>

      {/* Row 3: Action Tiles */}
      <View
        style={styles.actionsRow}
        onLayout={onCardLayout}
      >
        {tileSlots.map((slot, index) => {
          if (slot.type === 'overflow') {
            return (
              <TouchableOpacity
                key={`overflow-${index}`}
                style={[
                  styles.actionTile,
                  styles.actionTileOverflow,
                  { width: tileWidth }
                ]}
                onPress={handleOverflowTap}
              >
                <Text
                  style={[styles.actionLabel, { color: LuxuryTheme.colors.primary.gold, textAlign: 'center' }]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  +{slot.overflowCount} more
                </Text>
              </TouchableOpacity>
            );
          }

          // Completed tile
          const isNewest = index === 0 && completedActions.length > 0 && slot.action === completedActions.sort((a, b) => b.order - a.order)[0];
          const label = getTileLabel(slot.action?.title || '');

          return (
            <TouchableOpacity
              key={slot.action?.actionId || `tile-${index}`}
              style={[
                styles.actionTile,
                styles.actionTileCompleted,
                isNewest && styles.actionTileNewest,
                { width: tileWidth }
              ]}
              onLongPress={() => handleLongPress(slot.action?.title || '')}
              delayLongPress={500}
            >
              <Text
                style={[
                  styles.actionLabel,
                  styles.actionLabelCompleted,
                  isNewest && styles.actionLabelNewest,
                ]}
                numberOfLines={1}
                ellipsizeMode="clip"
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Row 4: Footer - only for in-progress */}
      {!isPerfectDay && remainingCount > 0 && (
        <Text style={styles.footer}>
          <Text style={styles.footerCount}>{remainingCount} left:</Text>
          {' '}
          Upcoming actions
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    marginBottom: 16,
  },
  perfectDayCard: {
    // No additional styling needed - top line is handled separately
  },
  perfectDayTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: LuxuryTheme.colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flexDirection: 'column',
    gap: 2,
  },
  username: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  metadata: {
    color: '#888',
    fontSize: 14,
    lineHeight: 17,
  },
  highlight: {
    color: LuxuryTheme.colors.primary.gold,
    fontWeight: '600',
  },
  progressRingContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
  },
  progressPercentage: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  perfectDayGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: LuxuryTheme.colors.primary.gold,
    opacity: 0.15,
  },
  perfectDayLabel: {
    position: 'absolute',
    right: 0,
    top: -8,
    color: LuxuryTheme.colors.primary.gold,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    color: LuxuryTheme.colors.primary.gold,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  actionTile: {
    height: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionTileCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionTileNewest: {
    backgroundColor: 'rgba(231, 180, 58, 0.08)',
    borderWidth: 2,
    borderColor: LuxuryTheme.colors.primary.gold,
    shadowColor: LuxuryTheme.colors.primary.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    paddingHorizontal: 11,
  },
  actionTileUpcoming: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'transparent',
  },
  actionTileOverflow: {
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(231, 180, 58, 0.06)',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 20,
  },
  actionLabel: {
    color: '#e0e0e0',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 16,
  },
  actionLabelCompleted: {
    color: '#f0f0f0',
  },
  actionLabelNewest: {
    color: LuxuryTheme.colors.primary.gold,
    fontWeight: '600',
  },
  actionLabelUpcoming: {
    color: '#999',
    fontSize: 13,
    lineHeight: 16,
  },
  footer: {
    color: '#888',
    fontSize: 13,
  },
  footerCount: {
    color: '#aaa',
    fontWeight: '600',
  },
});
