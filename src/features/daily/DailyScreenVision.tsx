import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useStore } from '../../state/rootStore';
import { PrivacySelectionModal } from './PrivacySelectionModal';
import { SocialSharePrompt } from '../social/SocialSharePrompt';
import { LuxuryTheme } from '../../design/luxuryTheme';
import { CheckCircle2, Circle, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { HapticManager } from '../../utils/haptics';
import ChallengeDebugV2 from '../../utils/challengeDebugV2';

type TimePeriod = 'morning' | 'afternoon' | 'evening';

interface GroupedActions {
  morning: any[];
  afternoon: any[];
  evening: any[];
}

export const DailyScreenVision = () => {
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

  const completed = actions.filter(a => a.done).length;
  const progress = actions.length ? Math.round((completed / actions.length) * 100) : 0;
  const currentStreak = 7;

  useEffect(() => {
    if (__DEV__) console.log('🟦 [DAILY-VISION] DailyScreenVision mounted');
    fetchDailyActions();
  }, []);

  const getTimePeriod = (time?: string): TimePeriod => {
    if (!time) return 'morning';
    const hour = parseInt(time.split(':')[0]);
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
    const monthDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { dayName, monthDay };
  };

  const { dayName, monthDay } = getCurrentDate();

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

  const renderPeriodSection = (period: TimePeriod, periodActions: any[]) => {
    if (periodActions.length === 0) return null;

    const periodNames = {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
    };

    return (
      <View key={period}>
        <View style={styles.periodHeader}>
          <Text style={styles.periodHeaderText}>{periodNames[period]}</Text>
        </View>

        <View style={styles.timeline}>
          {periodActions.map((action, index) => {
            const isActive = !action.done && action.id === nextAction?.id;
            return (
              <Animated.View
                key={action.id}
                entering={FadeInDown.delay(index * 50).springify()}
                style={styles.timelineItem}
              >
                <Text style={styles.timelineTime}>{formatTime24(action.time)}</Text>
                <View style={[
                  styles.timelineDot,
                  action.done && styles.timelineDotCompleted,
                  isActive && styles.timelineDotActive,
                ]} />
                <Pressable
                  style={[
                    styles.timelineCard,
                    action.done && styles.timelineCardCompleted,
                  ]}
                  onPress={() => handleTaskToggle(action)}
                >
                  <View style={styles.cardContent}>
                    <Text style={[
                      styles.cardTitle,
                      action.done && styles.cardTitleCompleted,
                    ]}>
                      {action.title}
                    </Text>
                    <View style={styles.cardMeta}>
                      {action.goalTitle && (
                        <>
                          <Text style={styles.cardMetaText}>{action.goalTitle}</Text>
                        </>
                      )}
                      {action.challengeName && (
                        <>
                          {action.goalTitle && <Text style={styles.cardMetaText}>•</Text>}
                          <Text style={styles.cardMetaText}>{action.challengeName}</Text>
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
            <View style={styles.todayDate}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.dayName}>{dayName}</Text>
              <Text style={styles.dateNum}>{monthDay}</Text>
            </View>

            <View style={styles.dailyProgress}>
              <View style={styles.progressRingWrapper}>
                <View style={[
                  styles.progressRingOuter,
                  {
                    background: `conic-gradient(#E7B43A ${progress * 3.6}deg, rgba(255,255,255,0.08) ${progress * 3.6}deg)`
                  } as any
                ]}>
                  <LinearGradient
                    colors={progress > 0 ? ['#E7B43A', '#E7B43A'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)']}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 40 }]}
                  />
                  <View style={styles.progressRingInner}>
                    <Text style={styles.progressPercent}>{progress}%</Text>
                    <Text style={styles.progressLabel}>DONE</Text>
                  </View>
                </View>
              </View>
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.statLabel}>Completed</Text>
                  <Text style={styles.statValue}>{completed} of {actions.length}</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.statLabel}>Current streak</Text>
                  <Text style={styles.statValue}>{currentStreak} days 🔥</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {nextAction && (
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={styles.section}
            >
              <View style={styles.nextUpCard}>
                <Text style={styles.nextLabel}>UP NEXT</Text>
                <Text style={styles.nextTitle}>{nextAction.title}</Text>
                <View style={styles.nextTime}>
                  <Clock size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.nextTimeText}>{formatTime(nextAction.time)}</Text>
                  {nextAction.goalTitle && (
                    <>
                      <Text style={styles.nextTimeText}>•</Text>
                      <Text style={styles.nextTimeText}>{nextAction.goalTitle}</Text>
                    </>
                  )}
                </View>
              </View>
            </Animated.View>
          )}

          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionHeader}>Today's Schedule</Text>

            {actions.length > 0 ? (
              <>
                {renderPeriodSection('morning', groupedActions.morning)}
                {renderPeriodSection('afternoon', groupedActions.afternoon)}
                {renderPeriodSection('evening', groupedActions.evening)}
              </>
            ) : (
              <View style={styles.emptyButtonContainer}>
                <Pressable
                  style={styles.startGoalButton}
                  onPress={openOnboarding}
                >
                  <LinearGradient
                    colors={['#FFD700', '#FFA500']}
                    style={styles.startGoalGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                  <Text style={styles.startGoalText}>Start Goal Setup</Text>
                </Pressable>
              </View>
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
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  dailyContainer: {
    backgroundColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 10,
  },
  dailyHero: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  todayDate: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 20,
    overflow: 'hidden',
  },
  dayName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'transparent',
    letterSpacing: -0.5,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
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
  },
  progressRingOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E7B43A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  progressRingInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E7B43A',
    lineHeight: 22,
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
    paddingTop: 25,
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
  },
  nextTimeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
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
  timeline: {
    position: 'relative',
    paddingLeft: 70,
    borderLeftWidth: 2,
    borderLeftColor: '#E7B43A',
    marginLeft: 25,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 20,
  },
  timelineTime: {
    position: 'absolute',
    left: -70,
    top: 14,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    width: 50,
    textAlign: 'right',
  },
  timelineDot: {
    position: 'absolute',
    left: -51,
    top: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: '#000',
    zIndex: 2,
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
  emptyButtonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
});
