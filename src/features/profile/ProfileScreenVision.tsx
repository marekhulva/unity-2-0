import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../state/rootStore';
import { supabaseService } from '../../services/supabase.service';
import { supabaseChallengeService } from '../../services/supabase.challenges.service';
import { LogOut, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Consistency Circle Component
const ConsistencyCircle = ({ percentage }: { percentage: number }) => {
  const rotation = (percentage / 100) * 360;

  return (
    <View style={styles.consistencyCircle}>
      <LinearGradient
        colors={['#E7B43A', 'rgba(231,180,58,0.3)']}
        style={[
          styles.consistencyProgress,
          { transform: [{ rotate: `${rotation}deg` }] }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.consistencyInner}>
        <Text style={styles.consistencyText}>{percentage}%</Text>
      </View>
    </View>
  );
};

// Activity Card Component (for What I'm Working On)
const ActivityCard = ({ item, type }: { item: any; type: 'challenge' | 'goal' | 'routine' }) => {
  const getIcon = () => {
    switch (type) {
      case 'challenge': return '🏆';
      case 'goal': return '🎯';
      case 'routine': return '🔁';
    }
  };

  const getGradient = () => {
    switch (type) {
      case 'challenge':
        return ['rgba(59, 130, 246, 0.2)', 'rgba(37, 99, 235, 0.2)'];
      case 'goal':
        return ['rgba(168, 85, 247, 0.2)', 'rgba(147, 51, 234, 0.2)'];
      case 'routine':
        return ['rgba(34, 197, 94, 0.2)', 'rgba(22, 163, 74, 0.2)'];
    }
  };

  return (
    <Pressable style={styles.activityCard}>
      <LinearGradient
        colors={getGradient()}
        style={styles.activityIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.activityIconText}>{getIcon()}</Text>
      </LinearGradient>

      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activitySubtitle}>
          {type.charAt(0).toUpperCase() + type.slice(1)} • {item.subtitle || 'In progress'}
        </Text>
      </View>

      <ConsistencyCircle percentage={item.consistency || 0} />
    </Pressable>
  );
};

// Circle Card Component (for My Circles section)
const CircleCard = ({ circle }: { circle: any }) => {
  const gradients = [
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
  ];

  const gradient = gradients[Math.floor(Math.random() * gradients.length)];

  return (
    <Pressable style={styles.circleCard}>
      <LinearGradient
        colors={gradient}
        style={styles.circleIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.circleIconText}>{circle.emoji || '🔵'}</Text>
      </LinearGradient>

      <View style={styles.circleInfo}>
        <Text style={styles.circleName}>{circle.name}</Text>
        <Text style={styles.circleMeta}>
          {circle.member_count || 0} members
          {circle.active_challenges ? ` • ${circle.active_challenges} active challenge${circle.active_challenges !== 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      <ChevronRight size={16} color="rgba(255,255,255,0.3)" />
    </Pressable>
  );
};

export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const currentUser = useStore(s => s.user);
  const goals = useStore(s => s.goals);
  const activeChallenges = useStore(s => s.activeChallenges);
  const fetchMyActiveChallenges = useStore(s => s.fetchMyActiveChallenges);
  const following = useStore(s => s.following);
  const followers = useStore(s => s.followers);
  const loadFollowing = useStore(s => s.loadFollowing);
  const logout = useStore(s => s.logout);

  const [circles, setCircles] = useState<any[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user circles, posts, and challenges
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch challenges from store
        await fetchMyActiveChallenges();
        if (__DEV__) console.log('[PROFILE-VISION] Active challenges loaded from store');

        // Fetch circles
        const userCircles = await supabaseService.getUserCircles();
        setCircles(userCircles || []);

        // Fetch posts (limited to 5 for timeline)
        if (currentUser?.id) {
          const posts = await supabaseService.getUserPosts(currentUser.id, 5);
          setUserPosts(posts || []);
        }

        // Load followers/following
        await loadFollowing();
      } catch (error) {
        if (__DEV__) console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser?.id]);

  // Separate goals by type and add subtitles
  const regularGoals = goals.filter(g => g.type === 'goal').map(goal => ({
    ...goal,
    subtitle: goal.metric || goal.deadline ?
      `${goal.metric || 'Goal'}${goal.deadline ? ` • ${new Date(goal.deadline).toLocaleDateString()}` : ''}` :
      'In progress'
  }));

  const routines = goals.filter(g => g.type === 'routine').map(routine => ({
    ...routine,
    subtitle: 'Daily routine'
  }));

  // Transform challenges to match ActivityCard interface
  const transformedChallenges = activeChallenges.map(challenge => ({
    id: challenge.id,
    title: challenge.name,
    subtitle: challenge.my_participation
      ? `Day ${challenge.my_participation.current_day}/${challenge.duration_days}`
      : `${challenge.duration_days} days`,
    consistency: challenge.my_participation?.completion_percentage || 0,
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E7B43A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={[styles.header, { paddingTop: insets.top + 30 }]}>
          {/* Avatar with Consistency Ring */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <LinearGradient
                colors={['#E7B43A', 'rgba(231,180,58,0.3)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={styles.avatarInner}>
                {currentUser?.avatar ? (
                  <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{currentUser?.name?.charAt(0) || 'U'}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Username */}
          <Text style={styles.username}>{currentUser?.name || 'User'}</Text>

          {/* Bio */}
          <Text style={styles.bio}>Currently mastering discipline & consistency</Text>

          {/* Social Stats */}
          <View style={styles.socialStats}>
            <View style={styles.socialStat}>
              <Text style={styles.socialNumber}>{followers.length}</Text>
              <Text style={styles.socialLabel}>Followers</Text>
            </View>
            <View style={styles.socialStat}>
              <Text style={styles.socialNumber}>{following.length}</Text>
              <Text style={styles.socialLabel}>Following</Text>
            </View>
            <View style={styles.socialStat}>
              <Text style={styles.socialNumber}>{circles.length}</Text>
              <Text style={styles.socialLabel}>Circles</Text>
            </View>
          </View>
        </View>

        {/* What I'm Working On */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>What I'm Working On</Text>

          {transformedChallenges.map(challenge => (
            <ActivityCard key={challenge.id} item={challenge} type="challenge" />
          ))}

          {regularGoals.map(goal => (
            <ActivityCard key={goal.id} item={goal} type="goal" />
          ))}

          {routines.map(routine => (
            <ActivityCard key={routine.id} item={routine} type="routine" />
          ))}

          {goals.length === 0 && (
            <Text style={styles.emptyText}>No active goals yet</Text>
          )}
        </View>

        {/* My Journey */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithSubtitle}>
            <Text style={styles.sectionHeader}>My Journey</Text>
            <Text style={styles.sectionSubtitle}>Last 5 posts • Past 7 days</Text>
          </View>

          {userPosts.length > 0 ? (
            <>
              <View style={styles.journeyTimeline}>
                {/* Timeline vertical line */}
                <LinearGradient
                  colors={['#E7B43A', 'rgba(231,180,58,0)']}
                  style={styles.timelineLine}
                />

                {userPosts.map((post, index) => {
                  const isFirstPost = index === 0;
                  const hasPhoto = post.media_url;

                  return (
                    <View key={post.id} style={styles.timelineEvent}>
                      {/* Timeline dot or milestone */}
                      <View style={isFirstPost ? styles.timelineMilestone : styles.timelineDot}>
                        {isFirstPost && <Text style={styles.milestoneIcon}>🏆</Text>}
                      </View>

                      {/* Post content */}
                      <View style={styles.timelineContent}>
                        {hasPhoto ? (
                          // Photo post
                          <View style={styles.timelinePhoto}>
                            <Image
                              source={{ uri: post.media_url }}
                              style={styles.photoImage}
                              resizeMode="cover"
                            />
                            <View style={styles.photoBadge}>
                              <Text style={styles.photoBadgeText}>Day {index + 1} 📸</Text>
                            </View>
                            <LinearGradient
                              colors={['transparent', 'rgba(0,0,0,0.85)']}
                              style={styles.photoOverlay}
                            >
                              <Text style={styles.photoDate}>
                                {new Date(post.created_at).toLocaleDateString()}
                              </Text>
                              <Text style={styles.photoTitle}>{post.action_title || post.content}</Text>
                              {post.goal_title && (
                                <View style={styles.photoMetrics}>
                                  <Text style={styles.metricText}>🎯 {post.goal_title}</Text>
                                </View>
                              )}
                            </LinearGradient>
                          </View>
                        ) : (
                          // Text-only post
                          <View style={styles.timelineText}>
                            <Text style={styles.timelineDate}>
                              {new Date(post.created_at).toLocaleDateString()}
                            </Text>
                            <Text style={styles.timelineTitle}>
                              {post.action_title || post.content || 'Post'}
                            </Text>
                            {post.content && post.action_title && (
                              <Text style={styles.timelineReflection}>{post.content}</Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              <Pressable style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>View Full Journey →</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.emptyText}>No posts yet</Text>
          )}
        </View>

        {/* My Circles */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>My Circles</Text>

          {circles.length > 0 ? (
            circles.map(circle => (
              <CircleCard key={circle.id} circle={circle} />
            ))
          ) : (
            <Text style={styles.emptyText}>Not part of any circles yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Logout Button */}
      <Pressable
        style={styles.logoutButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          logout();
        }}
      >
        <LogOut size={20} color="rgba(255, 255, 255, 0.6)" strokeWidth={2} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231,180,58,0.1)',
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    padding: 3,
    overflow: 'hidden',
  },
  avatarInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#E7B43A',
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  socialStats: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  socialStat: {
    alignItems: 'center',
  },
  socialNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  socialLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },

  // Sections
  section: {
    marginTop: 30,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E7B43A',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionHeaderWithSubtitle: {
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },

  // Activity Cards (What I'm Working On)
  activityCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconText: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },

  // Consistency Circle
  consistencyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  consistencyProgress: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  consistencyInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  consistencyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E7B43A',
  },

  // Timeline (My Journey)
  journeyTimeline: {
    position: 'relative',
    paddingLeft: 40,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 0,
    bottom: 0,
    width: 2,
  },
  timelineEvent: {
    position: 'relative',
    marginBottom: 20,
  },
  timelineDot: {
    position: 'absolute',
    left: -33,
    top: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E7B43A',
    shadowColor: '#E7B43A',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.6,
    zIndex: 2,
  },
  timelineMilestone: {
    position: 'absolute',
    left: -36,
    top: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E7B43A',
    shadowColor: '#E7B43A',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 16,
    shadowOpacity: 0.8,
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneIcon: {
    fontSize: 10,
  },
  timelineContent: {
    backgroundColor: 'rgba(231,180,58,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(231,180,58,0.2)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  timelinePhoto: {
    position: 'relative',
    height: 180,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(231,180,58,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#000',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  photoDate: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  photoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  photoMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metricText: {
    fontSize: 11,
    color: '#E7B43A',
  },
  timelineText: {
    padding: 12,
  },
  timelineDate: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  timelineReflection: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  viewAllButton: {
    backgroundColor: 'rgba(231,180,58,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231,180,58,0.3)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E7B43A',
  },

  // Circle Cards (My Circles)
  circleCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderLeftWidth: 3,
    borderLeftColor: '#E7B43A',
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  circleIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleIconText: {
    fontSize: 20,
  },
  circleInfo: {
    flex: 1,
  },
  circleName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  circleMeta: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },

  // Empty States
  emptyText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Logout Button
  logoutButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
