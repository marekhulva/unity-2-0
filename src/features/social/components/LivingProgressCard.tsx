import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Post } from '../../../state/slices/socialSlice';
import Svg, { Circle, Defs, Pattern, Rect, Line } from 'react-native-svg';
import {
  LivingProgressCardTokens as tokens,
  SCALE_FACTOR,
  BASE_DESIGN_WIDTH,
  CURRENT_SCREEN_WIDTH,
} from './LivingProgressCard.tokens';

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
  const remainingCount = totalActions - actionsToday;

  // Progress ring calculation
  const ringConfig = isPerfectDay ? tokens.progressRing.perfectDay : tokens.progressRing.normal;
  const circumference = 2 * Math.PI * ringConfig.radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Card width calculation for dynamic tile widths
  const [cardWidth, setCardWidth] = React.useState(0);
  const [cardHeight, setCardHeight] = React.useState(0);

  const onCardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCardWidth(width);
    setCardHeight(height);

    // Log card dimensions and ratio
    if (width > 0 && height > 0) {
      const ratio = width / height;
      console.log('📐 [LivingProgressCard] Card Measurements:', {
        width: width.toFixed(1),
        height: height.toFixed(1),
        ratio: ratio.toFixed(2),
        ratioString: `${ratio.toFixed(2)}:1`,
      });
    }
  };

  // Tile width calculation: match HTML flex behavior
  const cardInnerWidth = cardWidth - (tokens.card.padding * 2);
  const tileWidth = cardInnerWidth > 0
    ? (cardInnerWidth - (tokens.actionsRow.gap * 2)) / 3
    : tokens.actionTile.minWidth;

  // Debug logging on render
  React.useEffect(() => {
    if (__DEV__) {
      console.log('🎨 [LivingProgressCard] Layout Debug:', {
        screenWidth: CURRENT_SCREEN_WIDTH,
        baseWidth: BASE_DESIGN_WIDTH,
        scale: SCALE_FACTOR,
        cardPadding: tokens.card.padding,
        avatarSize: tokens.avatar.width,
        ringSize: ringConfig.size,
        fonts: {
          username: tokens.userInfo.username.fontSize,
          metadata: tokens.userInfo.metadata.fontSize,
          sectionLabel: tokens.sectionLabel.fontSize,
          actionLabel: tokens.actionTile.label.fontSize,
          footer: tokens.footer.fontSize,
        },
        spacing: {
          headerMargin: tokens.header.marginBottom,
          sectionLabelMargin: tokens.sectionLabel.marginBottom,
          actionsGap: tokens.actionsRow.gap,
          actionsMargin: tokens.actionsRow.marginBottom,
        },
        tileHeight: tokens.actionTile.height,
      });
    }
  }, [ringConfig.size]);

  // Tile label shortening
  const getTileLabel = (fullName: string): string => {
    if (!fullName) return '';
    let label = fullName.replace(/\s*\([^)]*\)/g, '').trim();

    if (label.toLowerCase().includes('progress') && label.toLowerCase().includes('photo')) return 'Photo';
    if (label.toLowerCase().startsWith('take progress')) return 'Photo';
    if (label.toLowerCase().startsWith('read')) return 'Read';
    if (label.toLowerCase().includes('breathwork')) return 'Breathwork';
    if (label.toLowerCase().includes('workout')) return 'Workout';
    if (label.toLowerCase().includes('journal')) return 'Journal';

    const words = label.split(/\s+/);
    if (words.length === 1) return label.substring(0, 14);

    const firstWord = words[0];
    if (firstWord.length >= 14) return firstWord.substring(0, 14);

    const twoWords = words.slice(0, 2).join(' ');
    if (twoWords.length <= 14) return twoWords;

    return firstWord.substring(0, 14);
  };

  // Smart tile selection - only show completed actions
  const getTileSlots = (): Array<{
    type: 'completed' | 'overflow';
    action?: any;
    overflowCount?: number;
  }> => {
    const completed = [...completedActions].sort((a, b) => b.order - a.order);

    if (completed.length === 0) return [];
    if (completed.length <= 3) {
      return completed.map(action => ({ type: 'completed' as const, action }));
    }

    return [
      { type: 'completed' as const, action: completed[0] },
      { type: 'completed' as const, action: completed[1] },
      { type: 'overflow' as const, overflowCount: completed.length - 2 },
    ];
  };

  const tileSlots = getTileSlots();

  const handleOverflowTap = () => {
    if (__DEV__) console.log('📊 [LivingProgressCard] Overflow tap');
  };

  const handleLongPress = (actionTitle: string) => {
    if (__DEV__) console.log('📋 [LivingProgressCard] Full name:', actionTitle);
  };

  // Debug outline helper - pointerEvents none so they don't affect layout
  const debugBorder = (color: string) => tokens.debug.enabled ? {
    borderWidth: 2,
    borderColor: color,
    borderStyle: 'dashed' as const,
  } : {};

  return (
    <View
      style={[
        styles.card,
        debugBorder(tokens.debug.colors.card)
      ]}
      onLayout={onCardLayout}
      pointerEvents="box-none"
    >
      {/* Mesh texture overlay */}
      <Svg
        width="100%"
        height="100%"
        style={styles.meshOverlay}
        pointerEvents="none"
      >
        <Defs>
          <Pattern
            id="meshGrid"
            width={tokens.mesh.patternSize}
            height={tokens.mesh.patternSize}
            patternUnits="userSpaceOnUse"
          >
            <Rect
              width={tokens.mesh.patternSize}
              height={tokens.mesh.patternSize}
              fill="transparent"
            />
            <Line
              x1="0"
              y1={tokens.mesh.patternSize / 2}
              x2={tokens.mesh.patternSize}
              y2={tokens.mesh.patternSize / 2}
              stroke="white"
              strokeWidth={tokens.mesh.strokeWidth}
            />
            <Line
              x1={tokens.mesh.patternSize / 2}
              y1="0"
              x2={tokens.mesh.patternSize / 2}
              y2={tokens.mesh.patternSize}
              stroke="white"
              strokeWidth={tokens.mesh.strokeWidth}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#meshGrid)" />
      </Svg>

      {/* Perfect Day Gold Top Line */}
      {isPerfectDay && (
        <LinearGradient
          colors={[
            'transparent',
            tokens.perfectDay.goldColor,
            tokens.perfectDay.goldColor,
            'transparent'
          ]}
          locations={[0, 0.2, 0.8, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.perfectDayTopLine}
          pointerEvents="none"
        />
      )}

      {/* Row 1: Header */}
      <View style={[styles.header, debugBorder(tokens.debug.colors.header)]}>
        <View style={styles.leftGroup}>
          {/* Avatar */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText} allowFontScaling={false}>
              {avatar || '👤'}
            </Text>
          </LinearGradient>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.username} allowFontScaling={false}>
              {user}
            </Text>
            <Text style={styles.metadata} allowFontScaling={false}>
              Today <Text style={styles.highlight}>{actionsToday} of {totalActions}</Text>  {percentage}%
            </Text>
          </View>
        </View>

        {/* Progress Ring */}
        <View
          style={[
            styles.progressRingContainer,
            {
              width: ringConfig.size,
              height: ringConfig.size,
              marginTop: tokens.progressRing.containerMargin.top,
              marginRight: tokens.progressRing.containerMargin.right,
            },
            debugBorder(tokens.debug.colors.ring)
          ]}
        >
          {isPerfectDay && <View style={styles.perfectDayGlow} pointerEvents="none" />}

          <Svg width={ringConfig.size} height={ringConfig.size} style={styles.progressRing} pointerEvents="none">
            <Circle
              cx={ringConfig.size / 2}
              cy={ringConfig.size / 2}
              r={ringConfig.radius}
              stroke={tokens.progressRing.strokeColor.background}
              strokeWidth={ringConfig.strokeWidth}
              fill="none"
            />
            <Circle
              cx={ringConfig.size / 2}
              cy={ringConfig.size / 2}
              r={ringConfig.radius}
              stroke={tokens.progressRing.strokeColor.progress}
              strokeWidth={ringConfig.strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              fill="none"
              transform={`rotate(-90 ${ringConfig.size / 2} ${ringConfig.size / 2})`}
            />
          </Svg>
          <Text style={styles.progressPercentage} allowFontScaling={false}>
            {percentage}%
          </Text>
        </View>

        {/* Perfect Day label in header */}
        {isPerfectDay && (
          <Text style={styles.perfectDayLabel} allowFontScaling={false}>
            Perfect Day
          </Text>
        )}
      </View>

      {/* Section Label */}
      <Text
        style={[styles.sectionLabel, debugBorder(tokens.debug.colors.sectionLabel)]}
        allowFontScaling={false}
      >
        COMPLETED
      </Text>

      {/* Row 3: Action Tiles */}
      <View style={[styles.actionsRow, debugBorder(tokens.debug.colors.actionsRow)]}>
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
                  style={styles.actionLabelOverflow}
                  numberOfLines={1}
                  allowFontScaling={false}
                >
                  +{slot.overflowCount} more
                </Text>
              </TouchableOpacity>
            );
          }

          const isNewest = index === 0;
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
                  isNewest && styles.actionLabelNewest,
                ]}
                numberOfLines={1}
                ellipsizeMode="clip"
                allowFontScaling={false}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Row 4: Footer */}
      {!isPerfectDay && remainingCount > 0 && (
        <Text
          style={[styles.footer, debugBorder(tokens.debug.colors.footer)]}
          allowFontScaling={false}
        >
          <Text style={styles.footerCount}>{remainingCount} left:</Text> Upcoming actions
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    width: '100%',
    backgroundColor: tokens.card.backgroundColor,
    borderRadius: tokens.card.borderRadius,
    padding: tokens.card.padding,
    borderWidth: tokens.card.borderWidth,
    borderColor: tokens.card.borderColor,
    shadowColor: tokens.card.shadowColor,
    shadowOffset: tokens.card.shadowOffset,
    shadowOpacity: tokens.card.shadowOpacity,
    shadowRadius: tokens.card.shadowRadius,
    marginBottom: 16,
  },
  meshOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: tokens.mesh.opacity,
  },
  perfectDayTopLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: tokens.perfectDay.topLineHeight,
    borderTopLeftRadius: tokens.card.borderRadius,
    borderTopRightRadius: tokens.card.borderRadius,
    shadowColor: tokens.perfectDay.goldColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.header.marginBottom,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.header.gap,
    flex: 1,
  },
  avatar: {
    width: tokens.avatar.width,
    height: tokens.avatar.height,
    borderRadius: tokens.avatar.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: tokens.avatar.fontSize,
    fontWeight: tokens.avatar.fontWeight,
    color: '#fff',
  },
  userInfo: {
    flexDirection: 'column',
    gap: tokens.userInfo.gap,
  },
  username: {
    fontSize: tokens.userInfo.username.fontSize,
    lineHeight: tokens.userInfo.username.lineHeight,
    fontWeight: tokens.userInfo.username.fontWeight,
    color: tokens.userInfo.username.color,
  },
  metadata: {
    fontSize: tokens.userInfo.metadata.fontSize,
    lineHeight: tokens.userInfo.metadata.lineHeight,
    color: tokens.userInfo.metadata.color,
  },
  highlight: {
    color: tokens.userInfo.highlight.color,
    fontWeight: tokens.userInfo.highlight.fontWeight,
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
    fontSize: tokens.progressRing.percentage.fontSize,
    fontWeight: tokens.progressRing.percentage.fontWeight,
    color: tokens.progressRing.percentage.color,
  },
  perfectDayGlow: {
    position: 'absolute',
    width: tokens.perfectDay.glowSize,
    height: tokens.perfectDay.glowSize,
    borderRadius: tokens.perfectDay.glowSize / 2,
    backgroundColor: tokens.perfectDay.goldColor,
    opacity: tokens.perfectDay.glowOpacity,
  },
  perfectDayLabel: {
    position: 'absolute',
    right: 0,
    top: -8,
    color: tokens.perfectDay.goldColor,
    fontSize: tokens.perfectDay.label.fontSize,
    fontWeight: tokens.perfectDay.label.fontWeight,
    letterSpacing: tokens.perfectDay.label.letterSpacing,
  },
  sectionLabel: {
    fontSize: tokens.sectionLabel.fontSize,
    fontWeight: tokens.sectionLabel.fontWeight,
    letterSpacing: tokens.sectionLabel.letterSpacing,
    color: tokens.sectionLabel.color,
    marginBottom: tokens.sectionLabel.marginBottom,
    marginLeft: tokens.sectionLabel.marginLeft,
    textTransform: 'uppercase',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: tokens.actionsRow.gap,
    justifyContent: 'flex-start',
    marginBottom: tokens.actionsRow.marginBottom,
  },
  actionTile: {
    height: tokens.actionTile.height,
    minWidth: tokens.actionTile.minWidth,
    maxWidth: tokens.actionTile.maxWidth,
    backgroundColor: tokens.actionTile.backgroundColor.normal,
    borderWidth: tokens.actionTile.borderWidth,
    borderColor: tokens.actionTile.borderColor,
    borderRadius: tokens.actionTile.borderRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.actionTile.gap,
    paddingHorizontal: tokens.actionTile.paddingHorizontal,
  },
  actionTileCompleted: {
    backgroundColor: tokens.actionTile.backgroundColor.completed,
  },
  actionTileNewest: {
    backgroundColor: tokens.actionTile.backgroundColor.newest,
    borderWidth: tokens.actionTile.borderWidthNewest,
    borderColor: tokens.perfectDay.goldColor,
    shadowColor: tokens.perfectDay.goldColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    paddingHorizontal: tokens.actionTile.paddingHorizontalNewest,
  },
  actionTileOverflow: {
    backgroundColor: tokens.actionTile.backgroundColor.overflow,
    borderColor: tokens.actionTile.borderColor,
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: tokens.actionTile.label.fontSize,
    fontWeight: tokens.actionTile.label.fontWeight,
    lineHeight: tokens.actionTile.label.lineHeight,
    color: tokens.actionTile.label.color.completed,
  },
  actionLabelNewest: {
    color: tokens.actionTile.label.color.newest,
    fontWeight: tokens.actionTile.label.fontWeightNewest,
  },
  actionLabelOverflow: {
    fontSize: tokens.actionTile.label.fontSizeMore,
    fontWeight: tokens.actionTile.label.fontWeight,
    color: tokens.perfectDay.goldColor,
    textAlign: 'center',
  },
  footer: {
    fontSize: tokens.footer.fontSize,
    color: tokens.footer.color,
  },
  footerCount: {
    color: tokens.footer.countColor,
    fontWeight: '600',
  },
});
