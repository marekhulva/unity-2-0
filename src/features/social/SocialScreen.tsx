import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  interpolate,
  Easing,
  FadeInDown,
  FadeIn,
  runOnJS,
} from 'react-native-reanimated';
import { useStore } from '../../state/rootStore';
import { ShareComposer } from './ShareComposer';
import { FeedCard } from './components/FeedCard';
import { Post } from '../../state/slices/socialSlice';
import { LuxuryTheme } from '../../design/luxuryTheme';
import { LiquidGlassTabs } from './components/LiquidGlassTabs';
import { PostPromptCard } from './components/PostPromptCard';
import { NeonDivider } from '../../ui/atoms/NeonDivider';
import { AnimatedFeedView } from './components/AnimatedFeedView';
import { Users, TrendingUp, Bell, Sparkles, Activity, Flame, UserPlus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CircleMembersModal } from './CircleMembersModal';
import { JoinCircleModal } from './JoinCircleModal';
import { DiscoverUsersModal } from './DiscoverUsersModal';

const { width, height } = Dimensions.get('window');

export const SocialScreen = () => {
  const insets = useSafeAreaInsets();
  const feedView = useStore(s=>s.feedView);
  const setFeedView = useStore(s=>s.setFeedView);
  const circle = useStore(s=>s.circleFeed);
  const follow = useStore(s=>s.followFeed);
  const completedActions = useStore(s=>s.completedActions);
  const profile = useStore(s=>s.profile);
  const user = useStore(s=>s.user); // Get user for avatar
  const circleId = useStore(s=>s.circleId);
  const circleName = useStore(s=>s.circleName);
  const loadCircleData = useStore(s=>s.loadCircleData);
  const fetchFeeds = useStore(s=>s.fetchFeeds);
  const loadFollowing = useStore(s=>s.loadFollowing);
  
  // Modal states
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showJoinCircleModal, setShowJoinCircleModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  
  // Load data on mount
  React.useEffect(() => {
    loadCircleData();
    fetchFeeds();
    loadFollowing();
  }, []);
  
  // Debug: Log user avatar
  React.useEffect(() => {
    console.log('SocialScreen - Current user avatar:', user?.avatar);
    console.log('SocialScreen - Circle:', { circleId, circleName });
  }, [user?.avatar, circleId, circleName]);
  
  // Add public completed actions to the feed
  const publicActions = completedActions.filter(ca => !ca.isPrivate);
  const actionPosts: Post[] = publicActions.map(ca => ({
    id: `action-${ca.id}`,
    user: 'You',
    avatar: user?.avatar || '👤', // Include user's avatar
    type: 'checkin',
    actionTitle: ca.title,
    goal: ca.goalTitle,
    streak: ca.streak,
    reactions: {}, // Initialize as empty object for proper reaction tracking
    time: new Date(ca.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: ca.completedAt, // Add timestamp for sorting
    goalColor: LuxuryTheme.colors.primary.gold,
    visibility: 'circle' as const,
    content: '',
  }));
  
  // Combine posts with public completed actions and sort by timestamp (newest first)
  // Also ensure current user's posts use their current avatar
  const combinedCircle = [...actionPosts, ...circle]
    .map(post => {
      // If this is the current user's post, ensure it uses their current avatar
      if (post.user === 'You' || post.user === user?.name || post.user === user?.email) {
        return { ...post, avatar: user?.avatar || post.avatar || '👤' };
      }
      return post;
    })
    .sort((a, b) => {
      // Get timestamps - handle different formats
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA; // Newest first
    })
    .slice(0, 20); // Limit to prevent too many items
  
  const posts: Post[] = feedView==='circle'?combinedCircle:follow;
  const openShare = useStore(s=>s.openShare);
  const react = useStore(s=>s.react);
  const addComment = useStore(s=>s.addComment);
  
  // State for engagement triggers
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(3); // Mock unread
  const [activeUsers, setActiveUsers] = React.useState(247); // Mock active users
  const scrollY = useSharedValue(0);
  const pulseAnimation = useSharedValue(0);
  const notificationBounce = useSharedValue(0);
  const liveIndicatorAnim = useSharedValue(0);
  
  // Simulate live activity updates
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => prev + Math.floor(Math.random() * 5) - 2);
      if (Math.random() > 0.7) {
        setUnreadCount(prev => prev + 1);
        notificationBounce.value = withSequence(
          withSpring(1.2),
          withSpring(1)
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);
  
  // Pulse animation for urgency
  useEffect(() => {
    pulseAnimation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    
    // Live indicator animation
    liveIndicatorAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.3, { duration: 600 })
      ),
      -1
    );
  }, []);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      setIsRefreshing(false);
      setUnreadCount(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1500);
  };

  const headerOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 100], [1, 0.95]),
  }));
  
  const notificationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: notificationBounce.value }],
  }));
  
  const liveIndicatorStyle = useAnimatedStyle(() => ({
    opacity: liveIndicatorAnim.value,
  }));
  
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseAnimation.value, [0, 1], [0.3, 0.6]),
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Background layers for visual separation */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1C1C1E', zIndex: -1 }]} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 100, backgroundColor: '#000000', zIndex: 0 }} />
      
      {/* Pinned Header with Tabs - iOS optimized */}
      <View style={[styles.pinnedHeader, { 
        top: insets.top,
        paddingTop: 10, // Add padding after safe area
      }]}>
        <View style={styles.headerContainer}>
          {/* Tabs centered with action button on right */}
          <View style={styles.tabsWrapper}>
            <LiquidGlassTabs
              activeTab={feedView}
              onTabChange={(tab) => {
                setFeedView(tab);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          </View>
          
          {/* Action button positioned absolutely on the right */}
          <Pressable 
            style={styles.headerActionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (feedView === 'circle') {
                setShowMembersModal(true);
              } else {
                setShowDiscoverModal(true);
              }
            }}
          >
            {feedView === 'circle' ? (
              <Users size={18} color="#FFD700" />
            ) : (
              <UserPlus size={18} color="#FFD700" />
            )}
          </Pressable>
        </View>
        
        {/* Circle Status */}
        {feedView === 'circle' && (
          circleId ? (
            // Show current circle name
            <View style={styles.circleStatus}>
              <Users size={14} color="#FFD700" />
              <Text style={styles.circleStatusText}>{circleName || 'Loading...'}</Text>
            </View>
          ) : (
            // Join Circle Prompt if no circle
            <Pressable 
              style={styles.joinCirclePrompt}
              onPress={() => setShowJoinCircleModal(true)}
            >
              <LinearGradient
                colors={['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.05)']}
                style={StyleSheet.absoluteFillObject}
              />
              <Users size={16} color="#FFD700" />
              <Text style={styles.joinCircleText}>Join a Circle to see posts</Text>
            </Pressable>
          )
        )}
      </View>
        
        {/* TESTING: Grey background for scroll area */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.scrollContent,
            { 
              paddingTop: insets.top + 90, // Safe area + header height + padding
              paddingBottom: insets.bottom + 120
            }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FFD700"
              colors={['#FFD700']}
            />
          }
          onScroll={(event) => {
            scrollY.value = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {/* Post Prompt Card - Enhanced with urgency */}
          <PostPromptCard
            onOpenComposer={(type, prompt) => {
              openShare({ 
                type, 
                visibility: feedView,
                promptSeed: prompt, // Pass the prompt as initial text
                text: '' // Initialize with empty text
              });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
          />

          
          {/* Premium Divider */}
          <NeonDivider 
            color="rgba(255, 215, 0, 0.1)"
            thickness={1}
            margin={20}
            animated={true}
          />

          {/* Feed Label with Live Count */}
          <View style={styles.feedHeader}>
            <Text style={styles.feedTitle}>
              {feedView === 'circle' ? 'YOUR CIRCLE' : 'FOLLOWING'}
            </Text>
            {posts.length > 0 && (
              <View style={styles.feedBadge}>
                <Text style={styles.feedBadgeText}>{posts.length} new</Text>
              </View>
            )}
          </View>
          
          {/* Animated Feed View - Enhanced */}
          <AnimatedFeedView feedKey={feedView}>
            <View style={styles.postsContainer}>
              {posts.length === 0 ? (
                <Animated.View 
                  entering={FadeIn.duration(600)}
                  style={styles.emptyState}
                >
                  <View style={styles.emptyIconContainer}>
                    <LinearGradient
                      colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
                      style={styles.emptyIconGradient}
                    />
                    <Users size={40} color="rgba(255, 255, 255, 0.3)" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    TESTING GREY BG - {feedView === 'circle' ? 'Your Circle is Quiet' : 'No Posts Yet'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {feedView === 'circle' 
                      ? 'Be the first to share your progress!' 
                      : 'Follow more people to see their journey'}
                  </Text>
                  <Animated.View style={[styles.emptyPulse, pulseStyle]} />
                </Animated.View>
              ) : (
                posts.map((p, index) => (
                  <Animated.View
                    key={p.id}
                    entering={FadeInDown.delay(50 * Math.min(index, 5)).springify()}
                  >
                    <FeedCard
                      post={p}
                      onReact={(emoji) => {
                        react(p.id, emoji, feedView);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      onComment={(content) => {
                        addComment(p.id, content, feedView);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      onProfileTap={() => {
                        console.log('View profile:', p.user);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    />
                  </Animated.View>
                ))
              )}
              
              {/* Load More Indicator */}
              {posts.length > 0 && (
                <Animated.View 
                  entering={FadeInDown.delay(300).springify()}
                  style={styles.loadMoreContainer}
                >
                  <Text style={styles.loadMoreText}>Pull to discover more</Text>
                  <Activity size={16} color="rgba(255, 255, 255, 0.3)" />
                </Animated.View>
              )}
            </View>
          </AnimatedFeedView>
        </ScrollView>

        <ShareComposer />
        
        {/* Modals */}
        <CircleMembersModal 
          visible={showMembersModal}
          onClose={() => setShowMembersModal(false)}
        />
        
        <JoinCircleModal
          visible={showJoinCircleModal}
          onClose={() => setShowJoinCircleModal(false)}
        />
        
        <DiscoverUsersModal
          visible={showDiscoverModal}
          onClose={() => setShowDiscoverModal(false)}
        />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E', // Changed to grey for testing
  },
  energyGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingOrb1: {
    position: 'absolute',
    top: 100,
    left: 50,
    width: 150,
    height: 150,
  },
  floatingOrb2: {
    position: 'absolute',
    top: 300,
    right: 30,
    width: 120,
    height: 120,
  },
  orb: {
    width: '100%',
    height: '100%',
    borderRadius: 100,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#FFD700',
    borderRadius: 1.5,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pinnedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#000000', // Solid black for header
    paddingBottom: 8,
  },
  headerContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  tabsWrapper: {
    width: '100%',
    paddingHorizontal: 60, // Leave space for the action button
  },
  headerActionButton: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -18 }],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -20 }],
    zIndex: 101,
  },
  membersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  joinCirclePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
    overflow: 'hidden',
  },
  joinCircleText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '500',
  },
  circleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
  },
  circleStatusText: {
    color: 'rgba(255,215,0,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  headerBlur: {
    paddingTop: 15, // Increased for better iOS spacing
    paddingBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerGlow: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 150,
    backgroundColor: '#FFD700',
    borderRadius: 100,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    width: width * 0.5,
    height: '100%',
  },
  liveHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  liveHeaderBlur: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  liveContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeUsersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4AE54A',
  },
  activeUsersText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  trendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingText: {
    fontSize: 12,
    color: '#4AE54A',
    fontWeight: '600',
  },
  notificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  notificationCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 100, // Space for header + tabs (will be adjusted dynamically)
    paddingHorizontal: 0,
    paddingBottom: 120,
  },
  socialProofBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  socialProofIcon: {
    marginRight: 4,
  },
  socialProofText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  socialProofHighlight: {
    color: '#FFD700',
    fontWeight: '700',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  socialProofStars: {
    flexDirection: 'row',
    gap: 2,
  },
  urgencyMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(96, 165, 250, 0.05)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  urgencyText: {
    fontSize: 12,
    color: '#60A5FA',
    fontWeight: '600',
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  feedTitleContainer: {
    position: 'relative',
  },
  feedTitleGlow: {
    position: 'absolute',
    top: -10,
    left: -20,
    right: -20,
    bottom: -10,
    backgroundColor: '#FFD700',
    borderRadius: 20,
  },
  feedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  feedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    overflow: 'hidden',
  },
  feedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFD700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(192,192,192,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    shadowColor: '#C0C0C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  tabActive: {
    borderColor: 'rgba(255,215,0,0.3)',
    backgroundColor: 'rgba(255,215,0,0.1)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
    fontSize: 15,
  },
  tabTextActive: {
    color: '#FFFFFF',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  shareCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  shareCardContent: {
    padding: 16,
    gap: 12,
  },
  shareTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontSize: 16,
  },
  promptSection: {
    marginVertical: 4,
  },
  postsContainer: {
    gap: 12,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    position: 'relative',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  emptyIconGradient: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyPulse: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFD700',
    top: -60,
    zIndex: -1,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.3)',
  },
});