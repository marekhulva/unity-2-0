import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  Pressable, 
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { 
  Plus,
  Heart,
  MessageCircle,
  Send,
  Users,
  UserPlus,
  Camera,
  Image as ImageIcon,
  Mic,
  Play,
  Pause,
  X,
  Sparkles,
  Crown,
  Award,
  Target,
  CheckCircle2
} from 'lucide-react-native';
import { useStore } from '../../state/rootStore';
import { Post, Visibility } from '../../state/slices/socialSlice';
import { getVisibilityLabel, getVisibilityIcon } from '../../utils/visibilityMapper';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';  // Using expo-av for now as expo-audio API might be different
import { FeedSkeleton } from '../../components/SkeletonLoader';
import { supabase } from '../../services/supabase.service';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

// Import existing modals and components  
import { CircleMembersModal } from './CircleMembersModal';
import { JoinCircleModal } from './JoinCircleModal';
import { DiscoverUsersModal } from './DiscoverUsersModal';
import { CircleViewContainer } from './CircleView/CircleViewContainer';
import { ChallengeCard } from '../challenges/ChallengeCard';
import { JoinChallengeModal } from '../challenges/JoinChallengeModal';
import { ChallengeDashboard } from '../challenges/ChallengeDashboard';
import { LuxuryPostCardPremium } from './LuxuryPostCardPremium';
import { UnifiedActivityCard } from './UnifiedActivityCard';
import { ProfileScreen } from '../profile/ProfileScreen';
import { CreateBballCircle } from '../admin/CreateBballCircle';
import { CelebrationCardMinimal } from './CelebrationCardMinimal';
import { KeyboardToolbar, useKeyboardToolbar } from '../../components/KeyboardToolbar';
// Removed ShareComposer - using inline composer instead

// Import CircleSelector for multiple circles support
import { CircleSelector } from '../circles/components/CircleSelector';
import { PrivacySelectionModal } from '../daily/PrivacySelectionModal';

const { width, height } = Dimensions.get('window');

export const SocialScreen = () => {
  if (__DEV__) {
    console.log('[COMPONENT RENDER] SocialScreen');
  }
  const insets = useSafeAreaInsets();
  
  // All the same state and hooks from original
  const feedView = useStore(s => s.feedView);
  const setFeedView = useStore(s => s.setFeedView);
  const circle = useStore(s => s.circleFeed);
  const follow = useStore(s => s.followFeed);
  const completedActions = useStore(s => s.completedActions);
  const user = useStore(s => s.user);
  const circleId = useStore(s => s.circleId);
  const circleName = useStore(s => s.circleName);
  const circleMembers = useStore(s => s.circleMembers);  // Added to fetch real circle members
  const loadCircleData = useStore(s => s.loadCircleData);
  // Challenge store connections
  const circleChallenges = useStore(s => s.circleChallenges);
  const fetchCircleChallenges = useStore(s => s.fetchCircleChallenges);
  const challengesLoading = useStore(s => s.challengesLoading);
  const loadChallenge = useStore(s => s.loadChallenge);
  const loadLeaderboard = useStore(s => s.loadLeaderboard);

  // Multiple circles support
  const userCircles = useStore(s => s.userCircles);
  const activeCircleId = useStore(s => s.activeCircleId);
  const setActiveCircle = useStore(s => s.setActiveCircle);
  const fetchUserCircles = useStore(s => s.fetchUserCircles);
  const circlesLoading = useStore(s => s.circlesLoading);
  const circlesError = useStore(s => s.circlesError);
  const joinCircle = useStore(s => s.joinCircle);
  const fetchDailyActions = useStore(s => s.fetchDailyActions);
  const fetchFeeds = useStore(s => s.fetchFeeds);
  const loadFollowing = useStore(s => s.loadFollowing);
  const react = useStore(s => s.react);
  const toggleLike = useStore(s => s.toggleLike);
  const addComment = useStore(s => s.addComment);
  const addPost = useStore(s => s.addPost);
  const clearCheckinPosts = useStore(s => s.clearCheckinPosts);
  const clearCompletedActions = useStore(s => s.clearCompletedActions);
  
  // Loading state - CRITICAL for proper UX
  const feedLoading = useStore(s => s.feedLoading);
  
  // Pagination hooks
  const loadMoreFeeds = useStore(s => s.loadMoreFeeds);
  const circleHasMore = useStore(s => s.circleHasMore);
  const followHasMore = useStore(s => s.followHasMore);
  const loadingMore = useStore(s => s.loadingMore);
  
  // Clear old check-in posts and completed actions on mount
  useEffect(() => {
    clearCheckinPosts();
    clearCompletedActions();
  }, []);
  
  // Modal states
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showJoinCircleModal, setShowJoinCircleModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showJoinChallengeModal, setShowJoinChallengeModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Circle view state - show tabbed interface when user is in a circle
  const [showCircleView, setShowCircleView] = useState(false);
  // Circle sub-tab state for the 3 tabs
  const [circleSubTab, setCircleSubTab] = useState<'feed' | 'members' | 'challenges'>('feed');
  
  // Inline composer state
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const scrollViewRef = useRef<any>(null);
  const [postText, setPostText] = useState('');
  const [postPhoto, setPostPhoto] = useState<string | null>(null);
  const [postAudio, setPostAudio] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [postVisibility, setPostVisibility] = useState<Visibility>(
    feedView === 'circle' ? 'circle' : 'followers'
  );
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [selectedPrivacySettings, setSelectedPrivacySettings] = useState<{
    visibility: 'private' | 'circle' | 'followers';
    isPrivate: boolean;
    isExplore: boolean;
    isNetwork: boolean;
    circleIds: string[];
  }>({
    visibility: 'circle',
    isPrivate: false,
    isExplore: false,
    isNetwork: false,
    circleIds: activeCircleId ? [activeCircleId] : [],
  });

  // Keyboard toolbar hook for Android/Web
  const { keyboardHeight, isKeyboardVisible, toolbarStyle } = useKeyboardToolbar();

  // Helper to get posting target text
  const getPostingTargetText = () => {
    if (selectedPrivacySettings.isPrivate) {
      return 'PRIVATE (ONLY YOU)';
    }
    if (selectedPrivacySettings.isExplore) {
      return 'EXPLORE (EVERYONE)';
    }
    if (selectedPrivacySettings.isNetwork) {
      return 'ALL FOLLOWERS';
    }
    if (selectedPrivacySettings.circleIds.length === 0) {
      return 'ALL CIRCLES';
    }
    if (selectedPrivacySettings.circleIds.length === 1) {
      const circle = userCircles.find(c => c.id === selectedPrivacySettings.circleIds[0]);
      return circle?.name?.toUpperCase() || 'SELECTED CIRCLE';
    }
    return `${selectedPrivacySettings.circleIds.length} CIRCLES`;
  };

  // Handle privacy selection from modal
  const handlePrivacySelect = (
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
    if (newVisibility) {
      setSelectedPrivacySettings({
        visibility,
        ...newVisibility,
      });
    }
    setShowPrivacyModal(false);
  };
  
  // Animation values
  const scrollY = useSharedValue(0);
  const fabScale = useSharedValue(1);
  
  // Load data on mount - properly check circle membership
  useEffect(() => {
    loadCircleData();
    fetchFeeds();
    loadFollowing();
    // Load all user's circles for the selector
    fetchUserCircles();
  }, []);

  // Handle circle selection changes
  useEffect(() => {
    if (activeCircleId !== undefined) {
      // Fetch feed for the selected circle (or all circles if null)
      fetchFeeds(false); // false = don't reset pagination
    }
  }, [activeCircleId]);

  // Set default sub-tab when switching to circle
  useEffect(() => {
    if (feedView === 'circle') {
      setCircleSubTab('feed');
    }
  }, [feedView]);
  
  // Update default visibility when tab changes
  useEffect(() => {
    setPostVisibility(feedView === 'circle' ? 'circle' : 'followers');
  }, [feedView]);
  
  // Fetch challenges when on challenges tab
  useEffect(() => {
    const loadChallengeData = async () => {
      if (feedView === 'circle' && circleSubTab === 'challenges' && circleId) {
        console.log('🏆 Auto-fetching challenges for circle:', circleId);
        await fetchCircleChallenges(circleId);
        
        // After challenges are loaded, load leaderboard and participation for each
        // We'll use a timeout to ensure the state has updated
        setTimeout(() => {
          const challenges = useStore.getState().circleChallenges;
          console.log('📊 Loading data for', challenges.length, 'challenges');
          challenges.forEach(challenge => {
            if (challenge.id) {
              // Load leaderboard and participation data for each challenge
              loadLeaderboard(challenge.id);
              loadChallenge(challenge.id);
            }
          });
        }, 100);
      }
    };
    
    loadChallengeData();
  }, [feedView, circleSubTab, circleId, fetchCircleChallenges, loadLeaderboard, loadChallenge]);
  
  // Don't create actionPosts anymore - completed actions are now saved to database and will appear in the feed
  // This prevents duplicates where the same completion appears twice (once from local state, once from database)
  
  const combinedCircle = [...circle]
    .map(post => {
      if (post.user === 'You' || post.user === user?.name || post.user === user?.email) {
        return { ...post, avatar: user?.avatar || post.avatar || '👤' };
      }
      return post;
    })
    .sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    })
    .slice(0, 20);
  
  const posts: Post[] = feedView === 'circle' ? combinedCircle : follow;
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFeeds(true); // true = refresh (reset pagination)
    setIsRefreshing(false);
  };
  
  const handleLoadMore = async () => {
    if (loadingMore) return;
    const type = feedView === 'circle' ? 'circle' : 'follow';
    await loadMoreFeeds(type);
  };
  
  // Animated header style
  const headerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.95],
      Extrapolate.CLAMP
    );
    
    return {
      opacity
    };
  });
  
  // Handle post submission
  const handlePost = async () => {
    console.log('🟦 [POST] Submit triggered');
    if (!postText.trim() && !postPhoto && !postAudio) {
      console.log('🟡 [POST] No content to post');
      return;
    }
    
    // Determine the post type based on media
    let postType = 'status';
    if (postPhoto) {
      postType = 'photo';
      console.log('🟦 [POST] Posting photo:', postPhoto?.substring(0, 100));
    } else if (postAudio) {
      postType = 'audio';
      console.log('🟦 [POST] Posting audio:', postAudio?.substring(0, 100));
    } else {
      console.log('🟦 [POST] Posting text status');
    }
    
    try {
      console.log('🟦 [POST] Calling addPost with:', {
        content: postText?.substring(0, 50),
        type: postType,
        visibility: selectedPrivacySettings.visibility,
        hasPhoto: !!postPhoto,
        hasAudio: !!postAudio,
        photoUri: postPhoto?.substring(0, 50),
        isPrivate: selectedPrivacySettings.isPrivate,
        isExplore: selectedPrivacySettings.isExplore,
        isNetwork: selectedPrivacySettings.isNetwork,
        circleIds: selectedPrivacySettings.circleIds,
      });

      await addPost({
        content: postText,
        type: postType,
        visibility: selectedPrivacySettings.visibility,
        photoUri: postPhoto,
        audioUri: postAudio,
        isPrivate: selectedPrivacySettings.isPrivate,
        isExplore: selectedPrivacySettings.isExplore,
        isNetwork: selectedPrivacySettings.isNetwork,
        circleIds: selectedPrivacySettings.circleIds,
      });
      
      console.log('🟢 [POST] Post submitted successfully');
      
      // Reset composer
      setPostText('');
      setPostPhoto(null);
      setPostAudio(null);
      setComposerExpanded(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Success);
    } catch (error) {
      console.error('🔴 [POST] Error submitting post:', error);
      console.error('🔴 [POST] Error stack:', error.stack);
      alert(`Failed to submit post: ${error.message}`);
    }
  };
  
  // Handle photo picker
  const pickImage = async () => {
    console.log('🟦 [PHOTO] pickImage triggered');
    console.log('🟦 [PHOTO] Platform:', Platform.OS);
    
    try {
      // Request permission
      console.log('🟦 [PHOTO] Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('🟢 [PHOTO] Permission status:', status);
      
      if (status !== 'granted') {
        console.log('🔴 [PHOTO] Permission denied');
        alert('Sorry, we need camera roll permissions to add photos!');
        return;
      }
      
      // Launch image picker with platform-specific options
      // CRITICAL iOS FIX: presentationStyle prevents crashes
      let pickerOptions: any = {
        allowsEditing: false,  // Disable editing to avoid iOS crashes
        quality: Platform.OS === 'ios' ? 0.3 : 0.8,  // Even lower quality on iOS to prevent memory crashes
        base64: false,  // Don't include base64 to avoid memory issues
        presentationStyle: 0,  // CRITICAL: Fixes iOS crash issue (fullScreen mode)
        allowsMultipleSelection: false,  // Explicitly set single selection
      };
      
      // Only add aspect ratio if editing is enabled
      if (pickerOptions.allowsEditing) {
        pickerOptions.aspect = [4, 3];
      }
      
      // Handle different expo-image-picker API versions
      try {
        if (ImagePicker.MediaTypeOptions && ImagePicker.MediaTypeOptions.Images) {
          pickerOptions.mediaTypes = ImagePicker.MediaTypeOptions.Images;
          console.log('🟦 [PHOTO] Using MediaTypeOptions.Images (old API)');
        } else if (ImagePicker.MediaType) {
          pickerOptions.mediaTypes = [ImagePicker.MediaType.images || 'images'];
          console.log('🟦 [PHOTO] Using MediaType array (new API)');
        } else {
          pickerOptions.mediaTypes = 'images';
          console.log('🟦 [PHOTO] Using string fallback');
        }
      } catch (e) {
        console.log('🟡 [PHOTO] Error detecting API version, using fallback:', e);
        pickerOptions.mediaTypes = 'images';
      }
      
      console.log('🟦 [PHOTO] Launching image picker with options:', pickerOptions);
      
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      
      console.log('🟢 [PHOTO] Picker result:', {
        canceled: result.canceled,
        assets: result.assets?.length || 0,
        firstAssetUri: result.assets?.[0]?.uri?.substring(0, 50) || 'none'
      });
      
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log('🟢 [PHOTO] Setting photo URI:', uri.substring(0, 50));
        setPostPhoto(uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        console.log('🟡 [PHOTO] User canceled or no asset returned');
      }
    } catch (error) {
      console.error('🔴 [PHOTO] Error in pickImage:', error);
      console.error('🔴 [PHOTO] Error stack:', error.stack);
      alert(`Failed to pick image: ${error.message}`);
    }
  };
  
  // Handle camera capture
  const takePhoto = async () => {
    console.log('🟦 [CAMERA] takePhoto triggered');
    console.log('🟦 [CAMERA] Platform:', Platform.OS);
    
    try {
      // Request permission
      console.log('🟦 [CAMERA] Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('🟢 [CAMERA] Permission status:', status);
      
      if (status !== 'granted') {
        console.log('🔴 [CAMERA] Permission denied');
        alert('Sorry, we need camera permissions to take photos!');
        return;
      }
      
      // Launch camera with platform-specific options
      const cameraOptions: any = {
        allowsEditing: false,  // Disable editing to avoid iOS crashes
        quality: Platform.OS === 'ios' ? 0.3 : 0.8,  // Even lower quality on iOS to prevent memory crashes
        base64: false,  // Don't include base64 to avoid memory issues
        presentationStyle: 0,  // CRITICAL: Fixes iOS crash issue (fullScreen mode)
        allowsMultipleSelection: false,  // Explicitly set single selection
      };
      
      // Only add aspect ratio if editing is enabled
      if (cameraOptions.allowsEditing) {
        cameraOptions.aspect = [4, 3];
      }
      
      console.log('🟦 [CAMERA] Launching camera with options:', cameraOptions);
      
      const result = await ImagePicker.launchCameraAsync(cameraOptions);
      
      console.log('🟢 [CAMERA] Camera result:', {
        canceled: result.canceled,
        assets: result.assets?.length || 0,
        firstAssetUri: result.assets?.[0]?.uri?.substring(0, 50) || 'none'
      });
      
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        console.log('🟢 [CAMERA] Setting photo URI:', uri.substring(0, 50));
        setPostPhoto(uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        console.log('🟡 [CAMERA] User canceled or no asset returned');
      }
    } catch (error) {
      console.error('🔴 [CAMERA] Error in takePhoto:', error);
      console.error('🔴 [CAMERA] Error stack:', error.stack);
      alert(`Failed to take photo: ${error.message}`);
    }
  };
  
  // Handle audio recording
  const toggleRecording = async () => {
    console.log('🟦 [AUDIO] toggleRecording triggered');
    console.log('🟦 [AUDIO] Platform:', Platform.OS);
    console.log('🟦 [AUDIO] Current state - isRecording:', isRecording, 'hasRecording:', !!recording);
    
    // Check if platform supports audio recording
    if (Platform.OS === 'web') {
      console.log('🟡 [AUDIO] Web platform detected - audio recording may have limited support');
      // Continue anyway for testing
    }
    
    try {
      if (isRecording && recording) {
        // Stop recording
        console.log('🟦 [AUDIO] Stopping recording...');
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('🟢 [AUDIO] Recording stopped, URI:', uri?.substring(0, 100));
        
        if (uri) {
          setPostAudio(uri);
          console.log('🟢 [AUDIO] Audio URI saved to state');
        } else {
          console.log('🔴 [AUDIO] No URI returned from recording');
        }
        
        setIsRecording(false);
        setRecording(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Success);
      } else {
        // Start recording
        console.log('🟦 [AUDIO] Requesting audio permissions...');
        const { status } = await Audio.requestPermissionsAsync();
        console.log('🟢 [AUDIO] Permission status:', status);
        
        if (status === 'granted') {
          console.log('🟦 [AUDIO] Setting up audio mode...');
          
          // Set audio mode for recording
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false
          });
          
          console.log('🟦 [AUDIO] Creating recording with HIGH_QUALITY preset...');
          
          try {
            const { recording: newRecording } = await Audio.Recording.createAsync(
              Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            
            console.log('🟢 [AUDIO] Recording created successfully');
            setRecording(newRecording);
            setIsRecording(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (recordError) {
            console.error('🔴 [AUDIO] Failed to create recording:', recordError);
            console.error('🔴 [AUDIO] Error details:', recordError.message);
            alert(`Failed to start recording: ${recordError.message}`);
          }
        } else {
          console.log('🔴 [AUDIO] Permission denied');
          alert('Microphone permission is required to record audio');
        }
      }
    } catch (error) {
      console.error('🔴 [AUDIO] Error in toggleRecording:', error);
      console.error('🔴 [AUDIO] Error stack:', error.stack);
      alert(`Audio recording error: ${error.message}`);
      
      // Reset state on error
      setIsRecording(false);
      setRecording(null);
    }
  };
  
  // Don't replace entire screen - we'll handle Circle View inline
  // Remove this conditional return entirely
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Luxury Header */}
        <Animated.View style={[styles.header, headerAnimatedStyle]}>
          <View style={styles.headerTop}>
            <Text style={styles.logoText}>UNITY</Text>

            {feedView === 'circle' && userCircles && userCircles.length > 0 && (
              <View style={styles.headerCircleSelector}>
                <CircleSelector
                  circles={userCircles}
                  activeCircleId={activeCircleId}
                  onCircleSelect={setActiveCircle}
                  onJoinCircle={() => setShowJoinCircleModal(true)}
                  loading={circlesLoading}
                  error={circlesError}
                  compact
                />
              </View>
            )}

            <View style={styles.headerActions}>
              {feedView === 'circle' ? (
                <Pressable
                  style={styles.headerButton}
                  onPress={() => setShowMembersModal(true)}
                >
                  <Users size={20} color="#FFD700" />
                </Pressable>
              ) : (
                <Pressable
                  style={styles.headerButton}
                  onPress={() => setShowDiscoverModal(true)}
                >
                  <UserPlus size={20} color="#FFD700" />
                </Pressable>
              )}
            </View>
          </View>
          
          {/* Minimal Tab Selector */}
          <View style={styles.tabRow}>
            <Pressable 
              onPress={() => {
                setFeedView('circle');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Reset to feed sub-tab when switching to Circle tab
                setCircleSubTab('feed');
              }}
              style={styles.tabButton}
            >
              <Text style={[
                styles.tabText,
                feedView === 'circle' && styles.tabTextActive
              ]}>
                CIRCLE
              </Text>
              {feedView === 'circle' && (
                <View style={styles.tabIndicator}>
                  <LinearGradient
                    colors={[
                      '#D4AF37',  // Antique gold highlight
                      '#C9A050',  // Rich gold
                      '#B8860B',  // Dark goldenrod
                      '#A0790A',  // Deep gold (no grey)
                      '#B8860B',  // Dark goldenrod again
                      '#C9A050',  // Rich gold again
                      '#D4AF37'   // Antique gold edge
                    ]}  // Pure gold tones only
                    locations={[0, 0.2, 0.35, 0.5, 0.65, 0.8, 1]}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                  />
                </View>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setFeedView('explore');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={styles.tabButton}
            >
              <Text style={[
                styles.tabText,
                feedView === 'explore' && styles.tabTextActive
              ]}>
                EXPLORE
              </Text>
              {feedView === 'explore' && (
                <View style={styles.tabIndicator}>
                  <LinearGradient
                    colors={[
                      '#D4AF37',  // Antique gold highlight
                      '#C9A050',  // Rich gold
                      '#B8860B',  // Dark goldenrod
                      '#A0790A',  // Deep gold (no grey)
                      '#B8860B',  // Dark goldenrod again
                      '#C9A050',  // Rich gold again
                      '#D4AF37'   // Antique gold edge
                    ]}  // Pure gold tones only
                    locations={[0, 0.2, 0.35, 0.5, 0.65, 0.8, 1]}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                  />
                </View>
              )}
            </Pressable>
          </View>

          {/* Circle Status Bar - Removed from here, moved to scrollable area */}
          {/* Gold gradient underline */}
          <View style={styles.headerUnderline}>
            <LinearGradient
              colors={[
                '#D4AF37',  // Antique gold highlight
                '#C9A050',  // Rich gold
                '#B8860B',  // Dark goldenrod
                '#A0790A',  // Deep gold (no grey)
                '#B8860B',  // Dark goldenrod again
                '#C9A050',  // Rich gold again
                '#D4AF37'   // Antique gold edge
              ]}
              locations={[0, 0.2, 0.35, 0.5, 0.65, 0.8, 1]}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
            />
          </View>
        </Animated.View>

        <View style={styles.scrollViewWrapper}>
          {/* Fallback gradient background - always shows */}
          <LinearGradient 
            colors={[
              'rgba(10, 10, 10, 1)',      // Very dark gray at top
              'rgba(5, 5, 5, 1)',         // Almost black in middle
              'rgba(0, 0, 0, 1)'          // Pure black at bottom
            ]}
            locations={[0, 0.3, 1]}
            style={styles.backgroundGradient}
            pointerEvents="none"
          />
          {/* Background texture image */}
          <Image 
            source={require('../../../assets/images/background-texture.jpg')}
            style={styles.backgroundTexture}
            resizeMode="stretch"
            pointerEvents="none"
            defaultSource={require('../../../assets/images/background-texture.jpg')}
          />
          {/* Darker overlay for better contrast */}
          <LinearGradient 
            colors={[
              'rgba(0, 0, 0, 0.15)',        // Subtle darkness at top
              'rgba(0, 0, 0, 0.2)',         // Slightly darker in middle
              'rgba(0, 0, 0, 0.15)'         // Subtle darkness at bottom
            ]}
            locations={[0, 0.5, 1]}
            style={styles.darkOverlay}
            pointerEvents="none"
          />
          
          <Animated.ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              scrollY.value = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#FFD700"
                progressBackgroundColor="#000000"
              />
            }
          >

          {/* REVERT POINT: Original CircleSelector was here (lines 776-788) */}
          {/* Moved CircleSelector inside composer - see below */}

          {/* Share Your Victory Component - Full Width, No Borders */}
          <View style={{
            marginTop: feedView === 'circle' ? 4 : 12,
            marginHorizontal: 0,
            marginBottom: 20,
            paddingHorizontal: 16,
            backgroundColor: 'transparent',
            position: 'relative',
            zIndex: 9999,
          }}>
              {!composerExpanded ? (
                // Collapsed state - WITH integrated circle selector
                <View style={{ position: 'relative', zIndex: 9999 }}>
                  <Pressable
                    style={[styles.composerCollapsed, {
                      marginBottom: 0,
                      paddingVertical: 12,
                      paddingRight: feedView === 'circle' ? 4 : 12,
                      backgroundColor: 'transparent',
                      zIndex: 9999,
                    }]}
                    onPress={() => {
                      setComposerExpanded(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Image
                        source={{ uri: user?.avatar || 'https://via.placeholder.com/32' }}
                        style={styles.composerAvatar}
                      />
                      <Text style={[styles.composerPlaceholder, { color: 'rgba(255,215,0,0.7)', flex: 1 }]}>
                        Share your victory...
                      </Text>
                    </View>

                    {/* Circle Selector moved to header */}

                    <View style={styles.composerIcons}>
                      <Camera size={18} color="rgba(255,215,0,0.8)" />
                      <ImageIcon size={18} color="rgba(255,215,0,0.8)" />
                      <Mic size={18} color="rgba(255,215,0,0.8)" />
                    </View>
                  </Pressable>
                </View>
              ) : (
                // Expanded state - WITH integrated circle selector
                <View style={[styles.composerExpanded, {
                  paddingBottom: 16,
                  backgroundColor: 'transparent',
                  zIndex: 9999,
                }]}>
                <View style={[styles.composerHeader, { zIndex: 9999 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Image
                      source={{ uri: user?.avatar || 'https://via.placeholder.com/40' }}
                      style={styles.composerAvatarLarge}
                    />
                    <Text style={[styles.composerName, { flex: 1 }]}>{user?.name || 'You'}</Text>
                  </View>

                  {/* Circle Selector moved to header */}

                  <Pressable
                    style={styles.composerClose}
                    onPress={() => setComposerExpanded(false)}
                  >
                    <X size={20} color="rgba(255,255,255,0.4)" />
                  </Pressable>
                </View>

                <View style={{ position: 'relative' }}>
                  {/* Faint grid texture - only visible on focus */}
                  {composerFocused && (
                    <View style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      opacity: 0.03,
                      pointerEvents: 'none',
                    }}>
                      <LinearGradient
                        colors={['rgba(255, 215, 0, 0.1)', 'transparent', 'rgba(255, 215, 0, 0.1)', 'transparent']}
                        style={{ flex: 1 }}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                    </View>
                  )}
                  <TextInput
                    style={[styles.composerInput, composerFocused && {
                      backgroundColor: 'rgba(255, 215, 0, 0.02)',
                    }]}
                    placeholder="Share your victory..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={postText}
                    onChangeText={setPostText}
                    onFocus={() => setComposerFocused(true)}
                    onBlur={() => setComposerFocused(false)}
                    multiline
                    autoFocus
                  />
                </View>

                {/* Target Circle Preview */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginTop: 8,
                  marginBottom: 4,
                  backgroundColor: 'rgba(255, 215, 0, 0.05)',
                  borderRadius: 8,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', letterSpacing: 1 }}>
                      POSTING TO
                    </Text>
                    <Text style={{ fontSize: 12, color: 'rgba(255, 215, 0, 0.9)', fontWeight: '600', letterSpacing: 0.5 }}>
                      {getPostingTargetText()}
                    </Text>
                  </View>
                    <Pressable
                      onPress={() => {
                        setShowPrivacyModal(true);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={{ fontSize: 11, color: 'rgba(255, 215, 0, 0.7)', fontWeight: '600', letterSpacing: 1 }}>
                        CHANGE
                      </Text>
                    </Pressable>
                  </View>

                {/* Three-Way Visibility Toggle */}
                <View style={styles.visibilitySection}>
                  <Pressable
                    style={styles.visibilityToggle}
                    onPress={() => {
                      // Cycle through: private → circle → followers → private
                      const nextVisibility =
                        postVisibility === 'private' ? 'circle' :
                        postVisibility === 'circle' ? 'followers' : 'private';
                      setPostVisibility(nextVisibility);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={styles.visibilityOption}>
                      <Text style={[
                        styles.visibilityText,
                        postVisibility === 'private' && { color: '#C0C0C0' },
                        postVisibility === 'followers' && { color: '#06FFA5' }
                      ]}>
                        {getVisibilityIcon(postVisibility)} {getVisibilityLabel(postVisibility)}
                      </Text>
                    </View>
                    <View style={[
                      styles.toggleSwitch,
                      postVisibility === 'private' && styles.toggleSwitchPrivate,
                      postVisibility === 'followers' && styles.toggleSwitchFollowers
                    ]}>
                      <View style={[
                        styles.toggleDot,
                        postVisibility === 'private' && styles.toggleDotLeft,
                        postVisibility === 'circle' && styles.toggleDotCenter,
                        postVisibility === 'followers' && styles.toggleDotRight
                      ]} />
                    </View>
                  </Pressable>
                  <Text style={styles.visibilityHint}>
                    {postVisibility === 'private'
                      ? 'Only you can see this'
                      : postVisibility === 'circle'
                      ? 'Visible to your close friends'
                      : 'Visible to all your followers'}
                  </Text>
                </View>

                {/* Media preview */}
                {postPhoto && (
                  <View style={styles.mediaPreview}>
                    <Image source={{ uri: postPhoto }} style={styles.previewImage} />
                    <Pressable
                      style={styles.removeMedia}
                      onPress={() => setPostPhoto(null)}
                    >
                      <X size={16} color="#000" />
                    </Pressable>
                  </View>
                )}

                {postAudio && (
                  <View style={styles.audioPreview}>
                    <Play size={20} color="#FFD700" />
                    <Text style={styles.audioText}>Audio recorded</Text>
                    <Pressable onPress={() => setPostAudio(null)}>
                      <X size={16} color="rgba(255,255,255,0.4)" />
                    </Pressable>
                  </View>
                )}

                <View style={styles.composerActions}>
                  <View style={styles.composerMediaButtons}>
                    <Pressable
                      style={styles.mediaButton}
                      onPress={() => {
                        console.log('🟦 [UI] Camera button pressed');
                        takePhoto();
                      }}
                    >
                      <Camera size={20} color="rgba(255,255,255,0.4)" />
                    </Pressable>
                    <Pressable
                      style={styles.mediaButton}
                      onPress={() => {
                        console.log('🟦 [UI] Gallery button pressed');
                        pickImage();
                      }}
                    >
                      <ImageIcon size={20} color="rgba(255,255,255,0.4)" />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.mediaButton,
                        isRecording && styles.mediaButtonActive
                      ]}
                      onPress={() => {
                        console.log('🟦 [UI] Mic button pressed - calling toggleRecording');
                        try {
                          toggleRecording();
                        } catch (e) {
                          console.error('🔴 [UI] Error calling toggleRecording:', e);
                        }
                      }}
                    >
                      <Mic
                        size={20}
                        color={isRecording ? "#FFD700" : "rgba(255,255,255,0.4)"}
                      />
                    </Pressable>
                  </View>
                  <Pressable
                    style={[
                      styles.postButton,
                      (!postText.trim() && !postPhoto && !postAudio) && styles.postButtonDisabled
                    ]}
                    onPress={handlePost}
                    disabled={!postText.trim() && !postPhoto && !postAudio}
                  >
                    <LinearGradient
                      colors={postText.trim() || postPhoto || postAudio
                        ? ['#FFD700', '#FFA500']
                        : ['rgba(255,215,0,0.3)', 'rgba(255,165,0,0.2)']
                      }
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                    <Send size={18} color="#000" />
                    <Text style={styles.postButtonText}>Post</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Circle Sub-tabs - HIDDEN FOR TESTING */}
          {/* {feedView === 'circle' && circleId && (
            <View style={styles.circleSubTabs}>
              <View style={styles.circleSubTabsRow}>
                <Pressable 
                  style={styles.circleSubTab}
                  onPress={() => setCircleSubTab('feed')}
                >
                  <Text style={[
                    styles.circleSubTabText,
                    circleSubTab === 'feed' && styles.circleSubTabTextActive
                  ]}>
                    FEED
                  </Text>
                  {circleSubTab === 'feed' && (
                    <View style={styles.circleSubTabIndicator}>
                      <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    </View>
                  )}
                </Pressable>
                
                <Pressable 
                  style={styles.circleSubTab}
                  onPress={() => {
                    setCircleSubTab('members');
                    // Load circle members when switching to members tab
                    loadCircleData();
                  }}
                >
                  <Text style={[
                    styles.circleSubTabText,
                    circleSubTab === 'members' && styles.circleSubTabTextActive
                  ]}>
                    {circleName ? (circleName.split(' ')[0].toUpperCase().slice(0, 8)) : 'CIRCLE'}
                  </Text>
                  {circleSubTab === 'members' && (
                    <View style={styles.circleSubTabIndicator}>
                      <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    </View>
                  )}
                </Pressable>
                
                <Pressable 
                  style={styles.circleSubTab}
                  onPress={async () => {
                    setCircleSubTab('challenges');
                    // Load challenges when switching to challenges tab
                    if (circleId) {
                      console.log('🏆 Loading challenges for circle:', circleId);
                      await fetchCircleChallenges(circleId);
                    } else {
                      console.log('⚠️ No circleId, user needs to join a circle first');
                    }
                  }}
                >
                  <Text style={[
                    styles.circleSubTabText,
                    circleSubTab === 'challenges' && styles.circleSubTabTextActive
                  ]}>
                    CHALLENGES
                  </Text>
                  {circleSubTab === 'challenges' && (
                    <View style={styles.circleSubTabIndicator}>
                      <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          )} */}
          
          {/* Circle Info Section removed per user request */}
          {/* Join Circle Card - Only show when user hasn't joined a circle */}
          {feedView === 'circle' && !circleId && !feedLoading && (
            <Pressable 
              style={styles.joinCard}
              onPress={() => setShowJoinCircleModal(true)}
            >
              <LinearGradient
                colors={['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.05)']}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.joinCardIcon}>
                <Users size={32} color="#FFD700" />
              </View>
              <Text style={styles.joinCardTitle}>Join Your Circle</Text>
              <Text style={styles.joinCardSubtitle}>
                Connect with your inner circle
              </Text>
            </Pressable>
          )}
          
          {/* Circle-specific content based on sub-tab */}
          {feedView === 'circle' && circleId && circleSubTab === 'members' && (
            <View style={styles.circleMembersContainer}>
              {circleMembers && circleMembers.length > 0 ? (
                <>
                  <Text style={styles.circleMembersTitle}>
                    {circleMembers.length} {circleMembers.length === 1 ? 'Member' : 'Members'}
                  </Text>
                  <View style={styles.membersGrid}>
                    {circleMembers.map((member, index) => (
                      <Animated.View
                        key={member.user_id || index}
                        entering={FadeInDown.delay(index * 100).springify()}
                        style={styles.memberCard}
                      >
                        <LinearGradient
                          colors={['rgba(255,215,0,0.05)', 'rgba(255,215,0,0.02)', 'transparent']}
                          style={StyleSheet.absoluteFillObject}
                        />
                        
                        {/* Profile Picture */}
                        <View style={styles.memberAvatarContainer}>
                          <LinearGradient
                            colors={['#FFD700', '#FFA500']}
                            style={styles.memberAvatarGradient}
                          >
                            {member.profiles?.avatar_url ? (
                              <Image 
                                source={{ uri: member.profiles.avatar_url }} 
                                style={styles.memberAvatar}
                              />
                            ) : (
                              <Text style={styles.memberAvatarText}>
                                {member.profiles?.name?.charAt(0) || '?'}
                              </Text>
                            )}
                          </LinearGradient>
                        </View>
                        
                        {/* Member Info */}
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>
                            {member.profiles?.name || member.profiles?.username || 'Anonymous'}
                          </Text>
                          <Text style={styles.memberUsername}>
                            @{member.profiles?.username || 'user'}
                          </Text>
                        </View>
                        
                        {/* Consistency Score */}
                        <View style={styles.memberScoreContainer}>
                          <LinearGradient
                            colors={['#FFD700', '#FFA500']}
                            style={styles.memberScoreGradient}
                          >
                            <Text style={styles.memberScoreLabel}>CONSISTENCY</Text>
                            <Text style={styles.memberScore}>
                              {Math.floor(Math.random() * 30) + 70}%
                            </Text>
                          </LinearGradient>
                        </View>
                        
                        {/* Role Badge */}
                        {member.role === 'admin' && (
                          <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>FOUNDER</Text>
                          </View>
                        )}
                      </Animated.View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.circleMembersTitle}>No Members Yet</Text>
                  <Text style={styles.circleMembersSubtitle}>
                    Be the first to invite friends to {circleName || 'your circle'}
                  </Text>
                </>
              )}
            </View>
          )}
          
          {feedView === 'circle' && circleId && circleSubTab === 'challenges' && (
            <ScrollView style={styles.circleChallengesContainer}>
              {challengesLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFD700" />
                </View>
              ) : circleChallenges.length > 0 ? (
                <View>
                  {circleChallenges.map((challenge, index) => {
                    // Check if user has joined this challenge
                    const participant = challenge.challenge_participants?.find(
                      p => p.user_id === user?.id
                    );
                    const isJoined = !!participant;
                    
                    // If joined, show the dashboard instead of the card
                    if (isJoined && participant) {
                      return (
                        <ChallengeDashboard
                          key={challenge.id}
                          challenge={challenge}
                          participantId={participant.id}
                        />
                      );
                    }
                    
                    // If not joined, show the join card
                    return (
                      <ChallengeCard
                        key={challenge.id}
                        challenge={challenge}
                        isJoined={false}
                        onJoin={() => {
                          setSelectedChallenge(challenge);
                          setShowJoinChallengeModal(true);
                        }}
                        onViewDetails={() => {
                          // Not used anymore since we show dashboard directly
                        }}
                        index={index}
                      />
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyChallenges}>
                  <Text style={styles.emptyChallengesIcon}>🏆</Text>
                  <Text style={styles.emptyChallengesTitle}>No Active Challenges</Text>
                  <Text style={styles.emptyChallengesSubtitle}>
                    New challenges will appear here when available
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
          
          {/* Posts - Show only for feed tabs (Following or Circle Feed sub-tab) */}
          {(feedView === 'follow' || (feedView === 'circle' && circleId && circleSubTab === 'feed')) && (
            feedLoading ? (
              <FeedSkeleton />
            ) : posts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Sparkles size={48} color="rgba(255,215,0,0.3)" />
                </View>
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptySubtitle}>
                  Be the first to share your victory
                </Text>
              </View>
            ) : (
              <View style={styles.postsContainer}>
                {posts.map((post, index) => {
                  // Check if this is a celebration post
                  const isCelebration = post.type === 'celebration' || post.is_celebration;
                  
                  if (isCelebration) {
                    // Extract goals from metadata
                    const goals = post.metadata?.goals || [];
                    
                    return (
                      <CelebrationCardMinimal
                        key={post.id}
                        userName={post.metadata?.userName || post.user}
                        userAvatar={post.metadata?.userAvatar || post.avatar}
                        timestamp={post.time}
                        goals={goals}
                      />
                    );
                  }
                  
                  // Check if this should use the premium card
                  // Note: All action check-ins are type 'checkin' or 'milestone', regardless of media
                  // Photos/audio are attached as mediaUrl/photoUri/audioUri fields
                  const isActivityCheckin = post.type === 'activity' || post.type === 'checkin' || post.type === 'milestone';

                  // Use UnifiedActivityCard for ALL activity check-ins (with or without media/comments)
                  if (isActivityCheckin) {
                    console.log('🎯 [CARD] Using UnifiedActivityCard for post:', post.id, 'type:', post.type);
                    return (
                      <UnifiedActivityCard
                        key={post.id}
                        post={post}
                        onReact={react}
                        onComment={addComment}
                        onProfilePress={(userId) => {
                          console.log('🟡 [SocialScreenV6] Profile pressed from UnifiedActivityCard');
                          console.log('🟡 [SocialScreenV6] userId received:', userId);
                          console.log('🟡 [SocialScreenV6] currentUser:', user?.id);
                          console.log('🟡 [SocialScreenV6] Setting selectedUserId to:', userId || user?.id);

                          // For own profile, use the user's id
                          const targetUserId = userId || user?.id;
                          if (targetUserId) {
                            setSelectedUserId(targetUserId);
                            console.log('🟡 [SocialScreenV6] Modal should now open with userId:', targetUserId);
                          } else {
                            console.log('🟡 [SocialScreenV6] ERROR: No userId available!');
                          }
                        }}
                        feedView={feedView}
                      />
                    );
                  }
                  
                  console.log('🎨 [CARD] Using LuxuryPostCard for post:', post.id, 'type:', post.type);
                  return (
                    <LuxuryPostCard
                      key={post.id}
                      post={post} 
                      onReact={react}
                      onToggleLike={toggleLike}
                      onComment={addComment}
                      onProfilePress={(userId) => {
                        console.log('🟡 [SocialScreenV6] Profile pressed from LuxuryPostCard');
                        console.log('🟡 [SocialScreenV6] userId received:', userId);
                        console.log('🟡 [SocialScreenV6] currentUser:', user?.id);
                        console.log('🟡 [SocialScreenV6] Setting selectedUserId to:', userId || user?.id);

                        // For own profile, use the user's id
                        const targetUserId = userId || user?.id;
                        if (targetUserId) {
                          setSelectedUserId(targetUserId);
                          console.log('🟡 [SocialScreenV6] Modal should now open with userId:', targetUserId);
                        } else {
                          console.log('🟡 [SocialScreenV6] ERROR: No userId available!');
                        }
                      }}
                      delay={index * 50}
                      feedView={feedView}
                    />
                  );
                })}
                
                {/* Load More Button */}
                {((feedView === 'circle' && circleHasMore) || 
                  (feedView === 'follow' && followHasMore)) && (
                  <Pressable 
                    style={styles.loadMoreButton}
                    onPress={handleLoadMore}
                    disabled={loadingMore}
                  >
                    <LinearGradient
                      colors={['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.05)']}
                      style={styles.loadMoreGradient}
                    >
                      {loadingMore ? (
                        <Text style={styles.loadMoreText}>Loading...</Text>
                      ) : (
                        <>
                          <Text style={styles.loadMoreText}>Load More</Text>
                          <Sparkles size={16} color="#FFD700" style={{ marginLeft: 8 }} />
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                )}
              </View>
            )
          )}

          {/* Explore Tab Content */}
          {feedView === 'explore' && (
            <View style={styles.exploreContainer}>
              <View style={styles.exploreHeader}>
                <View style={styles.exploreIcon}>
                  <Sparkles size={32} color="#FFD700" />
                </View>
                <Text style={styles.exploreTitle}>Discover & Explore</Text>
                <Text style={styles.exploreSubtitle}>
                  Public posts and trending content coming soon!
                </Text>
              </View>

              <View style={styles.exploreSection}>
                <Text style={styles.exploreSectionTitle}>🔥 Trending Challenges</Text>
                <View style={styles.explorePlaceholder}>
                  <Text style={styles.explorePlaceholderText}>
                    Popular challenges will appear here
                  </Text>
                </View>
              </View>

              <View style={styles.exploreSection}>
                <Text style={styles.exploreSectionTitle}>⭐ Success Stories</Text>
                <View style={styles.explorePlaceholder}>
                  <Text style={styles.explorePlaceholderText}>
                    Inspirational achievements from the community
                  </Text>
                </View>
              </View>

              <View style={styles.exploreSection}>
                <Text style={styles.exploreSectionTitle}>🌟 Discover Circles</Text>
                <View style={styles.explorePlaceholder}>
                  <Text style={styles.explorePlaceholderText}>
                    Find new circles to join
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Animated.ScrollView>
        </View>

      </SafeAreaView>

      {/* Keyboard Toolbar for iOS - attached to TextInput */}
      {Platform.OS === 'ios' && (
        <KeyboardToolbar
          nativeID="composer-toolbar"
          onCancel={() => {
            setComposerExpanded(false);
            setPostText('');
            setPostPhoto(null);
            setPostAudio(null);
          }}
          onSubmit={handlePost}
          submitText="Post"
          submitDisabled={!postText.trim() && !postPhoto && !postAudio}
        />
      )}

      {/* Keyboard Toolbar for Android/Web - positioned above keyboard */}
      {Platform.OS !== 'ios' && isKeyboardVisible && composerExpanded && (
        <View style={toolbarStyle}>
          <KeyboardToolbar
            onCancel={() => {
              setComposerExpanded(false);
              setPostText('');
              setPostPhoto(null);
              setPostAudio(null);
            }}
            onSubmit={handlePost}
            submitText="Post"
            submitDisabled={!postText.trim() && !postPhoto && !postAudio}
          />
        </View>
      )}

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

      <PrivacySelectionModal
        visible={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onSelect={handlePrivacySelect}
        actionTitle="Post"
      />

      {/* Profile View - Full Screen Overlay */}
      {selectedUserId && console.log('🔵 [SocialScreenV6] Modal should show for userId:', selectedUserId, 'currentUser:', user?.id, 'isOwnProfile:', selectedUserId === user?.id)}
      {selectedUserId && (
        <Modal
          visible={!!selectedUserId}
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
          transparent={Platform.OS === 'android'}
          onRequestClose={() => {
            console.log('🔵 [SocialScreenV6] Modal close requested');
            setSelectedUserId(null);
          }}
          onShow={() => {
            console.log('🔵 [SocialScreenV6] Modal is now visible with userId:', selectedUserId);
          }}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {/* Back button - ALWAYS show for modal, regardless of whose profile */}
            <Pressable
              style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 50 : 20,
                left: 20,
                zIndex: 1000,
                padding: 10,
              }}
              onPress={() => {
                console.log('🔵 [SocialScreenV6] X button pressed, closing modal');
                setSelectedUserId(null);
              }}
            >
              <X size={24} color="#FFFFFF" />
            </Pressable>
            <ProfileScreen userId={selectedUserId} isInModal={true} />
          </View>
        </Modal>
      )}
      
      {selectedChallenge && (
        <JoinChallengeModal
          visible={showJoinChallengeModal}
          challenge={selectedChallenge}
          onClose={() => {
            setShowJoinChallengeModal(false);
            setSelectedChallenge(null);
          }}
          onSuccess={async () => {
            console.log('🎯 [CHALLENGE] Join success callback triggered');
            
            // Small delay to ensure database has committed
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Refresh challenges after joining
            if (circleId) {
              console.log('🎯 [CHALLENGE] Refreshing circle challenges');
              await fetchCircleChallenges(circleId);
            }
            
            // IMPORTANT: Refresh Daily actions to include new challenge activities
            console.log('🎯 [CHALLENGE] Refreshing daily actions');
            await fetchDailyActions();
            console.log('🎯 [CHALLENGE] All refreshes complete');
          }}
        />
      )}
    </View>
  );
};

// Enhanced Luxury Post Card Component with Full Specifications
// Comment Input Component
const CommentInput: React.FC<{
  postId: string;
  onSubmit: (content: string) => void;
}> = ({ postId, onSubmit }) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };
  
  return (
    <View style={styles.commentInputContainer}>
      <TextInput
        style={[styles.commentInput, isFocused && styles.commentInputFocused]}
        placeholder="Add a supportive comment..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        value={text}
        onChangeText={setText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        multiline
        maxLength={200}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
      />
      <Pressable
        style={[styles.commentSendButton, text.trim() && styles.commentSendButtonActive]}
        onPress={handleSubmit}
        disabled={!text.trim()}
      >
        <Send 
          size={18} 
          color={text.trim() ? '#FFD700' : 'rgba(255,255,255,0.2)'} 
        />
      </Pressable>
    </View>
  );
};

const LuxuryPostCard: React.FC<{
  post: Post;
  onReact: (id: string, emoji: string, which: 'circle' | 'follow') => void;
  onToggleLike?: (postId: string, which: 'circle' | 'follow') => void;
  onComment: (postId: string, content: string, which: 'circle' | 'follow') => void;
  onProfilePress?: (userId: string) => void;
  delay: number;
  feedView: string;
}> = ({ post, onReact, onToggleLike, onComment, onProfilePress, delay, feedView }) => {
  if (__DEV__ && post.isChallenge) {
    console.log('[COMPONENT RENDER] LuxuryPostCard - Challenge Post', post.challengeName);
  }
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const scaleAnim = useSharedValue(1);
  
  const visibility: Visibility = feedView === 'circle' ? 'circle' : 'followers';  // Instagram-style
  
  // Debug logging
  if (post.mediaUrl) {
    console.log('Post has mediaUrl:', post.mediaUrl);
  }
  
  // Check for photo and audio
  const hasPhoto = !!post.photoUri;
  const hasAudio = !!post.audioUri;
  
  console.log('Post detection - hasPhoto:', hasPhoto, 'photoUri:', post.photoUri, 'hasAudio:', hasAudio, 'audioUri:', post.audioUri);
  
  // Handle audio playback
  const toggleAudio = async () => {
    if (hasAudio && post.audioUri) {
      if (isPlaying && sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: post.audioUri },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);
      }
    }
  };
  
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);
  
  const handleLike = () => {
    scaleAnim.value = withSpring(0.95, {}, () => {
      scaleAnim.value = withSpring(1);
    });
    if (onToggleLike) {
      onToggleLike(post.id, visibility);
    }
  };
  
  const handleReact = () => {
    scaleAnim.value = withSpring(0.95, {}, () => {
      scaleAnim.value = withSpring(1);
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReact(post.id, '🔥', feedView as 'circle' | 'follow');
  };
  
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }]
  }));
  
  const getPostTypeLabel = () => {
    switch(post.type) {
      case 'checkin':
        return 'ACTIVITY';
      case 'milestone':
        return 'MILESTONE';
      case 'progress':
        return 'PROGRESS';
      case 'audio':
        return 'AUDIO INSIGHT';
      default:
        return 'UPDATE';
    }
  };
  
  const formatTime = (timestamp: string) => {
    const now = new Date();
    const postDate = new Date(timestamp);
    const diff = now.getTime() - postDate.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  // Determine if this is a challenge post
  const isChallenge = post.isChallenge || false;
  
  // Colors based on challenge status
  const primaryColor = isChallenge ? '#C0C0C0' : '#FFD700'; // Silver vs Gold
  const secondaryColor = isChallenge ? '#808080' : '#FFA500'; // Dark silver vs Orange gold
  
  return (
    <Animated.View 
      entering={FadeIn.delay(delay).duration(600)}
      style={animatedCardStyle}
    >
      <Pressable
        style={[styles.postCard, isHovered && styles.postCardHover]}
        onHoverIn={() => Platform.OS === 'web' && setIsHovered(true)}
        onHoverOut={() => Platform.OS === 'web' && setIsHovered(false)}
        onPress={() => {
          console.log('🟢 [LuxuryPostCard] Card clicked anywhere');
        }}
      >
        {/* Base gradient background */}
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(15,15,15,0.95)']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        {/* 1. POST HEADER SECTION */}
        <View style={styles.postHeader}>
          {/* Left side - Author info */}
          <Pressable
            style={styles.postAuthorSection}
            onPress={() => {
              const userId = post.userId || post.user_id || post.user;
              console.log('🔴 [LuxuryPostCard] Profile click - postData:', {
                userId: post.userId,
                user_id: post.user_id,
                user: post.user,
                actualUserId: userId
              });
              console.log('🔴 [LuxuryPostCard] Calling onProfilePress with:', userId);
              if (onProfilePress) {
                console.log('🔴 [LuxuryPostCard] onProfilePress exists, calling it');
                onProfilePress(userId);
              } else {
                console.log('🔴 [LuxuryPostCard] onProfilePress is undefined!');
              }
            }}
          >
            <View style={styles.postAvatarContainer}>
              {/* Avatar with gold/silver gradient background */}
              <LinearGradient
                colors={isChallenge 
                  ? ['rgba(192,192,192,0.2)', 'rgba(0,0,0,0.9)'] // Silver for challenge
                  : ['rgba(255,215,0,0.2)', 'rgba(0,0,0,0.9)']   // Gold for regular
                }
                style={styles.postAvatarGradient}
              >
                {post.avatar?.startsWith('http') || post.avatar?.startsWith('data:') ? (
                  <Image source={{ uri: post.avatar }} style={styles.postAvatarImage} />
                ) : (
                  <Text style={styles.postAvatarEmoji}>{post.avatar || post.user?.charAt(0) || '👤'}</Text>
                )}
              </LinearGradient>
            </View>
            
            <View style={styles.postAuthorDetails}>
              <Text style={styles.postAuthorName}>{post.user}</Text>
              <Text style={styles.postTime}>{formatTime(post.timestamp || post.created_at || new Date().toISOString())}</Text>
            </View>
          </Pressable>
          
          {/* Right side - Challenge badge or Post type badge */}
          {isChallenge && post.challengeName ? (
            <View style={[styles.postTypeBadge, { borderColor: 'rgba(192,192,192,0.3)' }]}>
              <LinearGradient
                colors={['rgba(192,192,192,0.1)', 'rgba(192,192,192,0.05)']} // Silver gradient
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={[styles.postTypeBadgeText, { color: '#C0C0C0' }]}>
                🏆 {post.challengeName}
              </Text>
            </View>
          ) : (
            <View style={styles.postTypeBadge}>
              <LinearGradient
                colors={['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.05)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.postTypeBadgeText}>{getPostTypeLabel()}</Text>
            </View>
          )}
        </View>
        
        {/* 2. POST CONTENT SECTION */}
        <View style={styles.postContent}>
          {/* Text Caption - Skip for activity/checkin posts */}
          {post.content && post.type !== 'activity' && post.type !== 'checkin' && (
            <Text style={styles.postCaption}>{post.content}</Text>
          )}
          
          {/* ACTIVITY POST (Check-in) - Luxury minimal design */}
          {(post.type === 'activity' || post.type === 'checkin') && post.actionTitle && (
            <BlurView intensity={30} tint="dark" style={styles.activityCard}>
              {/* Ultra subtle gradient overlay */}
              <LinearGradient
                colors={[
                  'rgba(255,255,255,0.01)',  // Almost invisible white
                  'transparent',
                  'rgba(0,0,0,0.2)'          // Soft shadow at bottom
                ]}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
              {/* Subtle accent line at top */}
              <View style={styles.luxuryAccentLine}>
                <LinearGradient
                  colors={isChallenge 
                    ? ['transparent', 'rgba(192,192,192,0.2)', 'transparent']
                    : ['transparent', 'rgba(255,215,0,0.15)', 'transparent']
                  }
                  style={{ height: 1, width: '100%' }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              
              {/* Icon Section with badges */}
              <View style={styles.activityIconSection}>
                <View style={styles.activityMainIcon}>
                  <LinearGradient
                    colors={isChallenge 
                      ? ['rgba(192,192,192,0.1)', 'rgba(128,128,128,0.05)']  // Subtle silver
                      : ['rgba(255,215,0,0.08)', 'rgba(255,215,0,0.03)']     // Subtle gold
                    }
                    style={styles.activityIconGradient}
                  >
                    <Text style={[styles.activityIconEmoji, { fontSize: 16, opacity: 0.5 }]}>
                      {post.actionEmoji || '✓'}
                    </Text>
                  </LinearGradient>
                </View>
                
                {/* Subtle completion indicator */}
                <View style={styles.activityCheckmark}>
                  <View style={styles.completionIndicator}>
                    <View style={styles.completionDot} />
                  </View>
                </View>
                
                {/* Streak badge if exists */}
                {post.streak && post.streak > 0 && (
                  <View style={styles.activityStreakBadge}>
                    <Text style={styles.streakBadgeText}>{post.streak}</Text>
                  </View>
                )}
              </View>
              
              {/* Activity Details */}
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>{post.actionTitle}</Text>
                <View style={styles.activityStats}>
                  {post.actionStats?.map((stat, idx) => (
                    <View key={idx} style={styles.activityStatItem}>
                      <Text style={styles.activityStatText}>
                        {stat.icon} {stat.text}
                      </Text>
                    </View>
                  )) || (
                    <>
                      {post.actionTime && (
                        <Text style={styles.activityStatText}>⏱ {post.actionTime}</Text>
                      )}
                      {post.goal && (
                        <Text style={styles.activityStatText}>🎯 {post.goal}</Text>
                      )}
                      {/* Challenge progress indicator */}
                      {isChallenge && post.challengeProgress && (
                        <Text style={[styles.activityStatText, { color: primaryColor }]}>
                          📊 {post.challengeProgress}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
              
              {/* Points */}
              <View style={styles.activityPoints}>
                <Text style={styles.activityPointsText}>
                  +{post.points || 5}
                </Text>
              </View>
            </BlurView>
          )}
          
          {/* TYPE A: MILESTONE POST */}
          {post.type === 'milestone' && post.actionTitle && (
            <View style={styles.achievementCard}>
              <LinearGradient
                colors={['rgba(255,215,0,0.08)', 'rgba(255,215,0,0.02)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              
              <View style={styles.achievementContent}>
                {/* Left side - Achievement details */}
                <View style={styles.achievementLeft}>
                  <View style={styles.achievementIcon}>
                    <LinearGradient
                      colors={['#ffd700', '#ffaa00']}
                      style={styles.achievementIconGradient}
                    >
                      <Text style={styles.achievementEmoji}>{post.actionEmoji || '🏆'}</Text>
                    </LinearGradient>
                  </View>
                  
                  <View style={styles.achievementText}>
                    <Text style={styles.achievementTitle}>{post.actionTitle}</Text>
                    {post.goal && (
                      <Text style={styles.achievementSubtitle}>{post.goal}</Text>
                    )}
                  </View>
                </View>
                
                {/* Right side - Achievement value */}
                <View style={styles.achievementValue}>
                  <Text style={styles.achievementValueText}>
                    {post.streak ? `${post.streak} 🔥` : '✓'}
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {/* TYPE B: PHOTO/VIDEO POST */}
          {hasPhoto && (
            <View style={styles.mediaContainer}>
              <Image 
                source={{ uri: post.photoUri }}
                style={styles.postMedia}
                resizeMode="cover"
              />
            </View>
          )}
          
          {/* TYPE C: PROGRESS POST */}
          {post.type === 'progress' && post.progressPercent && (
            <View style={styles.progressShareContainer}>
              <LinearGradient
                colors={['rgba(255,215,0,0.05)', 'rgba(0,0,0,0.5)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              
              {/* Progress Circle */}
              <View style={styles.progressCircleContainer}>
                <Svg width={100} height={100}>
                  {/* Background ring */}
                  <Circle
                    cx={50}
                    cy={50}
                    r={40}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={6}
                    fill="transparent"
                  />
                  {/* Progress ring */}
                  <Circle
                    cx={50}
                    cy={50}
                    r={40}
                    stroke="url(#goldGradient)"
                    strokeWidth={6}
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - (post.progressPercent || 0) / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                  <Defs>
                    <LinearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <Stop offset="0%" stopColor="#ffd700" />
                      <Stop offset="100%" stopColor="#ffaa00" />
                    </LinearGradient>
                  </Defs>
                </Svg>
                
                <View style={styles.progressTextContainer}>
                  <Text style={styles.progressPercent}>{post.progressPercent}%</Text>
                  <Text style={styles.progressLabel}>COMPLETE</Text>
                </View>
              </View>
              
              {/* Stats row */}
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{post.daysActive || 0}</Text>
                  <Text style={styles.progressStatLabel}>DAYS</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{post.tasksCompleted || 0}</Text>
                  <Text style={styles.progressStatLabel}>TASKS</Text>
                </View>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatValue}>{post.streak || 0}</Text>
                  <Text style={styles.progressStatLabel}>STREAK</Text>
                </View>
              </View>
            </View>
          )}
        </View>
        
        {/* TYPE D: AUDIO POST */}
        {hasAudio && (
          <View style={styles.audioPlayerContainer}>
            <LinearGradient
              colors={['rgba(255,215,0,0.05)', 'rgba(0,0,0,0.5)']}
              style={StyleSheet.absoluteFillObject}
            />
            
            <Pressable style={styles.audioPlayButton} onPress={toggleAudio}>
              <LinearGradient
                colors={['#ffd700', '#ffaa00']}
                style={styles.audioPlayButtonGradient}
              >
                {isPlaying ? (
                  <Pause size={20} color="#000" />
                ) : (
                  <Play size={20} color="#000" style={{ marginLeft: 2 }} />
                )}
              </LinearGradient>
            </Pressable>
            
            <View style={styles.audioWaveform}>
              {[...Array(30)].map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.audioBar,
                    { 
                      height: i % 2 === 0 ? 20 : 30,
                      opacity: isPlaying ? 1 : 0.3
                    }
                  ]} 
                />
              ))}
            </View>
            
            <Text style={styles.audioDuration}>{post.audioDuration || '2:34'}</Text>
          </View>
        )}
        
        {/* 3. ENGAGEMENT SECTION */}
        <View style={styles.engagementSection}>
          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <Pressable
              style={[
                styles.actionButton,
                post.userReacted && styles.actionButtonActive
              ]}
              onPress={handleReact}
            >
              <Text style={[styles.actionButtonIcon, post.userReacted && styles.actionButtonIconActive]}>
                🔥
              </Text>
              <Text style={[
                styles.actionButtonText,
                post.userReacted && styles.actionButtonTextActive
              ]}>
                {post.reactionCount || 0}
              </Text>
            </Pressable>
            
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowComments(!showComments);
              }}
            >
              <Text style={styles.actionButtonIcon}>💬</Text>
              <Text style={styles.actionButtonText}>{post.commentCount || 0}</Text>
            </Pressable>
          </View>
        </View>
        
        {/* 4. COMMENTS SECTION */}
        {showComments && (
          <View style={styles.commentsSection}>
            {/* Display existing comments */}
            {post.comments && post.comments.length > 0 && (
              <View style={styles.commentsList}>
                {post.comments.map((comment, idx) => (
                  <View key={idx} style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {comment.avatar || comment.user?.charAt(0) || '💬'}
                      </Text>
                    </View>
                    <View style={styles.commentBubble}>
                      <Text style={styles.commentAuthor}>{comment.user}</Text>
                      <Text style={styles.commentText}>{comment.content}</Text>
                      <Text style={styles.commentTime}>{comment.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
            
            {/* Comment input */}
            <CommentInput
              postId={post.id}
              onSubmit={(content) => {
                onComment(post.id, content, visibility);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Reverted to black
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 8, // Reduced from 12 to 8 for wider cards
    paddingBottom: 15, // Space for the tabs
    backgroundColor: '#000000', // Reverted to black
    position: 'relative', // For absolute positioning of underline
  },
  headerUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1, // Thinner for more subtle effect
    overflow: 'hidden',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#FFFFFF',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    marginLeft: 24, // Move slightly to the right
  },
  headerCircleSelector: {
    flex: 1,
    marginLeft: 16,
    marginRight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 40,
    justifyContent: 'center',
    paddingTop: 5,
  },
  tabButton: {
    paddingBottom: 8,
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',  // Bolder
    letterSpacing: 4,  // More spread out
    color: 'rgba(255,255,255,0.4)',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',  // Even bolder when active
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,  // Thinner, more refined
    overflow: 'hidden',  // Hide glow overflow for cleaner look
    borderRadius: 0,  // Sharp edges
  },
  tabIndicatorGlow: {
    position: 'absolute',
    top: -3,
    left: 0,
    right: 0,
    bottom: -3,
    backgroundColor: '#B8860B',  // Dark goldenrod for glow
    opacity: 0.2,
    // Apply blur effect for glow
    shadowColor: '#996515',  // Deep bronze gold shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  statusDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  scrollViewWrapper: {
    flex: 1,
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    // No z-index, will be naturally behind due to order
  },
  backgroundTexture: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.03, // Very subtle - barely visible
    // No z-index, will layer on top of gradient
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    // No z-index, will layer on top of texture
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent', // Transparent to show background
    zIndex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 120,
    paddingHorizontal: 0, // No padding here - postsContainer handles it
  },
  floatingComposer: {
    position: 'absolute',
    bottom: 120,  // More spacing from navigation bar
    left: 16,
    right: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',  // Golden accent border
    backgroundColor: 'rgba(0,0,0,0.7)',  // Darker base for better contrast
    borderRadius: 24,  // Slightly larger radius for modern feel
    overflow: 'hidden',
    // Multi-layer shadow for depth
    shadowColor: '#000000',  // Dark shadow for depth
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,  // Higher elevation
    zIndex: 1000,  // Ensure it floats above content
  },
  composerGlow: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    opacity: 0.6,
  },
  floatingComposerExpanded: {
    backgroundColor: 'rgba(0,0,0,0.85)',  // Even darker when expanded for focus
    borderColor: 'rgba(255,215,0,0.5)',  // Stronger golden border when active
    borderWidth: 1.5,
    bottom: Platform.OS === 'ios' ? 140 : 120,  // Higher for iOS to account for keyboard
  },
  composerCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16, // Add padding for spacing from edges
    paddingVertical: 16,
  },
  composerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 16,
  },
  composerPlaceholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',  // Brighter text
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',  // Dark shadow for better readability
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  composerIcons: {
    flexDirection: 'row',
    gap: 16,
  },
  composerExpanded: {
    padding: 20,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  composerAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: 12,
  },
  composerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  composerClose: {
    padding: 4,
  },
  composerInput: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 24,
    minHeight: 80,
    marginBottom: 16,
    letterSpacing: 0.3,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  visibilitySection: {
    marginBottom: 12,
  },
  visibilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visibilityText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
  },
  toggleSwitch: {
    width: 60,  // Wider for 3 positions
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,215,0,0.2)',
    padding: 2,
    position: 'relative',
  },
  toggleSwitchPrivate: {
    backgroundColor: 'rgba(192,192,192,0.2)',
  },
  toggleSwitchFollowers: {
    backgroundColor: 'rgba(6,255,165,0.2)',
  },
  toggleDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFD700',
    position: 'absolute',
  },
  toggleDotLeft: {
    backgroundColor: '#C0C0C0',
    left: 2,
  },
  toggleDotCenter: {
    backgroundColor: '#FFD700',
    left: 21,
  },
  toggleDotRight: {
    backgroundColor: '#06FFA5',
    left: 40,
  },
  visibilityHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    textAlign: 'center',
  },
  mediaPreview: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  removeMedia: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,215,0,0.2)',
    marginBottom: 16,
  },
  audioText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  composerMediaButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  mediaButton: {
    padding: 8,
  },
  mediaButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 20,
  },
  postButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  postButtonDisabled: {
    opacity: 0.3,
  },
  postButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: '#000000',
  },
  joinCard: {
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 48,
    borderRadius: 0,
    borderWidth: 0.5,
    borderColor: 'rgba(255,215,0,0.3)',
    alignItems: 'center',
    overflow: 'hidden',
  },
  joinCardIcon: {
    marginBottom: 20,
  },
  joinCardTitle: {
    fontSize: 20,
    fontWeight: '300',
    letterSpacing: 1,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  joinCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: 120,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  postsContainer: {
    paddingHorizontal: 8, // Small padding to match Profile's card width
    // Removed gap property - using marginBottom on cards instead
  },
  postCard: {
    marginBottom: 12,  // Reduced from 20 to bring cards closer
    backgroundColor: 'transparent',  // Will use gradient
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    position: 'relative',
  },
  postCardHover: {
    transform: [{ translateY: -2 }],
    borderColor: 'rgba(255,215,0,0.1)',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  postAuthorSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  postAvatarGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postAvatarEmoji: {
    fontSize: 20,
    color: '#fff',
  },
  postAuthorDetails: {
    marginLeft: 12,
  },
  postAuthorName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  postTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  postBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postTypeBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    overflow: 'hidden',
  },
  postTypeBadgeText: {
    fontSize: 10,
    color: 'rgba(255,215,0,0.9)',
    fontWeight: '600',
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postHeaderInfo: {
    marginLeft: 16,
    flex: 1,
  },
  postHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postUsername: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  postTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  postTimeSeparator: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
  },
  postContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  postCaption: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 22,
    marginBottom: 12,
  },
  // Activity Card (Check-in) - Luxury minimal design
  activityCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    padding: 20,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  luxuryAccentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    zIndex: 10,
  },
  activityIconSection: {
    position: 'relative',
    width: 48,
    height: 48,
  },
  activityMainIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  activityIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityIconEmoji: {
    fontSize: 24,
  },
  activityCheckmark: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  completionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activityStreakBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  streakBadgeText: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '300',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  activityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityStatItem: {
    flexDirection: 'row',
  },
  activityStatText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  activityPoints: {
    justifyContent: 'center',
  },
  activityPointsText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '400',
    letterSpacing: 1,
  },
  // Achievement Card (Milestone)
  achievementCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    padding: 16,
    overflow: 'hidden',
  },
  achievementContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
  },
  achievementIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementEmoji: {
    fontSize: 20,
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 13,
    color: '#ffd700',
    fontWeight: '600',
  },
  achievementSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  achievementValue: {
    marginLeft: 12,
  },
  achievementValueText: {
    fontSize: 18,
    color: '#ffd700',
    fontWeight: 'bold',
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  // Media Container
  mediaContainer: {
    marginHorizontal: -20,
    marginBottom: 16,
    backgroundColor: '#000',
  },
  postMedia: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    maxHeight: 400,
  },
  // Progress Share Container
  progressShareContainer: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  progressCircleContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  progressTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressPercent: {
    fontSize: 24,
    color: '#ffd700',
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 10,
    color: 'rgba(255,215,0,0.7)',
    letterSpacing: 0.5,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: 20,
    color: '#ffd700',
    fontWeight: 'bold',
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  progressStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  // Audio Player
  audioPlayerContainer: {
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  audioPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 16,
  },
  audioPlayButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    gap: 2,
  },
  audioBar: {
    width: 3,
    backgroundColor: 'rgba(255,215,0,0.3)',
  },
  audioDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginLeft: 16,
  },
  // Engagement Section
  engagementSection: {
    padding: 16,
    paddingTop: 12,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  statNumber: {
    color: '#ffd700',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderColor: 'rgba(255,215,0,0.3)',
  },
  actionButtonIcon: {
    fontSize: 16,
  },
  actionButtonText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  actionButtonTextActive: {
    color: '#ffd700',
  },
  actionButtonIconActive: {
    transform: [{ scale: 1.2 }],
  },
  // Comments Section
  commentsSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  commentsList: {
    marginBottom: 12,
  },
  commentItem: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontSize: 12,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 8,
    paddingHorizontal: 12,
  },
  commentAuthor: {
    fontSize: 12,
    color: '#ffd700',
    fontWeight: '500',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  commentTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    maxHeight: 80,
    minHeight: 32,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  commentInputFocused: {
    color: '#FFFFFF',
  },
  commentSendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.15)',
  },
  
  // Circle Info Section Styles - Removed per user request
  postText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    letterSpacing: 0.3,
    paddingHorizontal: 16, // Add padding for regular text posts
  },
  postTextWithPhoto: {
    textAlign: 'center',  // Center align text only when with photo
  },
  photoContainer: {
    marginTop: 0,  // No top margin since it comes right after header
    marginHorizontal: -12,  // Negative margin to extend to edges
    marginBottom: 12,  // Reduced space before text below
    overflow: 'hidden',
    borderWidth: 0,  // Remove border for cleaner look
  },
  postPhoto: {
    width: '100%',
    aspectRatio: 1,  // Square aspect ratio like Instagram
    backgroundColor: 'rgba(0,0,0,0.5)',  // Darker background for loading state
  },
  audioContainer: {
    marginTop: 8,  // Reduced from 16 for tighter spacing
    padding: 12,  // Reduced from 16
    borderWidth: 0.5,
    borderColor: 'rgba(255,215,0,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  audioButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  audioWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  audioBar: {
    width: 2,
    backgroundColor: 'rgba(255,215,0,0.3)',
  },
  postActions: {
    flexDirection: 'row',
    gap: 32,
    paddingTop: 12,  // Reduced from 20 for closer interaction buttons
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },
  // Check-in post styles - NEW VERSION WITH PROMINENT USER
  checkinCardNew: {
    backgroundColor: 'rgba(10, 10, 12, 0.7)',
    borderRadius: 20, // Match inline composer
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    overflow: 'hidden',
    position: 'relative',
    // Subtle celebration glow - reduced
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginHorizontal: 0, // Same as inline composer
  },
  checkinUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,  // Reduced from 12
    paddingBottom: 4,  // Reduced from 6
    gap: 12,
  },
  checkinUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  checkinUserAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  checkinUserAvatarEmoji: {
    fontSize: 22,
  },
  checkinUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkinUserName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  checkinUserAction: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.3,
  },
  checkinStreakBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkinStreakEmoji: {
    fontSize: 16,
  },
  checkinStreakNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
  },
  checkinActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,  // Reduced from 12
    paddingBottom: 8,  // Reduced from 12
    paddingTop: 0,  // Reduced from 2
    gap: 10,
  },
  checkinCheckIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkinActionContent: {
    flex: 1,
  },
  checkinActionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkinActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  checkinActionSeparator: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  checkinActionGoal: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '500',
  },
  // Load More Button styles
  loadMoreButton: {
    marginTop: 20,
    marginBottom: 60,  // Increased from 20 to create proper separation from floating composer
    marginHorizontal: 20,
  },
  loadMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  loadMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFD700',
  },
  
  // Circle Sub-tabs styles (smaller than main tabs)
  circleSubTabs: {
    paddingHorizontal: 16,
    paddingTop: 4,  // Moved up more
    paddingBottom: 6,
    // borderBottomWidth: 1,  // REMOVED grey line
    // borderBottomColor: 'rgba(255,255,255,0.1)',  // REMOVED grey line
    marginBottom: 4,  // Reduced spacing below
  },
  circleSubTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  circleSubTab: {
    paddingBottom: 6,
    paddingHorizontal: 8,
    position: 'relative',
    alignItems: 'center',
    minWidth: 95,
  },
  circleSubTabText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.4)',
  },
  circleSubTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  circleSubTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',  // Narrower indicator
    right: '20%', // Narrower indicator
    height: 1.5,  // Thinner line
    overflow: 'hidden',
  },
  
  // Circle Members Container
  circleMembersContainer: {
    padding: 20,
  },
  circleMembersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  circleMembersSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  membersGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  memberAvatarContainer: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  memberAvatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  memberAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#000',
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  memberUsername: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  memberScoreContainer: {
    width: 80,
    height: 50,
    marginLeft: 8,
  },
  memberScoreGradient: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  memberScoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.7)',
    letterSpacing: 1,
  },
  memberScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  roleBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 1,
  },
  
  // Circle Challenges Container
  circleChallengesContainer: {
    flex: 1,
    padding: 20,
  },
  circleChallengesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 8,
  },
  circleChallengesSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChallenges: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChallengesIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyChallengesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyChallengesSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },

  // Explore Tab Styles
  exploreContainer: {
    flex: 1,
    padding: 20,
  },
  exploreHeader: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  exploreIcon: {
    marginBottom: 12,
  },
  exploreTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  exploreSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  exploreSection: {
    marginVertical: 20,
  },
  exploreSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  explorePlaceholder: {
    backgroundColor: 'rgba(255,215,0,0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.1)',
  },
  explorePlaceholderText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});