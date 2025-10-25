import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
  FadeInDown,
  FadeIn,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useStore } from '../../state/rootStore';
import { RadialProgress } from '../../ui/RadialProgress';
import { HapticButton } from '../../ui/HapticButton';
import { DailyReviewModal } from './DailyReviewModal';
import { ActionItem } from './ActionItem';
import { GoalCard } from './GoalCard';
import { PrivacySelectionModal } from './PrivacySelectionModal';
import { SocialSharePrompt } from '../social/SocialSharePrompt';
import { EmptyState } from '../../ui/EmptyState';
import { JoinCircleModal } from '../social/JoinCircleModal';
import { LuxuryTheme } from '../../design/luxuryTheme';
import { Sparkles, Zap, Trophy, TrendingUp, Clock, Calendar, Target, CheckCircle2, Circle, CheckCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { HapticManager } from '../../utils/haptics';
import ChallengeDebugV2 from '../../utils/challengeDebugV2';

// Import CircleSelector for multiple circles support
import { CircleSelector } from '../circles/components/CircleSelector';

const { width, height } = Dimensions.get('window');

export const DailyScreen = () => {
  const insets = useSafeAreaInsets();
  const actions = useStore(s=>s.actions);
  const goals = useStore(s=>s.goals);
  const actionsLoading = useStore(s=>s.actionsLoading);
  const actionsError = useStore(s=>s.actionsError);
  const fetchDailyActions = useStore(s=>s.fetchDailyActions);
  const openOnboarding = useStore(s=>s.openOnboarding);
  const toggleAction = useStore(s=>s.toggleAction);
  const addCompletedAction = useStore(s=>s.addCompletedAction);
  const addPost = useStore(s=>s.addPost);
  const completed = actions.filter(a=>a.done).length;
  const progress = actions.length ? (completed/actions.length)*100 : 0;
  const openReview = useStore(s=>s.openDailyReview);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [showJoinCircleModal, setShowJoinCircleModal] = useState(false);
  const allCompleted = actions.length > 0 && completed === actions.length;

  // Multiple circles support
  const userCircles = useStore(s => s.userCircles);
  const activeCircleId = useStore(s => s.activeCircleId);
  const setActiveCircle = useStore(s => s.setActiveCircle);
  const fetchUserCircles = useStore(s => s.fetchUserCircles);
  const circlesLoading = useStore(s => s.circlesLoading);
  const circlesError = useStore(s => s.circlesError);
  const joinCircle = useStore(s => s.joinCircle);
  
  // console.log('Goals in DailyScreen:', goals);
  
  // Animations
  const pulseAnimation = useSharedValue(0);
  const progressScale = useSharedValue(0);
  const glowIntensity = useSharedValue(0);
  const shimmerAnimation = useSharedValue(0);
  const heroCardScale = useSharedValue(0.95);
  const streakAnimation = useSharedValue(0);
  
  // Calculate streak (mock data for now)
  const currentStreak = 7;
  const bestStreak = 21;
  
  // Fetch actions on mount
  useEffect(() => {
    console.log('🟦 [DAILY] DailyScreen mounted - fetching actions');
    fetchDailyActions();
    // Load all user's circles for the selector
    fetchUserCircles();
  }, []);

  // Handle circle selection changes
  useEffect(() => {
    if (activeCircleId !== undefined) {
      // Fetch actions for the selected circle (or all circles if null)
      fetchDailyActions();
    }
  }, [activeCircleId]);
  
  // Log actions when component mounts or actions change
  useEffect(() => {
    console.log('🟦 [DAILY] DailyScreen mounted/updated');
    console.log('🟦 [DAILY] Current actions:', actions.map(a => ({ 
      title: a.title, 
      goalId: a.goalId, 
      goalTitle: a.goalTitle,
      isFromChallenge: a.isFromChallenge,
      challengeName: a.challengeName,
      time: a.time 
    })));
    console.log('🟦 [DAILY] Current goals:', goals.map(g => ({ id: g.id, title: g.title })));
  }, [actions, goals]);
  
  // Initialize animations
  useEffect(() => {
    heroCardScale.value = withSpring(1, { damping: 12 });
    
    // Shimmer animation for glass effect
    shimmerAnimation.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);
  
  // Trigger share prompt at milestones - DISABLED
  // useEffect(() => {
  //   if (progress >= 70 && progress < 100 && !showSharePrompt) {
  //     setTimeout(() => setShowSharePrompt(true), 2000);
  //   }
  // }, [progress]);

  // Initial load animations
  useEffect(() => {
    heroCardScale.value = withSpring(1, { damping: 15, stiffness: 100 });
    progressScale.value = withDelay(200, withSpring(1, { damping: 12 }));
    
    // Streak fire animation
    if (currentStreak > 0) {
      streakAnimation.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
    }
  }, []);

  // Progress change animation - removed glow effect at 100%
  useEffect(() => {
    // Keep glow subtle and consistent, not based on progress
    glowIntensity.value = withTiming(0.3, { duration: 500 });
  }, []);

  // Continuous pulse for review button
  useEffect(() => {
    pulseAnimation.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const heroCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroCardScale.value }],
  }));
  
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnimation.value, [0, 0.5, 1], [0, 0.6, 0]),
    transform: [
      { translateX: interpolate(shimmerAnimation.value, [0, 1], [-200, 200]) }
    ],
  }));

  const progressRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0,  // Disable the glow completely
    shadowRadius: 0,
  }));

  const streakGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(streakAnimation.value, [0, 1], [0.6, 1]),
    transform: [{ scale: interpolate(streakAnimation.value, [0, 1], [1, 1.1]) }],
  }));

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { greeting: 'Good Morning', emoji: '☀️' };
    if (hour < 18) return { greeting: 'Good Afternoon', emoji: '🌤' };
    return { greeting: 'Good Evening', emoji: '🌙' };
  };

  const { greeting, emoji } = getTimeOfDay();

  const handleRetry = async () => {
    try {
      await fetchDailyActions();
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh actions. Please try again.');
    }
  };
  
  const formatTime = (time?: string) => {
    if (!time) return undefined;
    const parts = time.split(':');
    let hours = parseInt(parts[0]);
    const minutes = parts[1];
    if (isNaN(hours)) return time;
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  };

  const handleTaskToggle = (action: any) => {
    if (!action.done) {
      // Show privacy modal when completing an action
      setSelectedAction(action);
      setShowPrivacyModal(true);
      HapticManager.interaction.premiumPress();
    } else {
      // Allow unchecking
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
    // Start new debug flow
    ChallengeDebugV2.startNewFlow();

    // CHECKPOINT 1: Initial action data
    ChallengeDebugV2.checkpoint('CP1-DAILY-START', 'Selected action in Daily screen', selectedAction);

    console.log('🎯 [DAILY] handlePrivacySelect called:', {
      visibility,
      contentType,
      content,
      action: selectedAction?.title,
      isFromChallenge: selectedAction?.isFromChallenge,
      newVisibility
    });

    if (!selectedAction) return;

    // Mark action as complete
    toggleAction(selectedAction.id);
    HapticManager.context.actionCompleted();

    // Map content type to action type
    // Media (photo/audio) is attached via photoUri/audioUri fields, not via type
    const actionType = contentType === 'text' ? 'milestone' : 'check';

    // Use actual media URI if provided, otherwise use mock for testing
    const finalMediaUrl = mediaUri || (contentType === 'photo'
      ? `https://picsum.photos/400/400?random=${Date.now()}`
      : undefined);

    // Determine if private from new or old model
    const isPrivate = newVisibility ? newVisibility.isPrivate : visibility === 'private';

    // Store the completed action locally
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
      category: 'fitness', // Could be dynamic based on goal
    });

    // Post to feed if not private (saves to database)
    if (!isPrivate) {
      try {
        // CHECKPOINT 2: Building post data
        const postData = {
          type: actionType === 'check' ? 'checkin' : 'milestone',
          visibility: visibility, // Keep old visibility for backward compatibility
          content: content || `Completed: ${selectedAction.title}`, // Use user's comment if provided
          actionTitle: selectedAction.title,
          goal: selectedAction.goalTitle,
          goalColor: selectedAction.goalColor,
          streak: selectedAction.streak || 0,
          photoUri: contentType === 'photo' ? finalMediaUrl : undefined,
          audioUri: contentType === 'audio' ? finalMediaUrl : undefined,
          mediaUrl: finalMediaUrl, // Add for consistency with UnifiedActivityCard
          // Challenge-specific fields
          isChallenge: selectedAction.isFromChallenge || false,
          challengeName: selectedAction.challengeName,
          challengeId: selectedAction.challengeId,
          challengeActivityId: selectedAction.challengeActivityId,
          // NEW: Multi-circle visibility model
          ...(newVisibility && {
            isPrivate: newVisibility.isPrivate,
            isExplore: newVisibility.isExplore,
            isNetwork: newVisibility.isNetwork,
            circleIds: newVisibility.circleIds,
          }),
        };

        // CHECKPOINT 2: Post data before sending
        ChallengeDebugV2.checkpoint('CP2-POST-DATA', 'Post data created in Daily', postData);

        console.log('🎯 [DEBUG] Creating post with challenge data:', {
          isChallenge: postData.isChallenge,
          challengeName: postData.challengeName,
          isFromChallenge: selectedAction.isFromChallenge,
          actionTitle: selectedAction.title,
          newVisibility,
        });

        await addPost(postData);
        console.log('✅ Post saved to database for action:', selectedAction.title);
      } catch (error) {
        console.error('❌ Failed to save post to database:', error);
      }
    }

    setShowPrivacyModal(false);
    setSelectedAction(null);
  };

  // Show error state if there's an error
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
      {/* Pure Black Background */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000' }]} />

      {/* Circle Selector - for multiple circles support */}
      <CircleSelector
        circles={userCircles}
        activeCircleId={activeCircleId}
        onCircleSelect={setActiveCircle}
        onJoinCircle={() => setShowJoinCircleModal(true)}
        loading={circlesLoading}
        error={circlesError}
      />

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: 20, // Reduced from 50 since SafeAreaView handles top
            paddingBottom: insets.bottom + 180 // Increased to account for Review button
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Display */}
        <Animated.View 
          entering={FadeInDown.duration(500).springify()}
          style={styles.greetingContainer}
        >
          <Text style={styles.todayLabel}>TODAY</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </Animated.View>

        {/* Hero Progress Card - Liquid Gold Glass Style */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={[styles.heroCard, heroCardStyle]}
        >
          {/* Glass background with blur */}
          <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFillObject} />
          
          {/* Liquid Fill Effect */}
          <Animated.View style={[styles.heroLiquidFill, { height: `${progress + (progress > 0 ? 14 : 0)}%` }]}>
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 170, 0, 0.15)', 'rgba(255, 140, 0, 0.1)']} // Keep gold color always
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 1 }}
              end={{ x: 0.5, y: 0 }}
            />
            
            {/* Removed top edge glow for subtlety */}
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
              size={100} 
              strokeWidth={5}
              color='#FFFFFF'
            />
          </Animated.View>
          
          {/* Motivational Message */}
          <View style={styles.messageContainer}>
            {progress === 100 ? (
              <View style={styles.completionMessage}>
                <Text style={styles.completionText}>Perfect Day</Text>
                <View style={styles.completionCheck}>
                  <Text style={styles.checkmark}>✓</Text>
                </View>
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


        {/* Actions List - The Core Loop */}
        {/* Active Goals Section - Only show if user has goals - DISABLED */}
        {false && goals.length > 0 && (
          <View style={styles.goalsContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>ACTIVE GOALS</Text>
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{goals.length}</Text>
              </View>
            </View>
            
            <View style={styles.goalsList}>
              {/* Real goals */}
              {goals.slice(0, 3).map((goal, index) => {
                // Calculate progress for each goal
                const goalActions = actions.filter(a => a.goalId === goal.id);
                const goalCompleted = goalActions.filter(a => a.done).length;
                const goalProgress = goalActions.length > 0 
                  ? (goalCompleted / goalActions.length) * 100 
                  : 0;
                
                // Calculate days (example: using deadline)
                const startDate = new Date(goal.deadline);
                startDate.setDate(startDate.getDate() - 30); // Assume 30-day goals
                const currentDate = new Date();
                const totalDays = 30;
                const daysPassed = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                const currentDay = Math.min(Math.max(daysPassed, 1), totalDays);
                
                return (
                  <Animated.View
                    key={goal.id}
                    entering={FadeInDown.delay(100 + index * 50).springify()}
                    style={{ marginBottom: 12 }}
                  >
                    <GoalCard
                      title={goal.title}
                      currentDay={currentDay}
                      totalDays={totalDays}
                      progressPercent={goalProgress}
                      onPress={() => {
                        // Navigate to goal details or progress screen
                        HapticManager.interaction.tap();
                      }}
                    />
                  </Animated.View>
                );
              })}
            </View>
          </View>
        )}
        
        {/* Tasks Section */}
        <View style={styles.actionsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TODAY'S MISSION</Text>
            {actions.length > 0 && (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{completed}/{actions.length}</Text>
              </View>
            )}
          </View>
          
          {actions.length > 0 ? (
            <View style={styles.actionsList}>
              {actions
                .sort((a, b) => {
                  // Sort by time (earliest first)
                  if (!a.time && !b.time) return 0;
                  if (!a.time) return 1; // Actions without time go to the end
                  if (!b.time) return -1;
                  
                  // Convert time strings (HH:MM) to comparable numbers
                  const timeA = a.time.split(':').map(Number);
                  const timeB = b.time.split(':').map(Number);
                  const minutesA = timeA[0] * 60 + timeA[1];
                  const minutesB = timeB[0] * 60 + timeB[1];
                  
                  return minutesA - minutesB;
                })
                .map((action, index) => (
                <Animated.View
                  key={action.id}
                  entering={FadeInDown.delay(250 + index * 30).springify()}
                >
                  <Pressable
                    style={[styles.taskPill, action.done && styles.taskPillDone]}
                    onPress={() => handleTaskToggle(action)}
                  >
                    {/* Checkbox with ripple animation */}
                    <View style={styles.taskCheckbox}>
                      {action.done ? (
                        <CheckCircle2 size={22} color="#FFD700" />
                      ) : (
                        <Circle size={22} color="rgba(255, 255, 255, 0.3)" />
                      )}
                    </View>
                    
                    {/* Task content */}
                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, action.done && styles.taskTitleDone]} numberOfLines={1}>
                        {action.challengeIcon && <Text>{action.challengeIcon} </Text>}
                        {action.title}
                      </Text>
                      {action.goalTitle && (
                        <View style={styles.taskMetaRow}>
                          {/* Check if this action's goal is a routine or goal */}
                          {(() => {
                            const parentGoal = goals.find(g => g.id === action.goalId);
                            const isRoutine = parentGoal?.type === 'routine';
                            return (
                              <>
                                {isRoutine && (
                                  <View style={[styles.taskTypeBadge, { backgroundColor: 'rgba(100, 149, 237, 0.15)' }]}>
                                    <Text style={[styles.taskTypeBadgeText, { color: '#6495ED' }]}>
                                      🔄 Routine
                                    </Text>
                                  </View>
                                )}
                                <View style={styles.taskGoalPill}>
                                  <Text style={styles.taskGoalText}>{action.goalTitle}</Text>
                                </View>
                              </>
                            );
                          })()}
                        </View>
                      )}
                      {action.isFromChallenge && action.challengeName && (
                        <View style={styles.challengeBadge}>
                          <Text style={styles.challengeBadgeText}>⚡ {action.challengeName}</Text>
                        </View>
                      )}
                    </View>
                    
                    {/* Time pill */}
                    {action.time && action.time !== 'undefined' && (
                      <View style={styles.taskTimePill}>
                        <Clock size={12} color="#FFD700" />
                        <Text style={styles.taskTimeText}>{formatTime(action.time)}</Text>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              ))}
            </View>
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
        </View>

      </ScrollView>

      {/* DISABLED: Review Your Day Button - See REVIEW.md for re-enabling instructions */}
      {/*
      <Animated.View
        entering={FadeInDown.delay(400).springify()}
        style={styles.reviewContainerPinned}
      >
        <HapticButton
          onPress={() => {
            console.log('🟢 [DAILY SCREEN] Review button pressed');
            console.log('🟢 [DAILY SCREEN] Calling openReview function');
            openReview();
            console.log('🟢 [DAILY SCREEN] openReview called');
          }}
          style={styles.reviewButton}
          hapticType="medium"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.reviewButtonGlow} />
          <View style={styles.reviewButtonInnerShadow} />

          <LinearGradient
            colors={[
              '#E7B43A',
              '#F7E7CE'
            ]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />

          <View style={styles.reviewButtonContent}>
            <Text style={styles.reviewText}>Review Your Day</Text>
            <Text style={styles.reviewSubtext}>Reflect & Celebrate</Text>
          </View>
          <Animated.View style={[styles.reviewPulse, useAnimatedStyle(() => ({
            opacity: interpolate(
              pulseAnimation.value,
              [0, 1],
              [0.3, 0]
            ),
            transform: [{
              scale: interpolate(
                pulseAnimation.value,
                [0, 1],
                [1, 1.05]
              )
            }]
          }))]} />
        </HapticButton>
      </Animated.View>
      */}

      {/* DISABLED: Daily Review Modal - See REVIEW.md for re-enabling instructions */}
      {/* <DailyReviewModal /> */}
      <SocialSharePrompt
        visible={showSharePrompt}
        onClose={() => setShowSharePrompt(false)}
        progress={progress}
        completedActions={completed}
        totalActions={actions.length}
        streak={currentStreak}
      />
      {/* Removed ShareComposer - sharing is handled in PrivacySelectionModal */}
      
      {/* Privacy Selection Modal for task completion */}
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

      {/* Join Circle Modal */}
      <JoinCircleModal
        visible={showJoinCircleModal}
        onClose={() => setShowJoinCircleModal(false)}
        onJoin={async (circleCode) => {
          await joinCircle(circleCode);
          setShowJoinCircleModal(false);
        }}
      />

      {/* Loading Overlay */}
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
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    shadowColor: '#FFD700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8, // Reduced from 16 to 8 for wider cards
    // paddingTop and paddingBottom are now dynamic based on safe areas
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  todayLabel: {
    fontSize: 11,
    color: 'rgba(255, 215, 0, 0.7)',
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  date: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroCard: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(10, 10, 12, 0.3)', // Transparent like GoalCard
    borderWidth: 1,
    borderColor: '#D4AF37', // Gold border using the V6 color
    overflow: 'hidden',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  heroLiquidFill: {
    position: 'absolute',
    bottom: -14,  // Compensate for parent padding
    left: -14,    // Compensate for parent padding  
    right: -14,   // Compensate for parent padding
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
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakItem: {
    transform: [{ scale: 1.1 }],
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  streakValue: {
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  messageContainer: {
    width: '100%',
    alignItems: 'center',
  },
  completionMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
    letterSpacing: 0.5,
  },
  completionCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
  },
  motivationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  timePressureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.1)',
  },
  timePressureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timePressureTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeRemaining: {
    fontSize: 24,
    fontWeight: '600',
    color: '#60A5FA',
    marginBottom: 12,
  },
  timePressureBar: {
    height: 4,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timePressureFill: {
    height: '100%',
    backgroundColor: '#60A5FA',
  },
  goalsContainer: {
    marginBottom: 8,
  },
  goalsList: {
    marginTop: 8,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1.5,
  },
  sectionBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  actionsList: {
    gap: 8,
  },
  
  // Pill-style task card styles
  taskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  taskPillDone: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  taskCheckbox: {
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  taskTitleDone: {
    color: 'rgba(255, 255, 255, 0.5)',
    textDecorationLine: 'line-through',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  taskTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  taskTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskGoalPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  taskGoalText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFD700',
  },
  challengeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(147, 51, 234, 0.3)',
  },
  challengeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9333EA',
  },
  taskTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  taskTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
  },
  reviewContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  reviewContainerPinned: {
    position: 'absolute',
    bottom: 85, // Height of tab bar
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#000000',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.1)',
    zIndex: 100,
    elevation: 100,
  },
  reviewButton: {
    height: 56,  // Same height as Make Commitment
    borderRadius: 28,  // More rounded like Make Commitment
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  reviewButtonGlow: {
    display: 'none',  // Removed - Make Commitment doesn't have outer glow
  },
  reviewButtonInnerShadow: {
    display: 'none',  // Removed - Make Commitment doesn't have inner shadow
  },
  reviewButtonGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  reviewButtonContent: {
    alignItems: 'center',
    zIndex: 2,
  },
  reviewIconContainer: {
    marginBottom: 6,
    opacity: 0.7,  // Make icon more subtle
  },
  reviewText: {
    fontSize: 16,
    fontWeight: 'bold',  // Bold like Make Commitment
    color: '#000',  // Black text like Make Commitment
  },
  reviewSubtext: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(0, 0, 0, 0.6)',  // Black with opacity for subtlety
    letterSpacing: 0.5,
  },
  reviewPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#E7B43A',  // Brand gold pulse
    borderRadius: 28,
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
});