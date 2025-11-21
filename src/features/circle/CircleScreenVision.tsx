import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import {
  Users,
  Trophy,
  Crown,
  Award,
  X,
  ChevronDown,
  Plus,
  Settings,
  Search,
  Heart,
  MessageCircle,
  Calendar,
  Target,
  Bell,
  Globe,
  Edit,
  LogOut,
  UserPlus,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useStore } from '../../state/rootStore';
import { supabaseService } from '../../services/supabase.service';
import { backendService } from '../../services/backend.service';
import { ProfileScreen } from '../profile/ProfileScreen';
import { JoinCircleModal } from '../social/JoinCircleModal';
import { ChallengeDetailModal } from '../challenges/ChallengeDetailModal';
import { CreateChallengeModal } from '../challenges/CreateChallengeModal';
import { CreateCircleModal } from '../social/CreateCircleModal';

type TabType = 'home' | 'challenges' | 'members' | 'leaderboard';
type ChallengeFilter = 'all' | 'active' | 'upcoming' | 'completed';
type MemberFilter = 'all' | 'admins' | 'mostActive';
type LeaderboardPeriod = 'today' | 'week' | 'month' | 'allTime';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  image_url?: string;
  profiles?: {
    username?: string;
    name?: string;
  };
}

export const CircleScreenVision = () => {
  const insets = useSafeAreaInsets();
  const {
    user,
    userCircles,
    activeCircleId,
    setActiveCircle,
    fetchUserCircles,
    circlesLoading,
    circleChallenges,
    fetchCircleChallenges,
    challengesLoading,
    posts,
    fetchPosts,
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [circleMembers, setCircleMembers] = useState<any[]>([]);
  const [membersWithStats, setMembersWithStats] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showJoinCircleModal, setShowJoinCircleModal] = useState(false);
  const [showCreateCircleModal, setShowCreateCircleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [challengeFilter, setChallengeFilter] = useState<ChallengeFilter>('all');
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('week');

  const [circlePosts, setCirclePosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    newPosts: true,
    challengeUpdates: true,
  });

  const currentRequestId = useRef<string | null>(null);

  const activeCircle = userCircles.find(c => c.id === activeCircleId);

  const calculateMemberStats = useCallback(async () => {
    try {
      const userIds = circleMembers.map(m => m.user_id);
      console.log('🔍 [LEADERBOARD] Circle members:', circleMembers.length, 'User IDs:', userIds);
      const bulkStats = await supabaseService.getBulkOverallCompletionStats(userIds);
      console.log('🔍 [LEADERBOARD] Bulk stats received:', Object.keys(bulkStats).length, bulkStats);

      const membersWithConsistency = circleMembers.map(member => {
        const stats = bulkStats[member.user_id] || { expected: 0, completed: 0, percentage: 0 };
        return {
          ...member,
          consistencyPercentage: stats.percentage,
          points: Math.round(stats.percentage * 10 + stats.completed * 5),
        };
      });

      console.log('🔍 [LEADERBOARD] Members with stats:', membersWithConsistency.length, membersWithConsistency.map(m => ({ name: m.profiles?.username || m.profiles?.name, points: m.points })));
      setMembersWithStats(membersWithConsistency);
    } catch (error) {
      console.error('Error calculating member stats:', error);
      const membersWithConsistency = circleMembers.map(member => ({
        ...member,
        consistencyPercentage: 0,
        points: 0,
      }));
      setMembersWithStats(membersWithConsistency);
    }
  }, [circleMembers]);

  const loadCircleData = useCallback(async () => {
    if (!activeCircleId) return;

    const requestId = `${activeCircleId}-${Date.now()}`;
    currentRequestId.current = requestId;

    setIsLoading(true);
    try {
      console.log('🔍 [CIRCLE] Loading circle members for:', activeCircleId);
      const response = await backendService.getCircleMembers(activeCircleId);
      console.log('🔍 [CIRCLE] Backend response:', response.success, 'Members count:', response.data?.length);

      if (currentRequestId.current === requestId) {
        if (response.success && response.data) {
          console.log('🔍 [CIRCLE] Setting circle members:', response.data.length, response.data.map(m => m.profiles?.username || m.profiles?.name));
          setCircleMembers(response.data);
        } else {
          setCircleMembers([]);
        }
        setIsLoading(false);
      }
    } catch (error) {
      if (currentRequestId.current === requestId) {
        console.error('[CircleScreenVision] Error loading members:', error);
        setCircleMembers([]);
        setIsLoading(false);
      }
    }
  }, [activeCircleId]);

  const loadCirclePosts = useCallback(async () => {
    if (!activeCircleId) return;

    setPostsLoading(true);
    try {
      const response = await backendService.getFeed('circle', 20, 0, activeCircleId);
      if (response.success && response.data) {
        setCirclePosts(response.data);
      }
    } catch (error) {
      console.error('[CircleScreenVision] Error loading posts:', error);
    } finally {
      setPostsLoading(false);
    }
  }, [activeCircleId]);

  useEffect(() => {
    fetchUserCircles();
  }, []);

  useEffect(() => {
    if (userCircles.length > 0 && !activeCircleId) {
      setActiveCircle(userCircles[0].id);
    }
  }, [userCircles, activeCircleId]);

  useEffect(() => {
    if (activeCircleId) {
      loadCircleData();
      fetchCircleChallenges(activeCircleId);
      loadCirclePosts();
    }
  }, [activeCircleId, loadCircleData, loadCirclePosts]);

  useEffect(() => {
    if (circleMembers && circleMembers.length > 0) {
      calculateMemberStats();
    }
  }, [circleMembers, calculateMemberStats]);

  const handleMemberPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUserId(userId);
  };

  const filteredChallenges = circleChallenges.filter(challenge => {
    if (challengeFilter === 'all') return true;
    if (challengeFilter === 'active') return challenge.status === 'active';
    if (challengeFilter === 'upcoming') return challenge.status === 'upcoming';
    if (challengeFilter === 'completed') return challenge.status === 'completed';
    return true;
  });

  const filteredMembers = membersWithStats.filter(member => {
    const displayName = member.profiles?.username || member.profiles?.name || 'Unknown User';

    if (memberSearch && !displayName.toLowerCase().includes(memberSearch.toLowerCase())) {
      return false;
    }

    if (memberFilter === 'all') return true;
    if (memberFilter === 'admins') return member.role === 'admin';
    if (memberFilter === 'mostActive') return (member.points || 0) > 500;
    return true;
  });

  const sortedLeaderboard = [...membersWithStats].sort((a, b) => b.points - a.points);

  if (!userCircles || userCircles.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyStateContainer}>
          <Users size={80} color="#E7B43A" />
          <Text style={styles.emptyStateTitle}>Join a Circle</Text>
          <Text style={styles.emptyStateSubtitle}>
            Connect with others and build consistency together
          </Text>
          <Pressable
            style={styles.emptyStateButton}
            onPress={() => setShowJoinCircleModal(true)}
          >
            <LinearGradient
              colors={['#E7B43A', '#FFD700']}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.emptyStateButtonText}>Join Circle</Text>
          </Pressable>
          <Pressable
            style={styles.emptyStateButtonSecondary}
            onPress={() => setShowCreateCircleModal(true)}
          >
            <Text style={styles.emptyStateButtonSecondaryText}>Create Circle</Text>
          </Pressable>
        </View>

        <JoinCircleModal
          visible={showJoinCircleModal}
          onClose={() => setShowJoinCircleModal(false)}
          onSuccess={async () => {
            setShowJoinCircleModal(false);
            await fetchUserCircles();
          }}
        />

        <CreateCircleModal
          visible={showCreateCircleModal}
          onClose={() => setShowCreateCircleModal(false)}
          onSuccess={async () => {
            setShowCreateCircleModal(false);
            await fetchUserCircles();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.stickyHeader}>
        <View style={styles.headerTop}>
          <View style={styles.circleTitle}>
            <View style={[styles.circleIconSmall, { backgroundColor: 'transparent' }]}>
              <LinearGradient
                colors={['#E7B43A', '#FFD700']}
                style={StyleSheet.absoluteFillObject}
              />
              <Text style={styles.circleIconSmallText}>{activeCircle?.emoji || '💪'}</Text>
            </View>
            <Text style={styles.circleName}>{activeCircle?.name || 'Circle'}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                console.log('Invite members - show invite code:', activeCircle?.invite_code || activeCircle?.join_code);
              }}
            >
              <UserPlus size={18} color="#E7B43A" />
            </Pressable>
            <Pressable
              style={styles.headerBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowSettings(true);
              }}
            >
              <Settings size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabNav}
          contentContainerStyle={styles.tabNavContent}
        >
          <Pressable
            style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('home');
            }}
          >
            <Text style={[styles.tabItemText, activeTab === 'home' && styles.tabItemTextActive]}>
              Home
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabItem, activeTab === 'challenges' && styles.tabItemActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('challenges');
            }}
          >
            <Text style={[styles.tabItemText, activeTab === 'challenges' && styles.tabItemTextActive]}>
              Challenges
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabItem, activeTab === 'members' && styles.tabItemActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('members');
            }}
          >
            <Text style={[styles.tabItemText, activeTab === 'members' && styles.tabItemTextActive]}>
              Members
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabItem, activeTab === 'leaderboard' && styles.tabItemActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('leaderboard');
            }}
          >
            <Text style={[styles.tabItemText, activeTab === 'leaderboard' && styles.tabItemTextActive]}>
              Leaderboard
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'home' && (
          <View style={styles.pageContent}>
            <LinearGradient
              colors={['rgba(231,180,58,0.05)', 'transparent']}
              style={styles.circleHeader}
            >
              <View style={[styles.circleIconLarge, { backgroundColor: 'transparent' }]}>
                <LinearGradient
                  colors={['#E7B43A', '#FFD700']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Text style={styles.circleIconLargeText}>{activeCircle?.emoji || '💪'}</Text>
              </View>
              <Text style={styles.circleDescription}>
                {activeCircle?.description || 'A community dedicated to growth and accountability'}
              </Text>
              <View style={styles.circleStats}>
                <View style={styles.circleStat}>
                  <Text style={styles.statValue}>{membersWithStats.length}</Text>
                  <Text style={styles.statLabel}>Members</Text>
                </View>
                <View style={styles.circleStat}>
                  <Text style={styles.statValue}>{circleChallenges.length}</Text>
                  <Text style={styles.statLabel}>Active Challenges</Text>
                </View>
                <View style={styles.circleStat}>
                  <Text style={styles.statValue}>{circlePosts.length}</Text>
                  <Text style={styles.statLabel}>Total Posts</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {postsLoading ? (
                <ActivityIndicator size="large" color="#E7B43A" style={{ marginVertical: 40 }} />
              ) : circlePosts.length === 0 ? (
                <View style={styles.emptyActivity}>
                  <MessageCircle size={48} color="rgba(231,180,58,0.3)" />
                  <Text style={styles.emptyActivityText}>No activity yet</Text>
                  <Text style={styles.emptyActivitySubtext}>Be the first to post!</Text>
                </View>
              ) : (
                circlePosts.slice(0, 3).map((post, index) => (
                  <Animated.View
                    key={post.id}
                    entering={FadeInDown.delay(index * 100).springify()}
                  >
                    <View style={styles.activityItem}>
                      <View style={styles.activityHeader}>
                        <View style={styles.activityAvatar}>
                          <Text style={styles.activityAvatarText}>
                            {(post.profiles?.username || post.profiles?.name || 'U').substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.activityUser}>
                          <Text style={styles.activityUserName}>
                            {post.profiles?.username || post.profiles?.name || 'User'}
                          </Text>
                          <Text style={styles.activityTime}>
                            {new Date(post.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.activityContent}>{post.content}</Text>
                      {post.image_url && (
                        <View style={[styles.activityImage, { backgroundColor: 'transparent' }]}>
                          <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={StyleSheet.absoluteFillObject}
                          />
                        </View>
                      )}
                      <View style={styles.activityActions}>
                        <View style={styles.activityAction}>
                          <Heart size={14} color="rgba(255,255,255,0.6)" />
                          <Text style={styles.activityActionText}>{post.likes_count || 0}</Text>
                        </View>
                        <View style={styles.activityAction}>
                          <MessageCircle size={14} color="rgba(255,255,255,0.6)" />
                          <Text style={styles.activityActionText}>{post.comments_count || 0}</Text>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                ))
              )}
            </View>

            {circleChallenges.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Active Challenges</Text>
                  <Pressable onPress={() => setActiveTab('challenges')}>
                    <Text style={styles.sectionLink}>View All →</Text>
                  </Pressable>
                </View>
                {circleChallenges.slice(0, 3).map((challenge, index) => (
                  <Animated.View
                    key={challenge.id}
                    entering={FadeInDown.delay(index * 100).springify()}
                  >
                    <Pressable
                      style={styles.challengeCardCompact}
                      onPress={() => setSelectedChallengeId(challenge.id)}
                    >
                      <View style={[styles.challengeIcon, { backgroundColor: 'transparent' }]}>
                        <LinearGradient
                          colors={['#4facfe', '#00f2fe']}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <Text style={styles.challengeIconText}>{challenge.emoji || '🎯'}</Text>
                      </View>
                      <View style={styles.challengeContent}>
                        <Text style={styles.challengeTitleCompact}>{challenge.name}</Text>
                        <Text style={styles.challengeMeta}>
                          {challenge.duration_days} days • {challenge.participant_count || 0} participants
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            )}

            {membersWithStats.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Members</Text>
                  <Pressable onPress={() => setActiveTab('members')}>
                    <Text style={styles.sectionLink}>View All ({membersWithStats.length}) →</Text>
                  </Pressable>
                </View>
                <View style={styles.membersGrid}>
                  {membersWithStats.slice(0, 8).map((member, index) => {
                    const displayName = member.profiles?.username || member.profiles?.name || 'Unknown';
                    const isAdmin = member.role === 'admin';
                    return (
                      <Pressable
                        key={member.user_id}
                        style={styles.memberGridItem}
                        onPress={() => handleMemberPress(member.user_id)}
                      >
                        <View style={styles.memberGridAvatar}>
                          <Text style={styles.memberGridAvatarText}>
                            {displayName.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.memberGridName} numberOfLines={1}>
                          {displayName.split(' ')[0]}
                        </Text>
                        <Text style={styles.memberGridRole}>
                          {isAdmin ? 'Admin' : 'Member'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {activeTab === 'challenges' && (
          <View style={styles.pageContent}>
            <View style={styles.section}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterPills}
                contentContainerStyle={styles.filterPillsContent}
              >
                <Pressable
                  style={[styles.filterPill, challengeFilter === 'all' && styles.filterPillActive]}
                  onPress={() => setChallengeFilter('all')}
                >
                  <Text style={[styles.filterPillText, challengeFilter === 'all' && styles.filterPillTextActive]}>
                    All
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterPill, challengeFilter === 'active' && styles.filterPillActive]}
                  onPress={() => setChallengeFilter('active')}
                >
                  <Text style={[styles.filterPillText, challengeFilter === 'active' && styles.filterPillTextActive]}>
                    Active
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterPill, challengeFilter === 'upcoming' && styles.filterPillActive]}
                  onPress={() => setChallengeFilter('upcoming')}
                >
                  <Text style={[styles.filterPillText, challengeFilter === 'upcoming' && styles.filterPillTextActive]}>
                    Upcoming
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterPill, challengeFilter === 'completed' && styles.filterPillActive]}
                  onPress={() => setChallengeFilter('completed')}
                >
                  <Text style={[styles.filterPillText, challengeFilter === 'completed' && styles.filterPillTextActive]}>
                    Completed
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Now</Text>
                <Text style={styles.sectionCount}>{filteredChallenges.length} challenges</Text>
              </View>
              {challengesLoading ? (
                <ActivityIndicator size="large" color="#E7B43A" style={{ marginVertical: 40 }} />
              ) : filteredChallenges.length === 0 ? (
                <View style={styles.emptyActivity}>
                  <Trophy size={48} color="rgba(231,180,58,0.3)" />
                  <Text style={styles.emptyActivityText}>No challenges found</Text>
                  <Pressable
                    style={styles.createChallengeButton}
                    onPress={() => setShowCreateChallenge(true)}
                  >
                    <LinearGradient
                      colors={['#E7B43A', '#FFD700']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Plus size={20} color="#000" />
                    <Text style={styles.btnText}>Create Challenge</Text>
                  </Pressable>
                </View>
              ) : (
                filteredChallenges.map((challenge, index) => (
                  <Animated.View
                    key={challenge.id}
                    entering={FadeInDown.delay(index * 100).springify()}
                  >
                    <Pressable
                      style={styles.challengeCard}
                      onPress={() => setSelectedChallengeId(challenge.id)}
                    >
                      <View style={[styles.challengeImage, { backgroundColor: 'transparent' }]}>
                        <LinearGradient
                          colors={['#667eea', '#764ba2']}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <View style={styles.challengeBadge}>
                          <Text style={styles.challengeBadgeText}>
                            🔥 {challenge.duration_days} days left
                          </Text>
                        </View>
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.9)']}
                          style={styles.challengeOverlay}
                        >
                          <Text style={styles.challengeTitle}>{challenge.name}</Text>
                          <Text style={styles.challengeCreator}>
                            Created by {challenge.created_by_name || 'Circle'}
                          </Text>
                        </LinearGradient>
                      </View>
                      <View style={styles.challengeInfo}>
                        <Text style={styles.challengeDescription}>
                          {challenge.description || 'No description provided'}
                        </Text>
                        <View style={styles.challengeStats}>
                          <View style={styles.statItem}>
                            <Users size={14} color="#E7B43A" />
                            <Text style={styles.statItemText}>
                              <Text style={styles.statItemValue}>{challenge.participant_count || 0}</Text> joined
                            </Text>
                          </View>
                          <View style={styles.statItem}>
                            <Trophy size={14} color="#E7B43A" />
                            <Text style={styles.statItemText}>
                              <Text style={styles.statItemValue}>500</Text> pts
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                ))
              )}
            </View>
          </View>
        )}

        {activeTab === 'members' && (
          <View style={styles.pageContent}>
            <View style={styles.section}>
              <View style={styles.searchContainer}>
                <Search size={16} color="rgba(255,255,255,0.4)" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchBar}
                  placeholder="Search members..."
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterPills}
                contentContainerStyle={styles.filterPillsContent}
              >
                <Pressable
                  style={[styles.filterPill, memberFilter === 'all' && styles.filterPillActive]}
                  onPress={() => setMemberFilter('all')}
                >
                  <Text style={[styles.filterPillText, memberFilter === 'all' && styles.filterPillTextActive]}>
                    All
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterPill, memberFilter === 'admins' && styles.filterPillActive]}
                  onPress={() => setMemberFilter('admins')}
                >
                  <Text style={[styles.filterPillText, memberFilter === 'admins' && styles.filterPillTextActive]}>
                    Admins
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterPill, memberFilter === 'mostActive' && styles.filterPillActive]}
                  onPress={() => setMemberFilter('mostActive')}
                >
                  <Text style={[styles.filterPillText, memberFilter === 'mostActive' && styles.filterPillTextActive]}>
                    Most Active
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Contributors</Text>
              {sortedLeaderboard.slice(0, 3).map((member, index) => {
                const displayName = member.profiles?.username || member.profiles?.name || 'User';
                const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                return (
                  <Pressable
                    key={member.user_id}
                    style={styles.leaderboardItem}
                    onPress={() => handleMemberPress(member.user_id)}
                  >
                    <View style={[styles.rankBadgeTop, { backgroundColor: 'transparent' }]}>
                      <LinearGradient
                        colors={index === 0 ? ['#FFD700', '#FFA500'] : ['rgba(231,180,58,0.3)', 'rgba(231,180,58,0.1)']}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Text style={styles.rankBadgeTopText}>{rankEmoji}</Text>
                    </View>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {displayName.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{displayName}</Text>
                      <Text style={styles.memberStats}>
                        {member.consistencyPercentage}% consistency
                      </Text>
                    </View>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsBadgeText}>{member.points} pts</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Members</Text>
                <Text style={styles.sectionCount}>{filteredMembers.length} total</Text>
              </View>
              {filteredMembers.map((member, index) => {
                const displayName = member.profiles?.username || member.profiles?.name || 'User';
                const isAdmin = member.role === 'admin';
                const isCurrentUser = member.user_id === user?.id;
                return (
                  <Pressable
                    key={member.user_id}
                    style={styles.memberItem}
                    onPress={() => handleMemberPress(member.user_id)}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {displayName.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {isAdmin && (
                          <View style={styles.memberRoleBadge}>
                            <Text style={styles.memberRoleBadgeText}>Admin</Text>
                          </View>
                        )}
                        <Text style={styles.memberName}>
                          {displayName} {isCurrentUser && '(You)'}
                        </Text>
                      </View>
                      <Text style={styles.memberStats}>
                        Joined {new Date(member.joined_at || member.created_at).toLocaleDateString()} • {member.points} points
                      </Text>
                    </View>
                    <Text style={styles.memberAction}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {activeTab === 'leaderboard' && (() => {
          console.log('🔍 [LEADERBOARD] Rendering leaderboard, sortedLeaderboard length:', sortedLeaderboard.length, sortedLeaderboard.map(m => ({ name: m.profiles?.username || m.profiles?.name, points: m.points })));
          return null;
        })()}
        {activeTab === 'leaderboard' && (
          <View style={styles.pageContent}>
            <View style={styles.section}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterPills}
                contentContainerStyle={styles.filterPillsContent}
              >
                <Pressable
                  style={[styles.filterPill, leaderboardPeriod === 'today' && styles.filterPillActive]}
                  onPress={() => setLeaderboardPeriod('today')}
                >
                  <Text style={[styles.filterPillText, leaderboardPeriod === 'today' && styles.filterPillTextActive]}>
                    Today
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterPill, leaderboardPeriod === 'week' && styles.filterPillActive]}
                  onPress={() => setLeaderboardPeriod('week')}
                >
                  <Text style={[styles.filterPillText, leaderboardPeriod === 'week' && styles.filterPillTextActive]}>
                    This Week
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterPill, leaderboardPeriod === 'month' && styles.filterPillActive]}
                  onPress={() => setLeaderboardPeriod('month')}
                >
                  <Text style={[styles.filterPillText, leaderboardPeriod === 'month' && styles.filterPillTextActive]}>
                    This Month
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.filterPill, leaderboardPeriod === 'allTime' && styles.filterPillActive]}
                  onPress={() => setLeaderboardPeriod('allTime')}
                >
                  <Text style={[styles.filterPillText, leaderboardPeriod === 'allTime' && styles.filterPillTextActive]}>
                    All Time
                  </Text>
                </Pressable>
              </ScrollView>
            </View>

            <LinearGradient
              colors={['rgba(231,180,58,0.03)', 'transparent']}
              style={styles.podiumSection}
            >
              <View style={styles.podium}>
                {sortedLeaderboard[1] && (
                  <Pressable
                    style={[styles.podiumPlace, styles.podiumSecond]}
                    onPress={() => handleMemberPress(sortedLeaderboard[1].user_id)}
                  >
                    <View style={styles.podiumAvatar}>
                      <Text style={styles.podiumAvatarText}>
                        {(sortedLeaderboard[1].profiles?.username || sortedLeaderboard[1].profiles?.name || 'U').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.podiumRank}>🥈</Text>
                    <Text style={styles.podiumName}>
                      {(sortedLeaderboard[1].profiles?.username || sortedLeaderboard[1].profiles?.name || 'User').split(' ')[0]}
                    </Text>
                    <Text style={styles.podiumPoints}>{sortedLeaderboard[1].points} pts</Text>
                  </Pressable>
                )}
                {sortedLeaderboard[0] && (
                  <Pressable
                    style={[styles.podiumPlace, styles.podiumFirst]}
                    onPress={() => handleMemberPress(sortedLeaderboard[0].user_id)}
                  >
                    <Text style={styles.crown}>👑</Text>
                    <View style={[styles.podiumAvatar, styles.podiumAvatarFirst]}>
                      <Text style={styles.podiumAvatarText}>
                        {(sortedLeaderboard[0].profiles?.username || sortedLeaderboard[0].profiles?.name || 'U').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.podiumRank}>🥇</Text>
                    <Text style={styles.podiumName}>
                      {(sortedLeaderboard[0].profiles?.username || sortedLeaderboard[0].profiles?.name || 'User').split(' ')[0]}
                    </Text>
                    <Text style={styles.podiumPoints}>{sortedLeaderboard[0].points} pts</Text>
                  </Pressable>
                )}
                {sortedLeaderboard[2] && (
                  <Pressable
                    style={[styles.podiumPlace, styles.podiumThird]}
                    onPress={() => handleMemberPress(sortedLeaderboard[2].user_id)}
                  >
                    <View style={styles.podiumAvatar}>
                      <Text style={styles.podiumAvatarText}>
                        {(sortedLeaderboard[2].profiles?.username || sortedLeaderboard[2].profiles?.name || 'U').substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.podiumRank}>🥉</Text>
                    <Text style={styles.podiumName}>
                      {(sortedLeaderboard[2].profiles?.username || sortedLeaderboard[2].profiles?.name || 'User').split(' ')[0]}
                    </Text>
                    <Text style={styles.podiumPoints}>{sortedLeaderboard[2].points} pts</Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    #{sortedLeaderboard.findIndex(m => m.user_id === user?.id) + 1}
                  </Text>
                  <Text style={styles.statLabel}>Your Rank</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>
                    {sortedLeaderboard.find(m => m.user_id === user?.id)?.points || 0}
                  </Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>+142</Text>
                  <Text style={styles.statLabel}>This Week</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Full Rankings</Text>
              {sortedLeaderboard.slice(3).map((member, index) => {
                const actualIndex = index + 4;
                const displayName = member.profiles?.username || member.profiles?.name || 'User';
                const isCurrentUser = member.user_id === user?.id;
                return (
                  <Pressable
                    key={member.user_id}
                    style={[styles.rankingItem, isCurrentUser && styles.rankingItemCurrent]}
                    onPress={() => handleMemberPress(member.user_id)}
                  >
                    <View style={styles.rankNumber}>
                      <Text style={styles.rankNumberText}>{actualIndex}</Text>
                    </View>
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {displayName.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {isCurrentUser ? `You (${displayName})` : displayName}
                      </Text>
                      <Text style={styles.memberStats}>
                        {member.consistencyPercentage}% consistency
                      </Text>
                    </View>
                    <Text style={styles.rankingPoints}>{member.points}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 30 }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowCreateChallenge(true);
        }}
      >
        <LinearGradient
          colors={['#E7B43A', '#FFD700']}
          style={StyleSheet.absoluteFillObject}
        />
        <Plus size={28} color="#000" />
      </Pressable>

      {selectedUserId && (
        <Modal
          visible={!!selectedUserId}
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
          transparent={Platform.OS === 'android'}
          onRequestClose={() => setSelectedUserId(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Pressable
              style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 50 : 20,
                left: 20,
                zIndex: 1000,
                padding: 10,
              }}
              onPress={() => setSelectedUserId(null)}
            >
              <X size={24} color="#FFFFFF" />
            </Pressable>
            <ProfileScreen userId={selectedUserId} isInModal={true} source="Circle" />
          </View>
        </Modal>
      )}

      <ChallengeDetailModal
        visible={!!selectedChallengeId}
        challengeId={selectedChallengeId}
        onClose={() => setSelectedChallengeId(null)}
      />

      <CreateChallengeModal
        visible={showCreateChallenge}
        onClose={() => setShowCreateChallenge(false)}
        circleId={activeCircleId || ''}
        circleName={activeCircle?.name || 'Circle'}
        onSuccess={() => {
          setShowCreateChallenge(false);
          if (activeCircleId) fetchCircleChallenges(activeCircleId);
        }}
      />

      <JoinCircleModal
        visible={showJoinCircleModal}
        onClose={() => setShowJoinCircleModal(false)}
        onSuccess={async () => {
          setShowJoinCircleModal(false);
          await fetchUserCircles();
        }}
      />

      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowSettings(false)}
          />
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙️ Settings</Text>
              <Pressable style={styles.modalClose} onPress={() => setShowSettings(false)}>
                <X size={20} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>General</Text>
                <Pressable style={styles.settingItem}>
                  <View style={styles.settingIcon}>
                    <Edit size={16} color="#E7B43A" />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Circle Name</Text>
                    <Text style={styles.settingDescription}>{activeCircle?.name}</Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </Pressable>
                <Pressable style={styles.settingItem}>
                  <View style={styles.settingIcon}>
                    <Globe size={16} color="#E7B43A" />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Privacy</Text>
                    <Text style={styles.settingValue}>
                      {activeCircle?.is_private ? 'Private' : 'Public'}
                    </Text>
                  </View>
                  <Text style={styles.settingArrow}>›</Text>
                </Pressable>
              </View>

              <View style={styles.settingsSection}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <Pressable style={styles.settingItem}>
                  <View style={styles.settingIcon}>
                    <Bell size={16} color="#E7B43A" />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>New posts</Text>
                    <Text style={styles.settingDescription}>Get notified when someone posts</Text>
                  </View>
                  <Pressable
                    style={[styles.toggleSwitch, notificationSettings.newPosts && styles.toggleSwitchActive]}
                    onPress={() => setNotificationSettings(prev => ({ ...prev, newPosts: !prev.newPosts }))}
                  >
                    <View style={[styles.toggleKnob, notificationSettings.newPosts && styles.toggleKnobActive]} />
                  </Pressable>
                </Pressable>
                <Pressable style={styles.settingItem}>
                  <View style={styles.settingIcon}>
                    <Target size={16} color="#E7B43A" />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Challenge updates</Text>
                    <Text style={styles.settingDescription}>New challenges and milestones</Text>
                  </View>
                  <Pressable
                    style={[styles.toggleSwitch, notificationSettings.challengeUpdates && styles.toggleSwitchActive]}
                    onPress={() => setNotificationSettings(prev => ({ ...prev, challengeUpdates: !prev.challengeUpdates }))}
                  >
                    <View style={[styles.toggleKnob, notificationSettings.challengeUpdates && styles.toggleKnobActive]} />
                  </Pressable>
                </Pressable>
              </View>

              <View style={styles.settingsSection}>
                <Pressable
                  style={[styles.btn, { marginBottom: 12 }]}
                  onPress={() => setShowSettings(false)}
                >
                  <LinearGradient
                    colors={['#E7B43A', '#FFD700']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Text style={styles.btnText}>Save Changes</Text>
                </Pressable>
                <Pressable
                  style={styles.btnDanger}
                  onPress={async () => {
                    if (activeCircleId) {
                      await backendService.leaveCircle(activeCircleId);
                      setShowSettings(false);
                      await fetchUserCircles();
                    }
                  }}
                >
                  <LogOut size={16} color="#ff4444" />
                  <Text style={styles.btnDangerText}>Leave Circle</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F12',
  },

  stickyHeader: {
    backgroundColor: 'rgba(0,0,0,0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },

  circleTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  circleIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  circleIconSmallText: {
    fontSize: 18,
  },

  circleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },

  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  headerBtn: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabNav: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  tabNavContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },

  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },

  tabItemActive: {
    backgroundColor: 'rgba(231,180,58,0.15)',
  },

  tabItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  tabItemTextActive: {
    color: '#E7B43A',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 100,
  },

  pageContent: {
    backgroundColor: '#0B0F12',
    borderRadius: 20,
    overflow: 'hidden',
  },

  circleHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },

  circleIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    overflow: 'hidden',
  },

  circleIconLargeText: {
    fontSize: 40,
  },

  circleDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 15,
    lineHeight: 19,
    textAlign: 'center',
  },

  circleStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },

  circleStat: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E7B43A',
  },

  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
  },

  section: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E7B43A',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  sectionLink: {
    fontSize: 12,
    color: '#E7B43A',
    fontWeight: '600',
  },

  sectionCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },

  btn: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },

  btnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },

  btnSecondary: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  btnDanger: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
  },

  btnDangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff4444',
  },

  challengeCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },

  challengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  challengeIconText: {
    fontSize: 24,
  },

  challengeContent: {
    flex: 1,
  },

  challengeTitleCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },

  challengeMeta: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },

  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  memberGridItem: {
    width: '22%',
    alignItems: 'center',
  },

  memberGridAvatar: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(231,180,58,0.3)',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#0B0F12',
  },

  memberGridAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E7B43A',
  },

  memberGridName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
    textAlign: 'center',
  },

  memberGridRole: {
    fontSize: 9,
    color: '#E7B43A',
    textAlign: 'center',
  },

  activityItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },

  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0B0F12',
    borderWidth: 2,
    borderColor: 'rgba(231,180,58,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activityAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E7B43A',
  },

  activityUser: {
    flex: 1,
  },

  activityUserName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },

  activityTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },

  activityContent: {
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },

  activityImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },

  activityActions: {
    flexDirection: 'row',
    gap: 15,
  },

  activityAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  activityActionText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },

  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 40,
  },

  emptyActivityText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },

  emptyActivitySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  },

  filterPills: {
    marginBottom: 15,
  },

  filterPillsContent: {
    gap: 8,
  },

  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  filterPillActive: {
    backgroundColor: 'rgba(231,180,58,0.15)',
    borderColor: 'rgba(231,180,58,0.3)',
  },

  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },

  filterPillTextActive: {
    color: '#E7B43A',
  },

  challengeCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
  },

  challengeImage: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },

  challengeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },

  challengeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E7B43A',
  },

  challengeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 40,
    paddingHorizontal: 15,
    paddingBottom: 12,
  },

  challengeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },

  challengeCreator: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },

  challengeInfo: {
    padding: 15,
  },

  challengeDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
    marginBottom: 12,
  },

  challengeStats: {
    flexDirection: 'row',
    gap: 15,
  },

  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  statItemText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },

  statItemValue: {
    color: '#E7B43A',
    fontWeight: '600',
  },

  searchContainer: {
    position: 'relative',
    marginBottom: 15,
  },

  searchBar: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 40,
    color: '#fff',
    fontSize: 14,
  },

  searchIcon: {
    position: 'absolute',
    left: 14,
    top: 14,
    zIndex: 2,
  },

  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },

  rankBadgeTop: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  rankBadgeTopText: {
    fontSize: 16,
  },

  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0B0F12',
    borderWidth: 2,
    borderColor: 'rgba(231,180,58,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  memberAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E7B43A',
  },

  memberInfo: {
    flex: 1,
  },

  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },

  memberStats: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
  },

  pointsBadge: {
    backgroundColor: 'rgba(231,180,58,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231,180,58,0.3)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  pointsBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E7B43A',
  },

  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },

  memberRoleBadge: {
    backgroundColor: 'rgba(231,180,58,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231,180,58,0.3)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },

  memberRoleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E7B43A',
    textTransform: 'uppercase',
  },

  memberAction: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.3)',
  },

  podiumSection: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },

  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 20,
  },

  podiumPlace: {
    flex: 1,
    alignItems: 'center',
  },

  podiumFirst: {
    order: 2,
  },

  podiumSecond: {
    order: 1,
  },

  podiumThird: {
    order: 3,
  },

  podiumAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'rgba(231,180,58,0.3)',
    overflow: 'hidden',
    backgroundColor: '#0B0F12',
    alignItems: 'center',
    justifyContent: 'center',
  },

  podiumAvatarFirst: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderColor: '#FFD700',
  },

  podiumAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#E7B43A',
  },

  crown: {
    fontSize: 24,
    marginBottom: 4,
  },

  podiumRank: {
    fontSize: 32,
    marginBottom: 5,
  },

  podiumName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },

  podiumPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E7B43A',
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },

  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
  },

  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E7B43A',
    marginBottom: 4,
  },

  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },

  rankingItemCurrent: {
    backgroundColor: 'rgba(231,180,58,0.08)',
    borderColor: 'rgba(231,180,58,0.3)',
  },

  rankNumber: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rankNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },

  rankingPoints: {
    fontSize: 16,
    fontWeight: '700',
    color: '#E7B43A',
  },

  fab: {
    position: 'absolute',
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#E7B43A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },

  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },

  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 20,
  },

  emptyStateSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
    textAlign: 'center',
    marginBottom: 30,
  },

  emptyStateButton: {
    height: 56,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },

  emptyStateButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },

  emptyStateButtonSecondary: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  emptyStateButtonSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },

  createChallengeButton: {
    marginTop: 24,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-start',
    padding: 20,
  },

  modalContent: {
    maxWidth: 420,
    width: '100%',
    marginTop: 20,
    borderRadius: 20,
    backgroundColor: '#0B0F12',
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },

  modalClose: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalBody: {
    padding: 20,
  },

  settingsSection: {
    marginBottom: 24,
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    gap: 12,
  },

  settingIcon: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(231,180,58,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(231,180,58,0.3)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  settingInfo: {
    flex: 1,
  },

  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 3,
  },

  settingDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },

  settingValue: {
    fontSize: 13,
    color: '#E7B43A',
    fontWeight: '600',
  },

  settingArrow: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.3)',
  },

  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    position: 'relative',
  },

  toggleSwitchActive: {
    backgroundColor: '#E7B43A',
  },

  toggleKnob: {
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    position: 'absolute',
    top: 2,
    left: 2,
  },

  toggleKnobActive: {
    left: 22,
  },
});
