import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useStore } from '../../state/rootStore';
import { PrivacySelectionModal } from './PrivacySelectionModal';
import { SocialSharePrompt } from '../social/SocialSharePrompt';
import { LuxuryTheme } from '../../design/luxuryTheme';
import { CheckCircle2, Circle as CircleIcon, Clock, Sparkles, Target, Play, SkipForward, Calendar, Flame, Dumbbell, Brain, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { HapticManager } from '../../utils/haptics';
import ChallengeDebugV2 from '../../utils/challengeDebugV2';

// 🎛️ FEATURE FLAGS - Toggle features on/off easily
const FEATURES = {
  LARGER_PROGRESS_RING: true,
  PULSE_ANIMATION: true,
  TIME_BASED_MOTIVATION: false,
  GLASSMORPHISM_NEXT_UP: true,
  COUNTDOWN_TIMER: true,
  QUICK_ACTIONS: true,
  NOW_INDICATOR: true,
  COLOR_CODE_BY_TIME: false,        // ← TURNED OFF - no orange for overdue
  GROUP_BY_STATUS: true,
  CATEGORY_ICONS: true,
  STREAK_BADGES: true,
  ENHANCED_SPACING: true,
  CHALLENGE_PROGRESS_BAR: true,
};

type TimePeriod = 'morning' | 'afternoon' | 'evening';
type TimeStatus = 'overdue' | 'current' | 'upcoming';

interface GroupedActions {
  morning: any[];
  afternoon: any[];
  evening: any[];
}

// Helper: Get category icon
const getCategoryIcon = (title: string, goalTitle?: string) => {
  const text = `${title} ${goalTitle}`.toLowerCase();
  if (text.includes('workout') || text.includes('exercise') || text.includes('fitness') || text.includes('gym')) {
    return <Dumbbell size={14} color="#E7B43A" />;
  }
  if (text.includes('meditat') || text.includes('mindful') || text.includes('breath')) {
    return <Brain size={14} color="#E7B43A" />;
  }
  if (text.includes('read') || text.includes('book') || text.includes('study') || text.includes('learn')) {
    return <BookOpen size={14} color="#E7B43A" />;
  }
  return null;
};

// Helper: Get time status
const getTimeStatus = (time?: string): TimeStatus => {
  if (!time) return 'upcoming';
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const actionTime = new Date();
  actionTime.setHours(hours, minutes, 0, 0);

  const diffMins = (actionTime.getTime() - now.getTime()) / 60000;

  if (diffMins < -15) return 'overdue';
  if (diffMins >= -15 && diffMins <= 15) return 'current';
  return 'upcoming';
};

// Helper: Get motivational message
const getMotivationalMessage = (progress: number, overdueCount: number, currentTime: string): string => {
  const hour = new Date().getHours();

  // Removed overdue messaging - always show motivational messages

  if (progress === 0) {
    if (hour < 12) return "Your day starts now";
    if (hour < 18) return "Afternoon momentum";
    return "Evening wind down";
  }

  if (progress === 100) {
    return "All done! 🎉";
  }

  if (progress >= 75) return "Almost there!";
  if (progress >= 50) return "Great progress!";
  return "Keep going!";
};

export const DailyScreenVisionTEST = () => {
  const insets = useSafeAreaInsets();
  const actions = useStore(s => s.actions);
  const goals = useStore(s => s.goals);
  const actionsLoading = useStore(s => s.actionsLoading);
  const actionsError = useStore(s => s.actionsError);
  const fetchDailyActions = useStore(s => s.fetchDailyActions);
  const openOnboarding = useStore(s => s.openOnboarding);
  const toggleAction = useStore(s => s.toggleAction);
  const addCompletedAction = useStore(s => s.addCompletedAction);
  const addPost = useStore(s => s.addPost);
  const recordCompletion = useStore(s => s.recordCompletion);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const completed = actions.filter(a => a.done).length;
  const progress = actions.length ? Math.round((completed / actions.length) * 100) : 0;

  // Calculate real streak from actions
  const currentStreak = useMemo(() => {
    // Find the action with highest streak
    const maxStreak = actions.reduce((max, action) => {
      return Math.max(max, action.streak || 0);
    }, 0);
    return maxStreak;
  }, [actions]);

  // Calculate overdue tasks
  const overdueCount = useMemo(() => {
    return actions.filter(a => !a.done && getTimeStatus(a.time) === 'overdue').length;
  }, [actions]);

  // Motivational message
  const motivationMessage = useMemo(() => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    return getMotivationalMessage(progress, overdueCount, currentTime);
  }, [progress, overdueCount]);

  // Pulse animation for progress ring
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (FEATURES.PULSE_ANIMATION && progress > 0) {
      pulseScale.value = withRepeat(
        withSequence(
          withSpring(1.05, { damping: 2 }),
          withSpring(1, { damping: 2 })
        ),
        -1,
        false
      );
    }
  }, [progress]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // Check for 100% completion and trigger celebration
  useEffect(() => {
    if (progress === 100 && actions.length > 0 && !showCelebration) {
      setShowCelebration(true);
      HapticManager.context.success();
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, [progress, actions.length]);

  useEffect(() => {
    if (__DEV__) console.log('🟦 [DAILY-VISION-TEST] DailyScreenVisionTEST mounted');
    fetchDailyActions();
  }, []);

  const getTimePeriod = (time?: string): TimePeriod => {
    if (!time) return 'morning';
    const hour = parseInt(time.split(':')[0]);
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const getCurrentPeriod = (): TimePeriod => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  };

  const groupedActions = useMemo<GroupedActions>(() => {
    const groups: GroupedActions = {
      morning: [],
      afternoon: [],
      evening: [],
    };

    actions.forEach(action => {
      const period = getTimePeriod(action.time);
      groups[period].push(action);
    });

    Object.keys(groups).forEach(key => {
      groups[key as TimePeriod].sort((a, b) => {
        if (!a.time || !b.time) return 0;
        const timeA = a.time.split(':').map(Number);
        const timeB = b.time.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
    });

    return groups;
  }, [actions]);

  const nextAction = useMemo(() => {
    return actions.find(a => !a.done);
  }, [actions]);

  // Get time until action
  const getRelativeTime = (time?: string): string => {
    if (!time) return '';
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const actionTime = new Date();
    actionTime.setHours(hours, minutes, 0, 0);

    const diffMs = actionTime.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 0) {
      const absMins = Math.abs(diffMins);
      if (absMins < 60) return `${absMins} min ago`;
      const hours = Math.floor(absMins / 60);
      return `${hours}h ago`;
    } else {
      if (diffMins < 60) return `in ${diffMins} min`;
      const hours = Math.floor(diffMins / 60);
      return `in ${hours}h`;
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    const parts = time.split(':');
    let hours = parseInt(parts[0]);
    const minutes = parts[1];
    if (isNaN(hours)) return time;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  };

  const formatTime24 = (time?: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const getCurrentDate = () => {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const dayShort = now.toLocaleDateString('en-US', { weekday: 'short' }); // "Wed"
    const monthDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fullDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return { dayName, dayShort, monthDay, fullDate };
  };

  const { dayName, dayShort, monthDay, fullDate } = getCurrentDate();

  const handleTaskToggle = (action: any) => {
    if (!action.done) {
      setSelectedAction(action);
      setShowPrivacyModal(true);
      HapticManager.interaction.premiumPress();
    } else {
      toggleAction(action.id);
      HapticManager.interaction.tap();
    }
  };

  const handlePrivacySelect = async (
    visibility: 'private' | 'circle' | 'followers',
    contentType: 'photo' | 'audio' | 'text' | 'check',
    content?: string,
    mediaUri?: string,
    newVisibility?: {
      isPrivate: boolean;
      isExplore: boolean;
      isNetwork: boolean;
      circleIds: string[];
    }
  ) => {
    ChallengeDebugV2.startNewFlow();
    ChallengeDebugV2.checkpoint('CP1-DAILY-START', 'Selected action in Daily screen', selectedAction);

    if (!selectedAction) return;

    if (selectedAction.isFromChallenge && selectedAction.challengeActivityId) {
      const isLinkedActivity = selectedAction.id && !selectedAction.id.startsWith('challenge-');
      const linkedActionId = isLinkedActivity ? selectedAction.id : undefined;

      const success = await recordCompletion(
        selectedAction.challengeParticipantId,
        selectedAction.challengeActivityId,
        linkedActionId,
        mediaUri
      );

      if (success) {
        await fetchDailyActions();
      }
    } else {
      toggleAction(selectedAction.id);
    }

    HapticManager.context.actionCompleted();

    const actionType = contentType === 'text' ? 'milestone' : 'check';
    const finalMediaUrl = mediaUri || (contentType === 'photo'
      ? `https://picsum.photos/400/400?random=${Date.now()}`
      : undefined);
    const isPrivate = newVisibility ? newVisibility.isPrivate : visibility === 'private';

    addCompletedAction({
      id: `${selectedAction.id}-${Date.now()}`,
      actionId: selectedAction.id,
      title: selectedAction.title,
      goalTitle: selectedAction.goalTitle,
      completedAt: new Date(),
      isPrivate,
      streak: selectedAction.streak || 0,
      type: actionType,
      mediaUrl: finalMediaUrl,
      category: 'fitness',
    });

    if (!isPrivate) {
      try {
        const postData = {
          type: actionType === 'check' ? 'checkin' : 'milestone',
          visibility: visibility,
          content: content || `Completed: ${selectedAction.title}`,
          actionTitle: selectedAction.title,
          goal: selectedAction.goalTitle,
          goalColor: selectedAction.goalColor,
          streak: selectedAction.streak || 0,
          photoUri: contentType === 'photo' ? finalMediaUrl : undefined,
          audioUri: contentType === 'audio' ? finalMediaUrl : undefined,
          mediaUrl: finalMediaUrl,
          isChallenge: selectedAction.isFromChallenge || false,
          challengeName: selectedAction.challengeName,
          challengeId: selectedAction.challengeId,
          challengeActivityId: selectedAction.challengeActivityId,
          ...(newVisibility && {
            isPrivate: newVisibility.isPrivate,
            isExplore: newVisibility.isExplore,
            isNetwork: newVisibility.isNetwork,
            circleIds: newVisibility.circleIds,
          }),
        };

        ChallengeDebugV2.checkpoint('CP2-POST-DATA', 'Post data created in Daily', postData);
        await addPost(postData);
      } catch (error) {
        if (__DEV__) console.error('❌ Failed to save post to database:', error);
      }
    }

    setShowPrivacyModal(false);
    setSelectedAction(null);
  };

  const handleRetry = async () => {
    try {
      await fetchDailyActions();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh actions. Please try again.');
    }
  };

  // Check if time is current period
  const isCurrentTimePeriod = (period: TimePeriod): boolean => {
    return period === getCurrentPeriod();
  };

  const renderPeriodSection = (period: TimePeriod, periodActions: any[]) => {
    if (periodActions.length === 0) return null;

    const periodNames = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
    };

    const isCurrent = isCurrentTimePeriod(period);

    return (
      <View key={period}>
        <View style={styles.periodHeader}>
          <Text style={[
            styles.periodHeaderText,
            isCurrent && styles.periodHeaderTextActive
          ]}>
            {periodNames[period]}
          </Text>
          {isCurrent && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>NOW</Text>
            </View>
          )}
        </View>

        <View style={styles.timeline}>
          {periodActions.map((action, index) => {
            const isActive = !action.done && action.id === nextAction?.id;
            const relativeTime = getRelativeTime(action.time);
            const timeStatus = FEATURES.COLOR_CODE_BY_TIME ? getTimeStatus(action.time) : 'upcoming';
            const categoryIcon = FEATURES.CATEGORY_ICONS ? getCategoryIcon(action.title, action.goalTitle) : null;

            return (
              <Animated.View
                key={action.id}
                entering={FadeInDown.delay(index * 50).springify()}
                style={[
                  styles.timelineItem,
                  FEATURES.ENHANCED_SPACING && styles.timelineItemEnhanced
                ]}
              >
                <View style={styles.timeColumn}>
                  <Text style={[
                    styles.timelineTime,
                    FEATURES.COLOR_CODE_BY_TIME && timeStatus === 'overdue' && styles.timelineTimeOverdue,
                    FEATURES.COLOR_CODE_BY_TIME && timeStatus === 'current' && styles.timelineTimeCurrent,
                  ]}>{formatTime24(action.time)}</Text>
                  {relativeTime && (
                    <Text style={[
                      styles.relativeTime,
                      FEATURES.COLOR_CODE_BY_TIME && timeStatus === 'overdue' && styles.relativeTimeOverdue,
                    ]}>{relativeTime}</Text>
                  )}
                </View>
                <View style={[
                  styles.timelineDot,
                  action.done && styles.timelineDotCompleted,
                  isActive && styles.timelineDotActive,
                  FEATURES.COLOR_CODE_BY_TIME && timeStatus === 'overdue' && !action.done && styles.timelineDotOverdue,
                ]} />
                <Pressable
                  style={[
                    styles.timelineCard,
                    action.done && styles.timelineCardCompleted,
                    FEATURES.COLOR_CODE_BY_TIME && timeStatus === 'overdue' && !action.done && styles.timelineCardOverdue,
                  ]}
                  onPress={() => handleTaskToggle(action)}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardTitleRow}>
                      {categoryIcon && (
                        <View style={styles.categoryIconWrapper}>{categoryIcon}</View>
                      )}
                      <Text style={[
                        styles.cardTitle,
                        action.done && styles.cardTitleCompleted,
                        FEATURES.ENHANCED_SPACING && styles.cardTitleEnhanced,
                      ]}>
                        {action.title}
                      </Text>
                    </View>
                    <View style={styles.cardMeta}>
                      {action.goalTitle && (
                        <Text style={styles.cardMetaText}>{action.goalTitle}</Text>
                      )}
                      {action.challengeName && (
                        <>
                          {action.goalTitle && <Text style={styles.cardMetaText}>•</Text>}
                          <Text style={styles.cardMetaText}>{action.challengeName}</Text>
                        </>
                      )}
                      {FEATURES.STREAK_BADGES && action.streak && action.streak > 1 && (
                        <>
                          {(action.goalTitle || action.challengeName) && <Text style={styles.cardMetaText}>•</Text>}
                          <View style={styles.streakBadge}>
                            <Flame size={10} color="#FF6B35" />
                            <Text style={styles.streakText}>{action.streak}</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={[
                    styles.completionCircle,
                    action.done && styles.completionCircleCompleted,
                  ]}>
                    {action.done && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>
    );
  };

  // SVG Progress Ring Component
  const ProgressRing = ({ progress }: { progress: number }) => {
    const size = FEATURES.LARGER_PROGRESS_RING ? 100 : 80;
    const strokeWidth = FEATURES.LARGER_PROGRESS_RING ? 8 : 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progressOffset = circumference - (progress / 100) * circumference;

    const RingContent = (
      <View style={[styles.progressRingWrapper, FEATURES.LARGER_PROGRESS_RING && styles.progressRingWrapperLarge]}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
              <Stop offset="100%" stopColor="#E7B43A" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
          />
        </Svg>
        <View style={styles.progressRingInner}>
          <Text style={[styles.progressPercent, FEATURES.LARGER_PROGRESS_RING && styles.progressPercentLarge]}>{progress}%</Text>
          <Text style={styles.progressLabel}>DONE</Text>
        </View>
      </View>
    );

    if (FEATURES.PULSE_ANIMATION && progress > 0) {
      return <Animated.View style={pulseStyle}>{RingContent}</Animated.View>;
    }

    return RingContent;
  };

  if (actionsError && !actionsLoading) {
    return (
      <View style={styles.container}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000' }]} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>{actionsError}</Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <LinearGradient
              colors={[LuxuryTheme.colors.primary.gold, LuxuryTheme.colors.primary.champagne]}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Enhanced Empty State
  const renderEmptyState = () => (
    <Animated.View entering={FadeIn} style={styles.emptyState}>
      <LinearGradient
        colors={['rgba(231,180,58,0.15)', 'transparent']}
        style={styles.emptyGradient}
      />
      <Target size={64} color="#E7B43A" strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>Your day, your way</Text>
      <Text style={styles.emptySubtitle}>
        Start building your perfect routine.{'\n'}
        Set goals and schedule daily actions to{'\n'}
        transform your life, one day at a time.
      </Text>
      <Pressable style={styles.startGoalButton} onPress={openOnboarding}>
        <LinearGradient
          colors={['#FFD700', '#FFA500']}
          style={styles.startGoalGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <Text style={styles.startGoalText}>Start Goal Setup</Text>
      </Pressable>
    </Animated.View>
  );

  // 100% Completion Celebration
  const renderCelebration = () => {
    if (!showCelebration) return null;

    return (
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.celebrationOverlay}
      >
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={styles.celebrationCard}>
          <Sparkles size={48} color="#FFD700" />
          <Text style={styles.celebrationTitle}>Amazing!</Text>
          <Text style={styles.celebrationSubtitle}>
            You completed all {actions.length} actions today!
          </Text>
          {currentStreak > 0 && (
            <Text style={styles.celebrationStreak}>{currentStreak} day streak 🔥</Text>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000' }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dailyContainer}>
          <Animated.View
            entering={FadeInDown.duration(400).springify()}
            style={styles.dailyHero}
          >
            <View style={styles.dateBadgeContainer}>
              <LinearGradient
                colors={['#E7B43A', '#FFD700']}
                style={styles.dayBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.dayBadgeText}>{dayShort.toUpperCase()}</Text>
              </LinearGradient>
              <Text style={styles.fullDateText}>{fullDate}</Text>
            </View>

            <View style={styles.dailyProgress}>
              <ProgressRing progress={progress} />
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.statLabel}>Completed</Text>
                  <Text style={styles.statValue}>{completed} of {actions.length}</Text>
                </View>
                {currentStreak > 0 && (
                  <View style={styles.progressStat}>
                    <Text style={styles.statLabel}>Current streak</Text>
                    <Text style={styles.statValue}>{currentStreak} days 🔥</Text>
                  </View>
                )}
              </View>
            </View>

            {FEATURES.TIME_BASED_MOTIVATION && (
              <Text style={styles.motivationText}>
                {motivationMessage}
              </Text>
            )}
          </Animated.View>


          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.section}
          >
            {actions.length === 0 ? (
              renderEmptyState()
            ) : (
              <>
                <Text style={styles.sectionHeader}>Today's Schedule</Text>
                {renderPeriodSection('morning', groupedActions.morning)}
                {renderPeriodSection('afternoon', groupedActions.afternoon)}
                {renderPeriodSection('evening', groupedActions.evening)}
              </>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      <SocialSharePrompt
        visible={showSharePrompt}
        onClose={() => setShowSharePrompt(false)}
        progress={progress}
        completedActions={completed}
        totalActions={actions.length}
        streak={currentStreak}
      />

      <PrivacySelectionModal
        visible={showPrivacyModal}
        onClose={() => {
          setShowPrivacyModal(false);
          setSelectedAction(null);
        }}
        onSelect={handlePrivacySelect}
        actionTitle={selectedAction?.title || ''}
        streak={selectedAction?.streak || 0}
      />

      {actionsLoading && (
        <View style={styles.loadingOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={LuxuryTheme.colors.primary.gold} />
            <Text style={styles.loadingText}>Loading your actions...</Text>
          </View>
        </View>
      )}

      {renderCelebration()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 0,
  },
  dailyContainer: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  dailyHero: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dateBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: 'center',
    marginBottom: 20,
  },
  dayBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 100,
  },
  dayBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fullDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  dailyProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressRingWrapper: {
    width: 80,
    height: 80,
    flexShrink: 0,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingWrapperLarge: {
    width: 100,
    height: 100,
  },
  progressRingInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E7B43A',
    lineHeight: 22,
  },
  progressPercentLarge: {
    fontSize: 28,
    lineHeight: 28,
  },
  progressLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressStats: {
    flex: 1,
    gap: 10,
  },
  progressStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  section: {
    padding: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E7B43A',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nextUpCard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(231,180,58,0.35)',
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 14,
    shadowColor: '#E7B43A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  nextLabel: {
    fontSize: 9,
    color: '#E7B43A',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: 5,
  },
  nextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  nextTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  nextTimeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  nextRelativeText: {
    fontSize: 11,
    color: '#E7B43A',
    fontWeight: '600',
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  periodHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginRight: 10,
  },
  periodHeaderTextActive: {
    color: '#E7B43A',
  },
  currentBadge: {
    backgroundColor: 'rgba(231,180,58,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E7B43A',
    letterSpacing: 1,
  },
  timeline: {
    position: 'relative',
    paddingLeft: 70,
    borderLeftWidth: 2,
    borderLeftColor: '#E7B43A',
    marginLeft: 10,
    overflow: 'visible',
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 20,
    overflow: 'visible',
  },
  timeColumn: {
    position: 'absolute',
    left: -70,
    top: 8,
    width: 50,
    alignItems: 'flex-end',
  },
  timelineTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  relativeTime: {
    fontSize: 9,
    color: '#E7B43A',
    fontWeight: '600',
    marginTop: 2,
  },
  timelineDot: {
    position: 'absolute',
    left: -76,
    top: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: '#000',
    zIndex: 10,
  },
  timelineDotCompleted: {
    backgroundColor: '#E7B43A',
    shadowColor: '#E7B43A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  timelineDotActive: {
    backgroundColor: '#E7B43A',
    width: 14,
    height: 14,
    borderRadius: 7,
    left: -77,
    shadowColor: '#E7B43A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  timelineCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timelineCardCompleted: {
    opacity: 0.7,
    backgroundColor: 'rgba(231,180,58,0.06)',
    borderColor: 'rgba(231,180,58,0.25)',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  cardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: 'rgba(255,255,255,0.5)',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  completionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionCircleCompleted: {
    backgroundColor: '#E7B43A',
    borderColor: '#E7B43A',
    shadowColor: '#E7B43A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  checkmark: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    position: 'relative',
  },
  emptyGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  startGoalButton: {
    position: 'relative',
    borderRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 36,
    paddingVertical: 14,
  },
  startGoalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  startGoalText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
    fontWeight: '500',
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  celebrationCard: {
    backgroundColor: 'rgba(11, 15, 18, 0.95)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    minWidth: 280,
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFD700',
    marginTop: 16,
    marginBottom: 8,
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  celebrationStreak: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E7B43A',
    marginTop: 16,
  },
  // 🎨 NEW FEATURE STYLES
  motivationText: {
    fontSize: 13,
    color: '#E7B43A',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  motivationTextWarning: {
    color: '#FF6B35',
  },
  nextUpCardGlass: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  nextUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  countdown: {
    fontSize: 11,
    color: '#E7B43A',
    fontWeight: '700',
    backgroundColor: 'rgba(231,180,58,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quickActionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  timelineItemEnhanced: {
    marginBottom: 24,
  },
  timelineTimeOverdue: {
    color: '#FF6B35',
  },
  timelineTimeCurrent: {
    color: '#E7B43A',
    fontWeight: '700',
  },
  relativeTimeOverdue: {
    color: '#FF6B35',
  },
  timelineDotOverdue: {
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
  },
  timelineCardOverdue: {
    borderColor: 'rgba(255,107,53,0.3)',
    backgroundColor: 'rgba(255,107,53,0.05)',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIconWrapper: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231,180,58,0.1)',
    borderRadius: 10,
  },
  cardTitleEnhanced: {
    fontSize: 15,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,107,53,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  streakText: {
    fontSize: 10,
    color: '#FF6B35',
    fontWeight: '700',
  },
});
