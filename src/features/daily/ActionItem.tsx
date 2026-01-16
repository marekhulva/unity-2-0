import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Flame, Trophy, Zap, CheckCircle2, Circle, Target, Clock, Edit3, Trash2, MoreVertical } from 'lucide-react-native';
import { HapticManager } from '../../utils/haptics';
import { useStore } from '../../state/rootStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { LuxuryTheme } from '../../design/luxuryTheme';
// Using the main three-way privacy modal
import { PrivacySelectionModal } from './PrivacySelectionModal';

interface ActionItemProps {
  id: string;
  title: string;
  goalTitle?: string;
  done?: boolean;
  streak: number;
  time?: string;
  type?: 'goal' | 'performance' | 'commitment' | 'oneTime' | 'one-time';
  goalColor?: string;
}

// Helper function to format time from 24hr to 12hr with AM/PM
const formatTime = (time?: string) => {
  if (!time) return undefined;
  
  // Handle various time formats (HH:MM or HH:MM:SS)
  const parts = time.split(':');
  let hours = parseInt(parts[0]);
  const minutes = parts[1];
  
  if (isNaN(hours)) return time;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert 0 to 12 for midnight, and 13-23 to 1-11
  
  return `${hours}:${minutes} ${period}`;
};

export const ActionItem: React.FC<ActionItemProps> = ({ 
  id, 
  title, 
  goalTitle, 
  done = false, 
  streak,
  time,
  type = 'goal',
  goalColor
}) => {
  if (__DEV__) console.log('ActionItem rendering:', { title, goalTitle, goalColor });
  const toggle = useStore(s => s.toggleAction);
  const updateAction = useStore(s => s.updateAction);
  const deleteAction = useStore(s => s.deleteAction);
  const openShare = useStore(s => s.openShare);
  const addCompletedAction = useStore(s => s.addCompletedAction);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const scaleAnimation = useSharedValue(1);
  const streakGlow = useSharedValue(0);
  const checkAnimation = useSharedValue(done ? 1 : 0);
  
  // Streak glow animation for high streaks
  useEffect(() => {
    if (streak > 7) {
      streakGlow.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [streak]);

  // Complete animation
  useEffect(() => {
    checkAnimation.value = withSpring(done ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [done]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(checkAnimation.value, [0, 1], [1, 0.7]),
    transform: [{ scale: interpolate(checkAnimation.value, [0, 1], [1, 0.98]) }],
  }));

  const checkboxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(checkAnimation.value, [0, 1], [1, 1.1]) }],
  }));

  const streakBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(streakGlow.value, [0, 1], [1, 1.05]) }],
  }));

  const getStreakIcon = () => {
    if (streak >= 30) return <Trophy size={12} color={LuxuryTheme.colors.primary.gold} />;
    if (streak >= 7) return <Zap size={12} color={LuxuryTheme.colors.primary.gold} />;
    return <Flame size={12} color={LuxuryTheme.colors.primary.gold} />;
  };

  const handleToggle = () => {
    if (!done) {
      // Show privacy modal when completing an action
      if (__DEV__) console.log('Opening privacy modal for action:', title);
      setShowPrivacyModal(true);
      HapticManager.interaction.premiumPress();
    } else {
      // Allow unchecking
      toggle(id);
      HapticManager.interaction.tap();
    }
  };

  const handlePrivacySelect = (
    visibility: 'private' | 'public' | 'circle' | 'followers',
    contentType: 'photo' | 'audio' | 'text' | 'check',
    content?: string,
    mediaUri?: string
  ) => {
    // Mark action as complete
    toggle(id);
    if (streak >= 7) {
      HapticManager.context.streakExtended();
    } else {
      HapticManager.context.actionCompleted();
    }
    
    // Map content type to action type
    const actionType = contentType === 'photo' ? 'photo' :
                      contentType === 'audio' ? 'audio' :
                      contentType === 'text' ? 'milestone' : // Text becomes milestone type for variety
                      'check';

    // Use actual media URI if provided, otherwise generate mock for photos
    const mediaUrl = mediaUri || (contentType === 'photo'
      ? `https://picsum.photos/400/400?random=${Date.now()}`
      : undefined);
    
    // Store the completed action with privacy setting and content type
    // Map 'public' to 'circle' for backward compatibility
    const mappedVisibility = visibility === 'public' ? 'circle' : visibility;
    
    addCompletedAction({
      id: `${id}-${Date.now()}`,
      actionId: id,
      title,
      goalTitle,
      completedAt: new Date(),
      isPrivate: visibility === 'private',
      visibility: mappedVisibility as any, // Store mapped visibility for social feed
      streak: streak + 1,
      type: actionType,
      mediaUrl,
      content, // Include any comment/caption provided
      category: 'fitness', // Could be dynamic based on goal
    });
    
    // If sharing (not private) and not just a check, trigger share modal
    if (visibility !== 'private' && contentType !== 'check') {
      setTimeout(() => {
        openShare({
          type: 'checkin',
          visibility: mappedVisibility,
          actionTitle: title,
          goal: goalTitle,
          streak: streak + 1,
          goalColor: goalColor || LuxuryTheme.colors.primary.gold,
          contentType,
        });
      }, 500);
    }
    
    setShowPrivacyModal(false);
  };

  const handleEdit = () => {
    setShowActionMenu(false);
    Alert.prompt(
      'Edit Action',
      'Update your action details',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (newTitle) => {
            if (newTitle && newTitle.trim()) {
              updateAction(id, { title: newTitle.trim() });
              HapticManager.interaction.tap();
            }
          }
        }
      ],
      'plain-text',
      title
    );
  };

  const handleDelete = () => {
    setShowActionMenu(false);
    Alert.alert(
      'Delete Action',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteAction(id);
            HapticManager.error.strong();
          }
        }
      ]
    );
  };

  const handleLongPress = () => {
    setShowActionMenu(true);
    HapticManager.interaction.longPress();
  };

  return (
    <Animated.View entering={FadeIn} style={animatedStyle}>
      <TouchableOpacity onPress={handleToggle} onLongPress={handleLongPress} activeOpacity={0.7}>
        <View style={[styles.card, done && styles.cardDone]}>
          <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFillObject} />
          
          {/* Subtle gradient overlay */}
          <LinearGradient
            colors={done 
              ? ['rgba(34, 197, 94, 0.05)', 'rgba(34, 197, 94, 0.02)']
              : ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.01)']}
            style={StyleSheet.absoluteFillObject}
          />
          
          <View style={styles.row}>
            {/* Premium Checkbox */}
            <Animated.View style={[styles.checkbox, checkboxStyle]}>
              {done ? (
                <View style={styles.checkboxChecked}>
                  <LinearGradient
                    colors={[LuxuryTheme.colors.primary.gold, LuxuryTheme.colors.primary.champagne]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <CheckCircle2 color="#000" size={24} strokeWidth={3} />
                </View>
              ) : (
                <Circle color={LuxuryTheme.colors.text.tertiary} size={24} strokeWidth={1.5} />
              )}
            </Animated.View>
            
            {/* Content */}
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, done && styles.titleDone]}>{title}</Text>
                {time && (
                  <View style={styles.timeBadge}>
                    <Clock size={12} color={done ? LuxuryTheme.colors.text.muted : LuxuryTheme.colors.primary.gold} />
                    <Text style={[styles.timeText, done && styles.timeTextDone]}>{formatTime(time)}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.metaRow}>
                {time && (
                  <View style={styles.timeBadge}>
                    <Clock size={12} color={LuxuryTheme.colors.primary.gold} />
                    <Text style={styles.timeText}>{formatTime(time)}</Text>
                  </View>
                )}
                
                {goalTitle && (
                  <View style={styles.goalBadge}>
                    <Target size={12} color={LuxuryTheme.colors.primary.gold} />
                    <Text style={styles.goalText}>{goalTitle}</Text>
                  </View>
                )}
                
                {streak > 0 && (
                  <Animated.View style={[styles.streakBadge, streak > 7 && streakBadgeStyle]}>
                    <LinearGradient
                      colors={streak >= 30 
                        ? ['rgba(231, 180, 58, 0.2)', 'rgba(231, 180, 58, 0.1)']
                        : streak >= 7
                        ? ['rgba(231, 180, 58, 0.15)', 'rgba(231, 180, 58, 0.08)']
                        : ['rgba(231, 180, 58, 0.1)', 'rgba(231, 180, 58, 0.05)']
                      }
                      style={StyleSheet.absoluteFillObject}
                    />
                    {getStreakIcon()}
                    <Text style={styles.streakText}>{streak}</Text>
                    {streak >= 7 && <Text style={styles.streakLabel}>day{streak !== 1 ? 's' : ''}</Text>}
                  </Animated.View>
                )}
              </View>
            </View>

            {/* Completion Indicator */}
            {done && (
              <View style={styles.doneIndicator}>
                <Text style={styles.doneText}>✓</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Privacy Selection Modal */}
      <PrivacySelectionModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onSelect={handlePrivacySelect}
        actionTitle={title}
        streak={streak}
      />
      
      {/* Action Menu Modal */}
      {showActionMenu && (
        <TouchableOpacity 
          style={styles.overlay} 
          onPress={() => setShowActionMenu(false)}
          activeOpacity={1}
        >
          <View style={styles.actionMenu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Edit3 size={20} color={LuxuryTheme.colors.text.primary} />
              <Text style={styles.menuText}>Edit Action</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Trash2 size={20} color="#ef4444" />
              <Text style={[styles.menuText, { color: '#ef4444' }]}>Delete Action</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { 
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  cardDone: {
    backgroundColor: 'rgba(34, 197, 94, 0.03)',
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 16,
  },
  checkbox: {
    marginRight: 14,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: { 
    color: LuxuryTheme.colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
    flex: 1,
    marginRight: 8,
  },
  titleDone: {
    color: LuxuryTheme.colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: LuxuryTheme.colors.primary.gold,
    letterSpacing: 0.3,
  },
  timeTextDone: {
    color: LuxuryTheme.colors.text.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  goalText: {
    color: LuxuryTheme.colors.primary.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  streakText: {
    color: LuxuryTheme.colors.primary.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  streakLabel: {
    color: LuxuryTheme.colors.primary.gold,
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.8,
  },
  doneIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneText: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  actionMenu: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 16,
    padding: 8,
    minWidth: 180,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  menuText: {
    color: LuxuryTheme.colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12,
  },
});