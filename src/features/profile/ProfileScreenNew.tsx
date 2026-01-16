import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useStore } from '../../state/rootStore';
import * as Haptics from 'expo-haptics';
import {
  LogOut, Check, X, Edit3, Camera, ChevronLeft, TrendingUp,
  Target, Zap, Award, Calendar
} from 'lucide-react-native';
import { supabaseService } from '../../services/supabase.service';
import * as ImagePicker from 'expo-image-picker';
import { UnifiedActivityCard } from '../social/UnifiedActivityCard';
import { ProgressTab } from './components/ProgressTab';
import { LuxuryTheme } from '../../design/luxuryTheme';

const { width } = Dimensions.get('window');

interface ProfileScreenProps {
  userId?: string;
  source?: string;
  navigation?: any;
  isInModal?: boolean;
}

export const ProfileScreenNew: React.FC<ProfileScreenProps> = ({
  userId,
  source = 'Circle',
  navigation: navProp,
  isInModal = false
}) => {
  const insets = useSafeAreaInsets();
  const navigation = navProp || useNavigation();
  const route = useRoute();

  const routeParams = route?.params as any;
  const actualUserId = routeParams?.userId || userId;
  const currentUser = useStore(s => s.user);
  const storeGoals = useStore(s => s.goals);
  const actions = useStore(s => s.actions);
  const completedActions = useStore(s => s.completedActions);
  const fetchDailyActions = useStore(s => s.fetchDailyActions);
  const logout = useStore(s => s.logout);
  const updateBio = useStore(s => s.updateBio);
  const updateAvatar = useStore(s => s.updateAvatar);
  const react = useStore(s => s.react);
  const addComment = useStore(s => s.addComment);

  const isOwnProfile = !actualUserId || actualUserId === currentUser?.id;
  const profileUserId = actualUserId || currentUser?.id;

  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'progress' | 'settings'>('overview');
  const [profileData, setProfileData] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>(isOwnProfile ? storeGoals : []);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [bio, setBio] = useState('Building my best self, one day at a time ✨');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!isOwnProfile);
  const [profileActions, setProfileActions] = useState<any[]>(isOwnProfile ? actions : []);
  const [profileCompletedActions, setProfileCompletedActions] = useState<any[]>(isOwnProfile ? completedActions : []);

  const [currentStreak, setCurrentStreak] = useState(0);
  const [perfectDays, setPerfectDays] = useState(0);
  const [goalsCompleted, setGoalsCompleted] = useState(0);
  const [goalCompletionStats, setGoalCompletionStats] = useState<Record<string, any>>({});

  const tabIndicatorPosition = useSharedValue(0);

  const fetchUserPosts = async (userId: string) => {
    setPostsLoading(true);
    try {
      const { supabaseService } = await import('../../services/supabase.service');
      const posts = await supabaseService.getUserPosts(userId, 20);
      setUserPosts(posts);
    } catch (error) {
      if (__DEV__) console.error('Error fetching posts:', error);
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (profileUserId) {
        fetchUserPosts(profileUserId);
      }
    }, [profileUserId])
  );

  useEffect(() => {
    const loadProfileData = async () => {
      if (!profileUserId) return;

      try {
        setIsLoading(true);
        const { supabase } = await import('../../services/supabase.service');

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('bio, avatar_url, name, email')
          .eq('id', profileUserId)
          .single();

        if (profile) {
          setProfileData(profile);
          setBio(profile.bio || 'Building my best self, one day at a time ✨');
          setProfileImage(profile.avatar_url || null);
        }

        if (!isOwnProfile) {
          const { data: userGoals } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', profileUserId)
            .in('visibility', ['public', 'circle']);

          setGoals(userGoals || []);

          const { data: userActions } = await supabase
            .from('actions')
            .select('*')
            .eq('user_id', profileUserId);

          setProfileActions(userActions || []);

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const completedToday = (userActions || []).filter(action => {
            if (action.completed_at) {
              const completedDate = new Date(action.completed_at);
              return completedDate >= today && completedDate < tomorrow;
            }
            return false;
          });

          setProfileCompletedActions(completedToday);
        }
      } catch (error) {
        if (__DEV__) console.log('Could not load profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOwnProfile) {
      const fetchOwnProfileData = async () => {
        try {
          const { supabase } = await import('../../services/supabase.service');

          const { data: profile } = await supabase
            .from('profiles')
            .select('bio, avatar_url, name, email')
            .eq('id', profileUserId)
            .single();

          if (profile) {
            setProfileData(profile);
            setBio(profile.bio || 'Building my best self, one day at a time ✨');
            setProfileImage(profile.avatar_url || null);
          }

          const { data: dbActions } = await supabase
            .from('actions')
            .select('*')
            .eq('user_id', profileUserId);

          if (dbActions) {
            setProfileActions(dbActions);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const completedToday = dbActions.filter(action => {
              if (action.completed_at) {
                const completedDate = new Date(action.completed_at);
                return completedDate >= today && completedDate < tomorrow;
              }
              return false;
            });

            setProfileCompletedActions(completedToday);
          }
        } catch (error) {
          if (__DEV__) console.error('Error fetching own profile data:', error);
          setProfileActions(actions);
          setProfileCompletedActions(completedActions);
        }
      };

      fetchOwnProfileData();
      fetchDailyActions();
    } else {
      loadProfileData();
    }
  }, [profileUserId, isOwnProfile, currentUser]);

  useEffect(() => {
    const calculateMilestones = async () => {
      if (!profileUserId) return;

      try {
        const { supabase } = await import('../../services/supabase.service');

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: userActions } = await supabase
          .from('actions')
          .select('*')
          .eq('user_id', profileUserId);

        if (userActions && userActions.length > 0) {
          for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);

            const dayCompleted = userActions.every(action => {
              if (!action.completed_at) return false;
              const completedDate = new Date(action.completed_at);
              return completedDate.getDate() === checkDate.getDate() &&
                     completedDate.getMonth() === checkDate.getMonth() &&
                     completedDate.getFullYear() === checkDate.getFullYear();
            });

            if (dayCompleted) {
              streak++;
            } else if (i > 0) {
              break;
            }
          }
        }
        setCurrentStreak(streak);

        let perfectDaysCount = 0;
        if (userActions && userActions.length > 0) {
          for (let i = 0; i < 30; i++) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - i);

            const allCompleted = userActions.every(action => {
              if (!action.completed_at) return false;
              const completedDate = new Date(action.completed_at);
              return completedDate.getDate() === checkDate.getDate() &&
                     completedDate.getMonth() === checkDate.getMonth() &&
                     completedDate.getFullYear() === checkDate.getFullYear();
            });

            if (allCompleted) perfectDaysCount++;
          }
        }
        setPerfectDays(perfectDaysCount);

        const { data: completedGoals } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', profileUserId)
          .eq('completed', true);

        setGoalsCompleted(completedGoals?.length || 0);
      } catch (error) {
        if (__DEV__) console.error('Error calculating milestones:', error);
      }
    };

    calculateMilestones();
  }, [profileUserId, profileActions]);

  useEffect(() => {
    if (isOwnProfile) {
      setProfileImage(currentUser?.avatar || null);
    }
  }, [currentUser?.avatar, isOwnProfile]);

  useEffect(() => {
    const fetchStats = async () => {
      if (profileUserId) {
        try {
          const stats = await supabaseService.getGoalCompletionStats(profileUserId);
          setGoalCompletionStats(stats);
        } catch (error) {
          if (__DEV__) console.error('Error fetching goal completion stats:', error);
        }
      }
    };
    fetchStats();
  }, [profileUserId]);

  const handleProfilePhoto = async () => {
    if (!isOwnProfile) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      let photoUrl = result.assets[0].uri;

      if (Platform.OS !== 'web' && result.assets[0].base64) {
        photoUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
      }

      setProfileImage(photoUrl);

      const success = await updateAvatar(photoUrl);
      if (!success) {
        Alert.alert('Error', 'Failed to update profile photo');
        setProfileImage(currentUser?.avatar || null);
      }
    }
  };

  const handleProfilePress = (userId: string) => {
    if (__DEV__) console.log('Profile pressed:', userId);
  };

  const animatedTabIndicator = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: withSpring(tabIndicatorPosition.value, { damping: 20, stiffness: 300 }) }],
    };
  });

  const switchTab = (tab: 'overview' | 'activity' | 'progress' | 'settings') => {
    setActiveTab(tab);
    const tabs = ['overview', 'activity', 'progress', 'settings'];
    const index = tabs.indexOf(tab);
    const tabWidth = (width - 40) / (isOwnProfile ? 4 : 3);
    tabIndicatorPosition.value = index * tabWidth;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={LuxuryTheme.gradientPresets.obsidianDepth}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Card */}
        <Animated.View entering={FadeInDown.duration(600).springify()} style={styles.headerCard}>
          <LinearGradient
            colors={['rgba(231,180,58,0.05)', 'rgba(0,0,0,0)']}
            style={StyleSheet.absoluteFillObject}
          />

          <Pressable onPress={handleProfilePhoto} disabled={!isOwnProfile} style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              <LinearGradient
                colors={['#E7B43A', '#F7E7CE', '#E7B43A']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </View>
            <View style={styles.avatar}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {(isOwnProfile ? currentUser?.name : profileData?.name)?.charAt(0) || 'U'}
                </Text>
              )}
            </View>
            {isOwnProfile && (
              <View style={styles.cameraButton}>
                <Camera size={14} color="#E7B43A" />
              </View>
            )}
          </Pressable>

          <Text style={styles.profileName}>
            {isOwnProfile ? (currentUser?.name || 'Achiever') : (profileData?.name || 'User')}
          </Text>

          {isEditingBio ? (
            <View style={styles.bioEditContainer}>
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                autoFocus
                multiline
                maxLength={60}
              />
              <View style={styles.bioButtons}>
                <Pressable
                  style={styles.bioButton}
                  onPress={async () => {
                    const success = await updateBio(bio);
                    if (success) {
                      setIsEditingBio(false);
                    } else {
                      Alert.alert('Error', 'Failed to save bio');
                    }
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <Check size={16} color="#E7B43A" />
                </Pressable>
                <Pressable
                  style={styles.bioButton}
                  onPress={() => {
                    setBio(profileData?.bio || 'Building my best self, one day at a time ✨');
                    setIsEditingBio(false);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <X size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => isOwnProfile && setIsEditingBio(true)}
              disabled={!isOwnProfile}
              style={styles.bioContainer}
            >
              <Text style={styles.bio}>{bio}</Text>
              {isOwnProfile && <Edit3 size={12} color="#888" style={{ marginLeft: 6 }} />}
            </Pressable>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Zap size={16} color="#E7B43A" />
              </View>
              <Text style={styles.statValue}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Target size={16} color="#E7B43A" />
              </View>
              <Text style={styles.statValue}>{goals.length}</Text>
              <Text style={styles.statLabel}>Active Goals</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Award size={16} color="#E7B43A" />
              </View>
              <Text style={styles.statValue}>{perfectDays}</Text>
              <Text style={styles.statLabel}>Perfect Days</Text>
            </View>
          </View>
        </Animated.View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {['overview', 'activity', 'progress', ...(isOwnProfile ? ['settings'] : [])].map((tab) => (
            <Pressable
              key={tab}
              style={styles.tabButton}
              onPress={() => switchTab(tab as any)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </Pressable>
          ))}
          <Animated.View style={[styles.tabIndicator, animatedTabIndicator]} />
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Today's Progress */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Calendar size={18} color="#E7B43A" />
                <Text style={styles.cardTitle}>Today's Progress</Text>
              </View>
              <Text style={styles.progressText}>
                {profileCompletedActions.length}/{profileActions.length} actions completed
              </Text>
              <View style={styles.progressBarContainer}>
                <LinearGradient
                  colors={['#E7B43A', '#F7E7CE']}
                  style={[styles.progressBar, {
                    width: profileActions.length > 0
                      ? `${(profileCompletedActions.length / profileActions.length) * 100}%`
                      : '0%'
                  }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
            </View>

            {/* Active Goals */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Target size={18} color="#E7B43A" />
                <Text style={styles.cardTitle}>Active Goals</Text>
              </View>
              {goals.length > 0 ? (
                goals.slice(0, 3).map((goal, index) => {
                  const goalStats = goalCompletionStats[goal.id] || {
                    expected: 0,
                    completed: 0,
                    percentage: 0
                  };

                  return (
                    <View key={goal.id} style={styles.goalItem}>
                      <View style={styles.goalInfo}>
                        <Text style={styles.goalName}>{goal.title}</Text>
                        <Text style={styles.goalProgress}>
                          {goalStats.completed}/{goalStats.expected} • {goalStats.percentage}%
                        </Text>
                      </View>
                      <View style={styles.goalBadge}>
                        <Text style={styles.goalPercentage}>{goalStats.percentage}%</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No active goals</Text>
              )}
            </View>

            {/* Recent Wins */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <TrendingUp size={18} color="#E7B43A" />
                <Text style={styles.cardTitle}>Recent Wins</Text>
              </View>
              {profileCompletedActions.length > 0 ? (
                profileCompletedActions.slice(0, 3).map((action, index) => (
                  <View key={action.id} style={styles.winItem}>
                    <View style={styles.winCheck}>
                      <Check size={12} color="#000" strokeWidth={3} />
                    </View>
                    <Text style={styles.winText}>{action.title}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>Complete actions to see wins!</Text>
              )}
            </View>
          </View>
        )}

        {activeTab === 'activity' && (
          <View style={styles.tabContent}>
            {postsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E7B43A" />
                <Text style={styles.loadingText}>Loading posts...</Text>
              </View>
            ) : userPosts.length > 0 ? (
              userPosts.map((post) => {
                const transformedPost = {
                  ...post,
                  actionTitle: post.action_title,
                  goalTitle: post.goal_title,
                  goalColor: post.goal_color,
                  mediaUrl: post.media_url,
                  audioUri: post.media_url && post.type === 'audio' ? post.media_url : undefined,
                  photoUri: post.media_url && post.type === 'photo' ? post.media_url : undefined,
                  username: profileData?.username || 'User',
                  displayName: profileData?.display_name || profileData?.username || 'User',
                  avatar: profileData?.avatar_emoji,
                  type: post.type === 'checkin' ? 'activity' : post.type,
                  reactions: post.reactions || [],
                  comments: post.comments || [],
                  created_at: post.created_at,
                };

                return (
                  <UnifiedActivityCard
                    key={post.id}
                    post={transformedPost}
                    onReact={(emoji) => {
                      const which = transformedPost.visibility || 'circle';
                      react(transformedPost.id, emoji, which);
                    }}
                    onComment={(text) => {
                      const which = transformedPost.visibility || 'circle';
                      addComment(transformedPost.id, text, which);
                    }}
                    onProfilePress={handleProfilePress}
                    feedView="profile"
                  />
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No Posts Yet</Text>
                <Text style={styles.emptyText}>
                  {isOwnProfile ? 'Share your achievements!' : 'This user hasn\'t posted yet'}
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'progress' && (
          <View style={styles.tabContent}>
            <ProgressTab />
          </View>
        )}

        {activeTab === 'settings' && isOwnProfile && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <LogOut size={18} color="#E7B43A" />
                <Text style={styles.cardTitle}>Account</Text>
              </View>
              <Pressable
                style={styles.settingsButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  logout();
                }}
              >
                <LogOut size={18} color="#FFFFFF" />
                <Text style={styles.settingsButtonText}>Logout</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Back Button */}
      {!isOwnProfile && !isInModal && (
        <Pressable
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <ChevronLeft size={24} color="#FFFFFF" strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LuxuryTheme.colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(231,180,58,0.1)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 3,
  },
  avatar: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    backgroundColor: LuxuryTheme.colors.background.secondary,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#E7B43A',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 2,
    borderColor: 'rgba(231,180,58,0.3)',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    maxWidth: '80%',
  },
  bioEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  bioInput: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(231,180,58,0.3)',
    paddingVertical: 4,
    minWidth: 200,
  },
  bioButtons: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 8,
  },
  bioButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(231,180,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    width: (width - 48) / 4,
    backgroundColor: 'rgba(231,180,58,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(231,180,58,0.3)',
    zIndex: 1,
  },
  tabContent: {
    gap: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  progressText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  goalProgress: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  goalBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(231,180,58,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231,180,58,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalPercentage: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E7B43A',
  },
  winItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  winCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E7B43A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winText: {
    fontSize: 13,
    color: '#FFFFFF',
    flex: 1,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
