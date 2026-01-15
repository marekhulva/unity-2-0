import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useStore } from '../../state/rootStore';
import { PrivacySelectionModal } from './PrivacySelectionModal';
import { SocialSharePrompt } from '../social/SocialSharePrompt';
import { LuxuryTheme } from '../../design/luxuryTheme';
import { Target, Dumbbell, Brain, BookOpen } from 'lucide-react-native';
import { HapticManager } from '../../utils/haptics';
import ChallengeDebugV2 from '../../utils/challengeDebugV2';

const getCategoryIcon = (title: string, goalTitle?: string) => {
  const text = `${title} ${goalTitle}`.toLowerCase();
  if (text.includes('workout') || text.includes('exercise') || text.includes('fitness') || text.includes('gym')) {
    return '💪';
  }
  if (text.includes('meditat') || text.includes('mindful') || text.includes('breath')) {
    return '🧘';
  }
  if (text.includes('read') || text.includes('book') || text.includes('study') || text.includes('learn')) {
    return '📖';
  }
  if (text.includes('run') || text.includes('jog')) {
    return '🏃';
  }
  if (text.includes('water') || text.includes('drink') || text.includes('hydrat')) {
    return '💧';
  }
  if (text.includes('wake') || text.includes('morning') || text.includes('sunrise')) {
    return '☀️';
  }
  return '✨';
};

export const DailyScreenOption2 = () => {
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

  const currentStreak = useMemo(() => {
    const maxStreak = actions.reduce((max, action) => {
      return Math.max(max, action.streak || 0);
    }, 0);
    return maxStreak;
  }, [actions]);

  useEffect(() => {
    console.log('🟦 [DAILY-OPTION2] DailyScreenOption2 mounted');
    fetchDailyActions();
  }, []);

  const sortedActions = useMemo(() => {
    return [...actions].sort((a, b) => {
      if (!a.time || !b.time) return 0;
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });
  }, [actions]);

  const formatTime24 = (time?: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDateString = () => {
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const monthDay = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return `${dayName}, ${monthDay}`;
  };

  const getWeekProgress = () => {
    return 75;
  };

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
        console.error('❌ Failed to save post to database:', error);
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

  if (actionsError && !actionsLoading) {
    return (
      <View style={styles.container}>
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]} />
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
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(400).springify()}
          style={styles.header}
        >
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.dateInfo}>{getDateString()}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{completed}/{actions.length}</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{getWeekProgress()}%</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
          </View>
        </Animated.View>

        {actions.length === 0 ? (
          renderEmptyState()
        ) : (
          <Animated.View
            entering={FadeInDown.delay(200).springify()}
            style={styles.timeline}
          >
            <LinearGradient
              colors={['#E7B43A', 'rgba(231,180,58,0.2)']}
              style={styles.timelineLine}
            />
            {sortedActions.map((action, index) => {
              const icon = getCategoryIcon(action.title, action.goalTitle);

              return (
                <Animated.View
                  key={action.id}
                  entering={FadeInDown.delay(index * 50).springify()}
                  style={styles.timelineItem}
                >
                  <Text style={styles.time}>{formatTime24(action.time)}</Text>
                  <View style={[styles.dot, action.done && styles.dotCompleted]} />
                  <Pressable
                    style={[styles.card, action.done && styles.cardCompleted]}
                    onPress={() => handleTaskToggle(action)}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.activityIcon}>{icon}</Text>
                      <Text style={[
                        styles.activityName,
                        action.done && styles.activityNameCompleted
                      ]}>
                        {action.title}
                      </Text>
                      {action.done && <Text style={styles.checkIcon}>✓</Text>}
                    </View>
                    {(action.goalTitle || action.challengeName) && (
                      <Text style={styles.cardDetails}>
                        {[action.challengeName, action.goalTitle].filter(Boolean).join(' • ')}
                      </Text>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}
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
    paddingTop: 0,
  },
  header: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  dateInfo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    color: '#E7B43A',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase',
  },
  timeline: {
    padding: 20,
    paddingTop: 24,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 39,
    top: 0,
    bottom: 0,
    width: 2,
  },
  timelineItem: {
    position: 'relative',
    paddingLeft: 60,
    marginBottom: 28,
  },
  time: {
    position: 'absolute',
    left: 0,
    top: 2,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  dot: {
    position: 'absolute',
    left: 32,
    top: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: '#000',
    zIndex: 10,
  },
  dotCompleted: {
    backgroundColor: '#E7B43A',
    shadowColor: '#E7B43A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
  },
  cardCompleted: {
    backgroundColor: 'rgba(231,180,58,0.1)',
    borderColor: 'rgba(231,180,58,0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  activityIcon: {
    fontSize: 20,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  activityNameCompleted: {
    color: '#E7B43A',
  },
  checkIcon: {
    fontSize: 16,
    color: '#E7B43A',
  },
  cardDetails: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
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
});
