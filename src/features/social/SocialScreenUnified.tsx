import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  RefreshControl,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Users,
  UserPlus,
  Camera,
  Image as ImageIcon,
  Mic,
  X,
  Send
} from 'lucide-react-native';
import { useStore } from '../../state/rootStore';
import { Post, Visibility } from '../../state/slices/socialSlice';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { FeedSkeleton } from '../../components/SkeletonLoader';
import * as ImagePicker from 'expo-image-picker';

import { CircleMembersModal } from './CircleMembersModal';
import { JoinCircleModal } from './JoinCircleModal';
import { DiscoverUsersModal } from './DiscoverUsersModal';
import { UnifiedPostCard } from './UnifiedPostCard';
import { UnifiedPostCardTimeline } from './UnifiedPostCardTimeline';
import { LivingProgressCard } from './components/LivingProgressCard';
import { ProfileScreen } from '../profile/ProfileScreenVision';
import { CircleSelector, FEED_ALL, FEED_FOLLOWING } from '../circles/components/CircleSelector';
import { ChallengeCard } from '../challenges/ChallengeCard';
import { JoinChallengeModal } from '../challenges/JoinChallengeModal';

const { width } = Dimensions.get('window');

// FEATURE TOGGLE: Switch between old and new card styles
// Set to false for safety - flip to true to enable Timeline cards
const USE_TIMELINE_CARDS = true;

// Tab bar height constant for proper scroll padding
const TAB_BAR_HEIGHT = 60;

export const SocialScreenUnified = () => {
  const insets = useSafeAreaInsets();

  // Unified feed state
  const unifiedFeed = useStore(s => s.unifiedFeed);
  const feedLoading = useStore(s => s.feedLoading);
  const unifiedHasMore = useStore(s => s.unifiedHasMore);
  const loadingMore = useStore(s => s.loadingMore);
  const fetchUnifiedFeed = useStore(s => s.fetchUnifiedFeed);
  const loadMoreUnifiedFeed = useStore(s => s.loadMoreUnifiedFeed);

  // User and circle state
  const user = useStore(s => s.user);
  const userCircles = useStore(s => s.userCircles);
  const activeCircleId = useStore(s => s.activeCircleId);
  const setActiveCircle = useStore(s => s.setActiveCircle);
  const fetchUserCircles = useStore(s => s.fetchUserCircles);

  // Actions
  const react = useStore(s => s.react);
  const addPost = useStore(s => s.addPost);
  const addComment = useStore(s => s.addComment);

  // Challenges
  const circleChallenges = useStore(s => s.circleChallenges);
  const fetchCircleChallenges = useStore(s => s.fetchCircleChallenges);

  // Modal states
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showJoinCircleModal, setShowJoinCircleModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showJoinChallengeModal, setShowJoinChallengeModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<any>(null);

  // Composer state
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [postText, setPostText] = useState('');
  const [postPhoto, setPostPhoto] = useState<string | null>(null);
  const [postAudio, setPostAudio] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // Local feed type state (null = All, FEED_FOLLOWING, or circle ID)
  const [feedType, setFeedType] = useState<string | null>(FEED_ALL);

  // Handle feed type selection
  const handleFeedTypeChange = (type: string | null) => {
    // Map FEED_ALL to null for the selector
    const normalizedType = type === FEED_ALL ? null : type;
    setFeedType(type);

    // Only set activeCircle for actual circles
    if (type && type !== FEED_ALL && type !== FEED_FOLLOWING) {
      setActiveCircle(type);
    } else {
      setActiveCircle(null);
    }
  };

  // Load feed on mount and when feed type changes
  useEffect(() => {
    // Pass the filter directly - FEED_ALL, FEED_FOLLOWING, or a specific circleId
    fetchUnifiedFeed(true, feedType || FEED_ALL);
    fetchUserCircles();

    // Fetch challenges only if specific circle selected
    if (feedType && feedType !== FEED_ALL && feedType !== FEED_FOLLOWING) {
      fetchCircleChallenges(feedType);
    }
  }, [feedType]);

  // Handle post creation
  const handlePost = async () => {
    if (!postText.trim() && !postPhoto && !postAudio) return;

    setIsPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const postType = postPhoto ? 'photo' : postAudio ? 'audio' : 'status';
    if (__DEV__) console.log('📸 [COMPOSER] handlePost - type:', postType, 'photoUri:', postPhoto);

    try {
      await addPost({
        type: postType,
        content: postText,
        visibility: 'circle' as Visibility,
        photoUri: postPhoto || undefined,
        audioUri: postAudio || undefined,
      });

      setPostText('');
      setPostPhoto(null);
      setPostAudio(null);
      setComposerExpanded(false);

      // Refresh feed with current filter
      await fetchUnifiedFeed(true, feedType || FEED_ALL);
    } catch (error) {
      if (__DEV__) console.error('Failed to create post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  // Handle image picker
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (__DEV__) console.log('📸 [IMAGE-PICKER] Selected image:', uri);
      setPostPhoto(uri);
      setComposerExpanded(true);
    } else {
      if (__DEV__) console.log('📸 [IMAGE-PICKER] Image selection canceled');
    }
  };

  // Handle scroll to load more
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;

    if (isCloseToBottom && !loadingMore && unifiedHasMore) {
      loadMoreUnifiedFeed();
    }
  };

  const handleReact = useCallback((id: string, emoji: string) => {
    react(id, emoji, 'circle');
  }, [react]);

  const handleComment = useCallback((id: string, text: string) => {
    addComment(id, text, 'circle');
  }, [addComment]);

  const handleProfilePress = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const renderPost = useCallback(({ item }: { item: Post }) => {
    // DEBUG: Log ALL post data to find the gibberish
    if (__DEV__) {
      console.log('🔍 [POST-DEBUG] Rendering post:', {
        id: item.id.substring(0, 8),
        type: item.type,
        user: item.user,
        contentLength: item.content?.length || 0,
        mediaUrlLength: item.mediaUrl?.length || 0,
        photoUriLength: item.photoUri?.length || 0,
        audioUriLength: item.audioUri?.length || 0,
        actionTitle: item.actionTitle?.substring(0, 50),
        goal: item.goal?.substring(0, 50),
      });
    }

    // SAFETY: Skip posts with suspiciously long content (likely corrupted base64)
    if (item.content && item.content.length > 500) {
      if (__DEV__) console.warn('🚫 [SOCIAL] Skipping post with suspiciously long content:', {
        id: item.id.substring(0, 8),
        contentLength: item.content.length,
        preview: item.content.substring(0, 50) + '...'
      });
      return null;
    }

    // SAFETY: Check ALL text fields for gibberish
    const checkField = (fieldName: string, value: string | undefined) => {
      if (value && value.length > 500) {
        if (__DEV__) console.warn('🚫 [SOCIAL] Found gibberish in', fieldName, ':', {
          id: item.id.substring(0, 8),
          fieldLength: value.length,
          preview: value.substring(0, 50) + '...'
        });
        return true;
      }
      return false;
    };

    if (checkField('mediaUrl', item.mediaUrl) ||
        checkField('photoUri', item.photoUri) ||
        checkField('audioUri', item.audioUri)) {
      return null; // Skip this post
    }

    // Render Living Progress Card for daily_progress posts
    if (item.type === 'daily_progress' && item.isDailyProgress) {
      return <LivingProgressCard post={item} />;
    }

    // Render regular post cards
    const CardComponent = USE_TIMELINE_CARDS ? UnifiedPostCardTimeline : UnifiedPostCard;

    return (
      <CardComponent
        post={item}
        onReact={handleReact}
        onComment={handleComment}
        onProfilePress={handleProfilePress}
      />
    );
  }, [handleReact, handleComment, handleProfilePress]);

  // Render list header with composer and challenges
  const renderListHeader = useCallback(() => {
    return (
      <>
        {/* Circle Selector */}
        <View style={styles.circleSelectorContainer}>
          <CircleSelector
            circles={userCircles || []}
            activeCircleId={feedType}
            onCircleSelect={handleFeedTypeChange}
            onJoinCircle={() => setShowJoinCircleModal(true)}
          />
        </View>

        {/* Composer */}
        <View style={styles.composer}>
          <View style={styles.composerHeader}>
            <View style={styles.composerAvatar}>
              <Text style={styles.avatarEmoji}>{user?.avatar || '👤'}</Text>
            </View>
            <TextInput
              style={styles.composerInput}
              placeholder="What did you complete today?"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={postText}
              onChangeText={setPostText}
              onFocus={() => setComposerExpanded(true)}
              multiline
            />
          </View>

          {composerExpanded && (
            <View style={styles.composerActions}>
              <View style={styles.mediaButtons}>
                <Pressable style={styles.mediaButton} onPress={pickImage}>
                  <ImageIcon size={20} color="rgba(255,255,255,0.6)" />
                </Pressable>
                <Pressable style={styles.mediaButton}>
                  <Mic size={20} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              <Pressable
                style={[styles.postButton, (!postText.trim() && !postPhoto) && styles.postButtonDisabled]}
                onPress={handlePost}
                disabled={isPosting || (!postText.trim() && !postPhoto)}
              >
                {isPosting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Send size={18} color="#000" />
                )}
              </Pressable>
            </View>
          )}

          {postPhoto && (
            <View style={styles.photoPreview}>
              <Image
                source={{ uri: postPhoto }}
                style={styles.photoPreviewImage}
                resizeMode="cover"
              />
              <Pressable
                style={styles.removePhoto}
                onPress={() => {
                  if (__DEV__) console.log('📸 [COMPOSER] Removing photo');
                  setPostPhoto(null);
                }}
              >
                <X size={16} color="#fff" />
              </Pressable>
            </View>
          )}
        </View>

      </>
    );
  }, [userCircles, feedType, user, postText, composerExpanded, postPhoto, isPosting]);

  // Render list footer with loading states
  const renderListFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator color="#FFD700" />
        </View>
      );
    }
    if (!unifiedHasMore && unifiedFeed.length > 0) {
      return <Text style={styles.endOfFeed}>You're all caught up!</Text>;
    }
    return null;
  }, [loadingMore, unifiedHasMore, unifiedFeed.length]);

  // Render empty state
  const renderListEmpty = useCallback(() => {
    if (feedLoading) {
      return <FeedSkeleton />;
    }
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>No posts yet</Text>
        <Text style={styles.emptySubtitle}>
          Be the first to share your progress!
        </Text>
      </View>
    );
  }, [feedLoading]);

  // Debug: Log any suspicious data
  if (__DEV__ && unifiedFeed.length > 0) {
    const firstPost = unifiedFeed[0];
    console.log('🐛 [SOCIAL] First post data:', {
      id: firstPost.id?.substring(0, 8),
      type: firstPost.type,
      content: firstPost.content?.substring(0, 100),
      user: firstPost.user
    });
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logoText}>UNITY</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerButton}
              onPress={() => setShowDiscoverModal(true)}
            >
              <UserPlus size={20} color="#FFD700" />
            </Pressable>
          </View>
        </View>

        {/* Gold accent line */}
        <LinearGradient
          colors={['transparent', '#FFD700', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.goldLine}
        />

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            data={unifiedFeed}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderListHeader}
            ListFooterComponent={renderListFooter}
            ListEmptyComponent={renderListEmpty}
            refreshControl={
              <RefreshControl
                refreshing={feedLoading}
                onRefresh={() => fetchUnifiedFeed(true, feedType || FEED_ALL)}
                tintColor="#FFD700"
                colors={['#FFD700']}
              />
            }
            onEndReached={() => {
              if (!loadingMore && unifiedHasMore) {
                loadMoreUnifiedFeed();
              }
            }}
            onEndReachedThreshold={0.5}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: TAB_BAR_HEIGHT + insets.bottom }
            ]}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={10}
          />
        </KeyboardAvoidingView>

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

        {selectedChallenge && (
          <JoinChallengeModal
            visible={showJoinChallengeModal}
            challenge={selectedChallenge}
            onClose={() => {
              setShowJoinChallengeModal(false);
              setSelectedChallenge(null);
            }}
            onSuccess={() => {
              setShowJoinChallengeModal(false);
              setSelectedChallenge(null);
              fetchUnifiedFeed(true, feedType || FEED_ALL);
            }}
          />
        )}

        {/* Profile Modal */}
        <Modal
          visible={!!selectedUserId}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSelectedUserId(null)}
        >
          {selectedUserId && (
            <ProfileScreen
              userId={selectedUserId}
              isInModal={true}
            />
          )}
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },
  goldLine: {
    height: 1,
    marginHorizontal: 20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    // paddingBottom is set dynamically via contentContainerStyle
  },
  circleSelectorContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  composer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  composerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  composerInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    minHeight: 40,
    maxHeight: 120,
  },
  composerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  mediaButton: {
    padding: 8,
  },
  postButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  photoPreview: {
    marginTop: 12,
    height: 200,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  feedContainer: {
    gap: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  endOfFeed: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default SocialScreenUnified;
