import { StateCreator } from 'zustand';
import { backendService } from '../../services/backend.service';
import { AuthSlice } from './authSlice';
import { memoryCache } from '../../utils/memoryCache';
import ChallengeDebugV2 from '../../utils/challengeDebugV2';

export type PostType = 'checkin'|'status'|'photo'|'audio'|'goal'|'celebration';

// New visibility model supporting multi-circle posts and Explore
export interface PostVisibility {
  isPrivate: boolean;     // Only visible to poster
  isExplore: boolean;     // Discoverable in Explore feed
  isNetwork: boolean;     // Visible to all circles + followers
  circleIds: string[];    // Specific circles (if not network/private)
}

// Legacy visibility types for backward compatibility
export type LegacyVisibility = 'private'|'circle'|'followers';
// Extended to support new options
export type Visibility = LegacyVisibility | 'explore' | 'network' | 'selected_circles';

export type Comment = {
  id: string;
  postId: string;
  user: string;
  avatar?: string;
  content: string;
  time: string;
  timestamp: string;
};

export type Post = {
  id: string;
  user: string;
  userId?: string;              // User ID for profile viewing
  avatar?: string;              // emoji or URL
  type: PostType;
  visibility: Visibility;       // Legacy field for backward compatibility
  // New visibility fields
  visibilityDetails?: PostVisibility;  // New model
  circleIds?: string[];         // Which circles can see this (for multi-circle posts)
  isExplore?: boolean;          // Is this discoverable in Explore?
  isNetwork?: boolean;          // Is this visible to entire network?
  content: string;              // status/insight or caption
  time: string;                 // "2h"
  timestamp?: string;           // ISO date string for sorting
  reactions: Record<string, number>;
  userReacted?: boolean;  // Track if current user reacted
  comments?: Comment[];         // Array of comments
  commentCount?: number;        // Total comment count
  // likes (fire)
  likeCount?: number;           // Total number of likes
  userLiked?: boolean;          // Whether current user liked this post
  // media
  photoUri?: string;
  audioUri?: string;
  // check-in metadata
  actionTitle?: string;
  goal?: string;
  streak?: number;
  goalColor?: string;           // hex used for chip/glow
  // New streak metrics
  streakMetrics?: {
    graceStreak?: { done: number; window: number; label: string };
    recovery?: { isComeback: boolean; label?: string };
    momentum?: { score: number; trend: 'up' | 'down' | 'stable' };
    monthProgress?: { completed: number; total: number };
    intensity?: 'Low' | 'Medium' | 'High';
  };
  // Social proof
  socialProof?: {
    inspired?: number;  // "3 people boosted their streak after seeing this"
    milestone?: string; // "First 7-day streak!"
  };
  // Challenge-specific fields
  isChallenge?: boolean;
  challengeName?: string;
  challengeId?: string;
  challengeProgress?: string;  // e.g., "3/3 daily complete"
  leaderboardPosition?: number;
  totalParticipants?: number;
  // Celebration-specific fields
  is_celebration?: boolean;
  celebration_type?: 'daily_100' | 'weekly_100' | 'milestone';
  metadata?: {
    userName?: string;
    userAvatar?: string;
    completionTime?: string;
    actionCount?: number;
  };
};

export type SocialSlice = {
  circleFeed: Post[]; 
  followFeed: Post[];
  feedLoading: boolean;
  feedError: string | null;
  // Pagination state
  circleOffset: number;
  circleHasMore: boolean;
  followOffset: number;
  followHasMore: boolean;
  loadingMore: boolean;
  // Circle data
  circleId: string | null;
  circleName: string | null;
  circleMembers: any[];
  inviteCode: string | null;
  // Following data
  following: any[];
  followers: any[];
  // Actions
  fetchFeeds: (refresh?: boolean) => Promise<void>;
  loadMoreFeeds: (type: 'circle' | 'follow') => Promise<void>;
  react: (id:string, emoji:string, which:Visibility) => Promise<void>;
  toggleLike: (postId: string, which: Visibility) => Promise<void>;
  addPost: (p:Partial<Post>) => Promise<void>;
  addComment: (postId: string, content: string, which: Visibility) => Promise<void>;
  loadComments: (postId: string, which: Visibility) => Promise<void>;
  clearCheckinPosts: () => void;
  // Circle actions
  joinCircle: (inviteCode: string) => Promise<boolean>;
  loadCircleData: () => Promise<void>;
  // Following actions
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  loadFollowing: () => Promise<void>;
};

export const createSocialSlice: StateCreator<
  SocialSlice & AuthSlice,
  [],
  [],
  SocialSlice
> = (set, get) => ({
  circleFeed: [],
  followFeed: [],
  feedLoading: false,
  feedError: null,
  // Pagination state
  circleOffset: 0,
  circleHasMore: true,
  followOffset: 0,
  followHasMore: true,
  loadingMore: false,
  // Circle data
  circleId: null,
  circleName: null,
  circleMembers: [],
  inviteCode: null,
  // Following data
  following: [],
  followers: [],
  
  fetchFeeds: async (refresh = false) => {
    console.log('🔄 [FEED] fetchFeeds called, refresh:', refresh);
    set({ feedLoading: true, feedError: null });
    try {
      // Get current user from auth slice
      const currentUser = get().user;
      const currentUserId = currentUser?.id;

      // Get activeCircleId from the store (accessing circlesSlice)
      const activeCircleId = (get() as any).activeCircleId;
      console.log('🔵 [FEED] Using activeCircleId:', activeCircleId);

      // Create unique cache keys based on circle
      const circleCacheKey = `feed:circle:${activeCircleId || 'default'}`;

      // Reset pagination on refresh
      if (refresh) {
        set({
          circleOffset: 0,
          followOffset: 0,
          circleHasMore: true,
          followHasMore: true,
          circleFeed: [],
          followFeed: []
        });
        memoryCache.clear(circleCacheKey);
        memoryCache.clear('feed:follow');
      }

      // Check if we have cached feeds for instant display (only for initial load)
      const cachedCircle = !refresh ? memoryCache.get<{data: any[], hasMore: boolean}>(circleCacheKey) : null;
      const cachedFollow = !refresh ? memoryCache.get<{data: any[], hasMore: boolean}>('feed:follow') : null;

      console.log('📊 [FEED] Cache status - Circle:', !!cachedCircle, 'Follow:', !!cachedFollow);

      // Fetch both feeds in parallel (use cache if available)
      const [circleResponse, followResponse] = await Promise.all([
        cachedCircle
          ? Promise.resolve({ success: true, data: cachedCircle.data, hasMore: cachedCircle.hasMore })
          : backendService.getFeed('circle', 5, 0, activeCircleId).then(res => {
              if (res.success) {
                memoryCache.set(circleCacheKey, { data: res.data, hasMore: res.hasMore });
              }
              return res;
            }),
        cachedFollow
          ? Promise.resolve({ success: true, data: cachedFollow.data, hasMore: cachedFollow.hasMore })
          : backendService.getFeed('follow', 5, 0).then(res => {
              if (res.success) {
                memoryCache.set('feed:follow', { data: res.data, hasMore: res.hasMore });
              }
              return res;
            })
      ]);
      
      // Transform API data to match our Post type
      const transformPost = (post: any): Post => {
        // Calculate time ago
        const timeAgo = (date: string) => {
          const diff = Date.now() - new Date(date).getTime();
          const minutes = Math.floor(diff / (1000 * 60));
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const days = Math.floor(hours / 24);
          
          if (minutes < 1) return 'now';
          if (minutes < 60) return `${minutes}m`;
          if (hours < 24) return `${hours}h`;
          return `${days}d`;
        };
        
        // Use the new reaction count from backend
        const reactionCount = post.reactionCount || 0;
        const userReacted = post.userReacted || false;
        
        // Check if this post is from the current user
        const isCurrentUser = post.userId === currentUserId;
        
        // Debug audio posts
        if (post.type === 'audio') {
          console.log('Audio post from backend:', {
            id: post.id,
            type: post.type,
            mediaUrl: post.mediaUrl,
            content: post.content
          });
        }
        
        // CHECKPOINT 8: Post from database being transformed
        if (post.is_challenge || post.challenge_name) {
          ChallengeDebugV2.checkpoint('CP8-TRANSFORM', 'Challenge post from DB being transformed', post);
          
          console.log('🎯 [TRANSFORM] Challenge post from DB:', {
            id: post.id,
            is_challenge: post.is_challenge,
            challenge_name: post.challenge_name,
            challenge_id: post.challenge_id,
            challenge_progress: post.challenge_progress,
            leaderboard_position: post.leaderboard_position,
            total_participants: post.total_participants
          });
        }

        return {
          id: post.id,
          user: isCurrentUser ? 'You' : (post.profiles?.name || post.user?.name || 'Anonymous'),
          userId: post.userId || post.user_id, // Include user ID for profile viewing
          avatar: isCurrentUser ? (currentUser?.avatar || '👤') : (post.profiles?.avatar_url || post.user?.avatar || '👤'),
          type: post.type as PostType,
          visibility: post.visibility as Visibility,
          content: post.content,
          time: timeAgo(post.created_at || post.createdAt),
          timestamp: post.created_at || post.createdAt, // Include timestamp for consistent sorting
          reactions: {}, // Keep empty for compatibility
          reactionCount,
          userReacted,
          commentCount: post.commentCount || 0,
          comments: post.comments || [], // Include comments array
          photoUri: post.type === 'photo' ? (post.media_url || post.mediaUrl) : undefined,
          audioUri: post.type === 'audio' ? (post.media_url || post.mediaUrl) : undefined,
          mediaUrl: post.media_url || post.mediaUrl, // Include media for all types (checkins with photos, etc)
          actionTitle: post.action_title || post.actionTitle,
          goal: post.goal_title || post.goalTitle,
          streak: post.streak,
          goalColor: post.goal_color || post.goalColor,
          // MAP CHALLENGE FIELDS - THIS WAS MISSING!
          isChallenge: post.is_challenge || false,
          challengeName: post.challenge_name,
          challengeId: post.challenge_id,
          challengeProgress: post.challenge_progress,
          leaderboardPosition: post.leaderboard_position,
          totalParticipants: post.total_participants,
          // MAP CELEBRATION FIELDS
          is_celebration: post.is_celebration || false,
          celebration_type: post.celebration_type,
          metadata: post.metadata ? (typeof post.metadata === 'string' ? JSON.parse(post.metadata) : post.metadata) : undefined
        };
      };
      
      if (circleResponse.success) {
        console.log('🟢 [FEED] Circle feed response:', circleResponse.data?.length || 0, 'posts');
        const circlePosts = (circleResponse.data || []).map(transformPost);
        console.log('📝 [FEED] Transformed circle posts:', circlePosts.map(p => ({ 
          id: p.id, 
          type: p.type, 
          content: p.content?.substring(0, 50),
          actionTitle: p.actionTitle 
        })));
        set({ 
          circleFeed: circlePosts,
          circleOffset: circlePosts.length,
          circleHasMore: circleResponse.hasMore || false
        });
      } else {
        console.log('🔴 [FEED] Circle feed failed:', circleResponse);
      }
      
      if (followResponse.success) {
        console.log('🟢 [FEED] Follow feed response:', followResponse.data?.length || 0, 'posts');
        const followPosts = (followResponse.data || []).map(transformPost);
        set({ 
          followFeed: followPosts,
          followOffset: followPosts.length,
          followHasMore: followResponse.hasMore || false
        });
      } else {
        console.log('🔴 [FEED] Follow feed failed:', followResponse);
      }
      
      set({ feedLoading: false });
      console.log('✅ [FEED] Feed loading complete');
    } catch (error: any) {
      console.error('🔴 [FEED] Error loading feeds:', error);
      set({ feedError: error.message, feedLoading: false });
    }
  },
  
  loadMoreFeeds: async (type: 'circle' | 'follow') => {
    const state = get();

    // Check if already loading or no more to load
    if (state.loadingMore) return;
    if (type === 'circle' && !state.circleHasMore) return;
    if (type === 'follow' && !state.followHasMore) return;

    set({ loadingMore: true });

    try {
      const currentUser = state.user;
      const currentUserId = currentUser?.id;
      const offset = type === 'circle' ? state.circleOffset : state.followOffset;

      // Get activeCircleId for circle feed pagination
      const activeCircleId = type === 'circle' ? (state as any).activeCircleId : undefined;

      console.log(`Loading more ${type} posts from offset ${offset}, activeCircleId: ${activeCircleId}`);

      const response = await backendService.getFeed(type, 5, offset, activeCircleId);
      
      if (response.success) {
        // Transform API data to match our Post type
        const transformPost = (post: any): Post => {
          // Calculate time ago
          const timeAgo = (date: string) => {
            const diff = Date.now() - new Date(date).getTime();
            const minutes = Math.floor(diff / (1000 * 60));
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);
            
            if (minutes < 1) return 'now';
            if (minutes < 60) return `${minutes}m`;
            if (hours < 24) return `${hours}h`;
            return `${days}d`;
          };
          
          // Use the new reaction count from backend
          const reactionCount = post.reactionCount || 0;
          const userReacted = post.userReacted || false;
          
          // Check if this post is from the current user
          const isCurrentUser = post.userId === currentUserId;
          
          return {
            id: post.id,
            user: isCurrentUser ? 'You' : (post.profiles?.name || post.user?.name || 'Anonymous'),
            userId: post.userId || post.user_id, // Include user ID for profile viewing
            avatar: isCurrentUser ? (currentUser?.avatar || '👤') : (post.profiles?.avatar_url || post.user?.avatar || '👤'),
            type: post.type as PostType,
            visibility: post.visibility as Visibility,
            content: post.content,
            time: timeAgo(post.created_at || post.createdAt),
            timestamp: post.created_at || post.createdAt,
            reactions: {}, // Keep empty for compatibility
            reactionCount,
            userReacted,
            commentCount: post.commentCount || 0,
            photoUri: post.type === 'photo' ? (post.media_url || post.mediaUrl) : undefined,
            audioUri: post.type === 'audio' ? (post.media_url || post.mediaUrl) : undefined,
            mediaUrl: post.media_url || post.mediaUrl, // Include media for all types (checkins with photos, etc)
            actionTitle: post.action_title || post.actionTitle,
            goal: post.goal_title || post.goalTitle,
            streak: post.streak,
            goalColor: post.goal_color || post.goalColor
          };
        };
        
        const newPosts = (response.data || []).map(transformPost);
        
        if (type === 'circle') {
          set(state => {
            // Filter out duplicates by checking post IDs
            const existingIds = new Set(state.circleFeed.map(p => p.id));
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
            
            console.log(`🔍 Filtering duplicates: ${newPosts.length} fetched, ${uniqueNewPosts.length} unique`);
            
            return {
              circleFeed: [...state.circleFeed, ...uniqueNewPosts],
              circleOffset: state.circleFeed.length + uniqueNewPosts.length,
              circleHasMore: uniqueNewPosts.length > 0 ? (response.hasMore || false) : false,
              loadingMore: false
            };
          });
        } else {
          set(state => {
            // Filter out duplicates by checking post IDs
            const existingIds = new Set(state.followFeed.map(p => p.id));
            const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
            
            console.log(`🔍 Filtering duplicates: ${newPosts.length} fetched, ${uniqueNewPosts.length} unique`);
            
            return {
              followFeed: [...state.followFeed, ...uniqueNewPosts],
              followOffset: state.followFeed.length + uniqueNewPosts.length,
              followHasMore: uniqueNewPosts.length > 0 ? (response.hasMore || false) : false,
              loadingMore: false
            };
          });
        }
      }
    } catch (error) {
      console.error('Error loading more feeds:', error);
      set({ loadingMore: false });
    }
  },
  
  react: async (id, emoji, which) => {
    // Toggle reaction - if user already reacted, remove it, otherwise add it
    const currentFeed = which === 'circle' ? 'circleFeed' : 'followFeed';
    const currentPost = get()[currentFeed].find(p => p.id === id);
    const hasReacted = currentPost?.userReacted || false;

    // Optimistically update UI first
    set((s) => ({
      [currentFeed]:
        s[currentFeed].map(p =>
          p.id === id
            ? {
                ...p,
                reactionCount: hasReacted
                  ? Math.max(0, (p.reactionCount || 0) - 1)
                  : (p.reactionCount || 0) + 1,
                userReacted: !hasReacted
              }
            : p
        )
    }));

    try {
      const response = await backendService.reactToPost(id, emoji);
      if (!response.success) {
        // Revert optimistic update on failure
        set((s) => ({
          [currentFeed]:
            s[currentFeed].map(p =>
              p.id === id
                ? {
                    ...p,
                    reactionCount: hasReacted
                      ? (p.reactionCount || 0) + 1  // Revert removal
                      : Math.max(0, (p.reactionCount || 0) - 1),  // Revert addition
                    userReacted: hasReacted
                  }
                : p
            )
        }));
        console.error('Failed to react to post:', response.error);
      }
    } catch (error) {
      // Revert optimistic update on error
      set((s) => ({
        [currentFeed]:
          s[currentFeed].map(p =>
            p.id === id
              ? {
                  ...p,
                  reactionCount: hasReacted
                    ? (p.reactionCount || 0) + 1  // Revert removal
                    : Math.max(0, (p.reactionCount || 0) - 1),  // Revert addition
                  userReacted: hasReacted
                }
              : p
          )
      }));
      console.error('Failed to react to post:', error);
    }
  },
  
  clearCheckinPosts: () => {
    // Filter out all check-in posts from both feeds
    set((state) => ({
      circleFeed: state.circleFeed.filter(post => post.type !== 'checkin'),
      followFeed: state.followFeed.filter(post => post.type !== 'checkin')
    }));
  },
  
  addPost: async (postData) => {
    // CHECKPOINT 3: Post data received in socialSlice
    ChallengeDebugV2.checkpoint('CP3-SOCIAL-SLICE', 'Post data in socialSlice.addPost', postData);
    
    console.log('📝 [FEED] addPost called with:', { 
      type: postData.type, 
      visibility: postData.visibility,
      content: postData.content?.substring(0, 50),
      actionTitle: postData.actionTitle,
      isChallenge: postData.isChallenge,
      challengeName: postData.challengeName,
      hasAudio: !!postData.audioUri,
      audioLength: postData.audioUri?.length
    });
    set({ feedError: null });
    
    // Get current user from auth state
    const currentUser = get().user;
    
    // Create optimistic post
    const now = new Date();
    const optimisticPost: Post = {
      id: `temp-${Date.now()}`,
      user: 'You',
      avatar: currentUser?.avatar || '👤',
      type: postData.type || 'status',
      visibility: postData.visibility || 'circle',
      content: postData.content || '',
      time: 'now',
      timestamp: now.toISOString(), // Add timestamp for sorting
      reactions: {},
      photoUri: postData.photoUri,
      audioUri: postData.audioUri,
      actionTitle: postData.actionTitle,
      goal: postData.goal,
      streak: postData.streak,
      goalColor: postData.goalColor,
      // Challenge fields
      isChallenge: postData.isChallenge,
      challengeName: postData.challengeName,
      challengeId: postData.challengeId,
      challengeProgress: postData.challengeProgress,
      leaderboardPosition: postData.leaderboardPosition,
      totalParticipants: postData.totalParticipants
    };

    // Optimistically add to feed
    set((s) => {
      if (optimisticPost.visibility === 'circle') {
        return { circleFeed: [optimisticPost, ...s.circleFeed] };
      }
      return { followFeed: [optimisticPost, ...s.followFeed] };
    });

    try {
      // Get circle ID if posting to circle feed
      // Use activeCircleId from circlesSlice to know which circle to post to
      const activeCircleId = get().activeCircleId;
      const circleId = postData.visibility === 'circle' ? activeCircleId : null;

      console.log('🎯 [POST] Creating post with visibility:', postData.visibility, 'to circle:', circleId);
      
      // CHECKPOINT 4: Data being sent to backend
      const backendData = {
        type: postData.type || 'status',
        visibility: postData.visibility || 'circle',
        content: postData.content || '',
        mediaUrl: postData.photoUri || postData.audioUri,
        actionTitle: postData.actionTitle,
        goalTitle: postData.goal,
        goalColor: postData.goalColor,
        streak: postData.streak,
        circleId: circleId,
        // Challenge fields
        isChallenge: postData.isChallenge,
        challengeName: postData.challengeName,
        challengeId: postData.challengeId,
        challengeProgress: postData.challengeProgress,
        leaderboardPosition: postData.leaderboardPosition,
        totalParticipants: postData.totalParticipants,
        // NEW: Multi-circle visibility model
        ...(postData.isPrivate !== undefined && {
          isPrivate: postData.isPrivate,
          isExplore: postData.isExplore,
          isNetwork: postData.isNetwork,
          circleIds: postData.circleIds,
        })
      };
      
      ChallengeDebugV2.checkpoint('CP4-BACKEND-CALL', 'Data sent to backendService.createPost', backendData);
      
      console.log('📤 [FEED] Calling backendService.createPost with circleId:', circleId, 'isChallenge:', postData.isChallenge);
      const response = await backendService.createPost(backendData);
      
      console.log('📥 [FEED] Backend response:', { 
        success: response.success, 
        dataId: response.data?.id,
        error: response.error 
      });
      
      if (response.success && response.data) {
        // Don't clear cache immediately - we're handling the update optimistically
        
        // Replace optimistic post with real post - always show "You" for current user's posts
        const realPost: Post = {
          id: response.data.id,
          user: 'You',
          avatar: currentUser?.avatar || response.data.user?.avatar || '👤',
          type: response.data.type,
          visibility: response.data.visibility,
          content: response.data.content,
          time: 'now',
          timestamp: response.data.createdAt || response.data.created_at || new Date().toISOString(), // Include timestamp
          reactions: {},
          photoUri: response.data.type === 'photo' ? (response.data.mediaUrl || response.data.media_url) : undefined,
          audioUri: response.data.type === 'audio' ? (response.data.mediaUrl || response.data.media_url) : undefined,
          mediaUrl: response.data.mediaUrl || response.data.media_url, // Include media for all types
          actionTitle: response.data.actionTitle || response.data.action_title,
          goal: response.data.goalTitle || response.data.goal_title,
          streak: response.data.streak,
          goalColor: response.data.goalColor || response.data.goal_color
        };
        
        console.log('🔄 [FEED] Replacing optimistic post', optimisticPost.id, 'with real post', realPost.id);
        set((s) => {
          if (realPost.visibility === 'circle') {
            const updatedFeed = s.circleFeed.map(p => 
              p.id === optimisticPost.id ? realPost : p
            );
            console.log('📊 [FEED] Circle feed after replacement:', updatedFeed.length, 'posts');
            // Clear cache for this feed so next refresh gets fresh data
            setTimeout(() => memoryCache.clear('feed:circle'), 100);
            return { 
              circleFeed: updatedFeed
            };
          }
          const updatedFeed = s.followFeed.map(p => 
            p.id === optimisticPost.id ? realPost : p
          );
          console.log('📊 [FEED] Follow feed after replacement:', updatedFeed.length, 'posts');
          // Clear cache for this feed so next refresh gets fresh data
          setTimeout(() => memoryCache.clear('feed:follow'), 100);
          return { 
            followFeed: updatedFeed
          };
        });
      } else {
        // Remove optimistic post on failure
        set((s) => {
          if (optimisticPost.visibility === 'circle') {
            return { circleFeed: s.circleFeed.filter(p => p.id !== optimisticPost.id) };
          }
          return { followFeed: s.followFeed.filter(p => p.id !== optimisticPost.id) };
        });
        set({ feedError: response.error || 'Failed to create post' });
      }
    } catch (error: any) {
      // Remove optimistic post on error
      set((s) => {
        if (optimisticPost.visibility === 'circle') {
          return { circleFeed: s.circleFeed.filter(p => p.id !== optimisticPost.id) };
        }
        return { followFeed: s.followFeed.filter(p => p.id !== optimisticPost.id) };
      });
      set({ feedError: error.message || 'Failed to create post' });
      console.error('Failed to create post:', error);
    }
  },
  
  addComment: async (postId, content, which) => {
    // Get current user from auth state
    const currentUser = get().user;

    // Create optimistic comment
    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      postId,
      user: 'You',
      userAvatar: currentUser?.avatar || '👤',
      avatar: currentUser?.avatar || '👤',
      content,
      time: 'now',
      timestamp: new Date().toISOString(),
    };

    // Optimistically update BOTH feeds immediately (post could be in both)
    set((s) => ({
      circleFeed: s.circleFeed.map(p =>
        p.id === postId
          ? {
              ...p,
              comments: [...(p.comments || []), optimisticComment],
              commentCount: (p.commentCount || 0) + 1,
            }
          : p
      ),
      followFeed: s.followFeed.map(p =>
        p.id === postId
          ? {
              ...p,
              comments: [...(p.comments || []), optimisticComment],
              commentCount: (p.commentCount || 0) + 1,
            }
          : p
      )
    }));
    
    try {
      // Send to backend
      console.log('💬 Sending comment to backend:', { postId, content });
      const response = await backendService.addComment(postId, content);
      
      if (response.success && response.data) {
        // Transform backend comment to our format
        const realComment: Comment = {
          id: response.data.id,
          postId: response.data.post_id,
          user: 'You',
          avatar: response.data.profiles?.avatar_url || currentUser?.avatar || '👤',
          content: response.data.content,
          time: 'now',
          timestamp: response.data.created_at,
        };
        
        // Replace optimistic comment with real comment in BOTH feeds
        set((s) => ({
          circleFeed: s.circleFeed.map(p =>
            p.id === postId
              ? {
                  ...p,
                  comments: (p.comments || [])
                    .map(c => c.id === optimisticComment.id ? realComment : c),
                }
              : p
          ),
          followFeed: s.followFeed.map(p =>
            p.id === postId
              ? {
                  ...p,
                  comments: (p.comments || [])
                    .map(c => c.id === optimisticComment.id ? realComment : c),
                }
              : p
          )
        }));
        
        console.log('✅ Comment saved successfully');
        
        // Update in-memory cache
        const cacheKey = `comments:${postId}`;
        const cached = memoryCache.get<Comment[]>(cacheKey) || [];
        memoryCache.set(cacheKey, [...cached, realComment], 300); // Cache for 5 minutes
      } else {
        throw new Error(response.error || 'Failed to add comment');
      }
    } catch (error) {
      // Revert optimistic update on error in BOTH feeds
      set((s) => ({
        circleFeed: s.circleFeed.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: (p.comments || []).filter(c => c.id !== optimisticComment.id),
                commentCount: Math.max(0, (p.commentCount || 0) - 1),
              }
            : p
        ),
        followFeed: s.followFeed.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: (p.comments || []).filter(c => c.id !== optimisticComment.id),
                commentCount: Math.max(0, (p.commentCount || 0) - 1),
              }
            : p
        )
      }));
      console.error('❌ Failed to add comment:', error);
    }
  },
  
  toggleLike: async (postId, which) => {
    const currentFeed = which === 'circle' ? 'circleFeed' : 'followFeed';
    
    // Get current state
    const currentState = get();
    const post = currentState[currentFeed].find(p => p.id === postId);
    if (!post) return;
    
    const wasLiked = post.userLiked || false;
    const currentCount = post.likeCount || 0;
    
    // Optimistic update
    set((s) => ({
      [currentFeed]: s[currentFeed].map(p => 
        p.id === postId 
          ? {
              ...p,
              userLiked: !wasLiked,
              likeCount: wasLiked ? Math.max(0, currentCount - 1) : currentCount + 1
            }
          : p
      )
    }));
    
    // Haptic feedback
    if (typeof window !== 'undefined' && (window as any).Haptics) {
      (window as any).Haptics.impactAsync((window as any).Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      // Call backend
      console.log('🔥 Toggling like for post:', postId);
      const response = await backendService.toggleLike(postId);
      
      if (response.success && response.data) {
        // Update with real data from backend
        set((s) => ({
          [currentFeed]: s[currentFeed].map(p => 
            p.id === postId 
              ? {
                  ...p,
                  userLiked: response.data.liked,
                  likeCount: response.data.like_count
                }
              : p
          )
        }));
        
        // Update cache
        const cacheKey = `likes:${postId}`;
        memoryCache.set(cacheKey, response.data, 60); // Cache for 1 minute
        
        console.log(`✅ Like ${response.data.action} successfully`);
      } else {
        throw new Error(response.error || 'Failed to toggle like');
      }
    } catch (error) {
      // Revert optimistic update on error
      set((s) => ({
        [currentFeed]: s[currentFeed].map(p => 
          p.id === postId 
            ? {
                ...p,
                userLiked: wasLiked,
                likeCount: currentCount
              }
            : p
        )
      }));
      console.error('❌ Failed to toggle like:', error);
    }
  },
  
  loadComments: async (postId, which) => {
    try {
      const currentFeed = which === 'circle' ? 'circleFeed' : 'followFeed';
      const cacheKey = `comments:${postId}`;
      const currentUser = get().user;
      
      // Helper function for time formatting
      const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        
        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        return `${days}d`;
      };
      
      // Check cache first
      const cached = memoryCache.get<Comment[]>(cacheKey);
      if (cached) {
        console.log('💾 Using cached comments for post:', postId);
        set((s) => ({
          [currentFeed]: s[currentFeed].map(p => 
            p.id === postId 
              ? { ...p, comments: cached }
              : p
          )
        }));
        return;
      }
      
      // Fetch from backend
      console.log('📥 Loading comments from backend for post:', postId);
      const response = await backendService.getComments(postId);
      
      if (response.success && response.data) {
        // Transform backend comments to our format
        const comments: Comment[] = response.data.map((c: any) => ({
          id: c.id,
          postId: c.post_id,
          user: c.user_id === currentUser?.id ? 'You' : (c.profiles?.name || 'Anonymous'),
          avatar: c.profiles?.avatar_url || '👤',
          content: c.content,
          time: timeAgo(c.created_at),
          timestamp: c.created_at,
        }));
        
        // Update state
        set((s) => ({
          [currentFeed]: s[currentFeed].map(p => 
            p.id === postId 
              ? { ...p, comments, commentCount: comments.length }
              : p
          )
        }));
        
        // Cache the comments
        memoryCache.set(cacheKey, comments, 300); // Cache for 5 minutes
        
        console.log(`✅ Loaded ${comments.length} comments for post ${postId}`);
      }
    } catch (error) {
      console.error('❌ Failed to load comments:', error);
    }
  },
  
  // Circle actions
  joinCircle: async (inviteCode) => {
    console.log('Store: Joining circle with code:', inviteCode);
    try {
      const result = await backendService.joinCircleWithCode(inviteCode);
      console.log('Store: Join circle result:', result);
      
      if (result.success) {
        console.log('Successfully joined circle, loading data...');
        
        // CRITICAL: Clear feed cache when joining a new circle
        memoryCache.clear('feed:circle');
        memoryCache.clear('feed:follow');
        
        // CRITICAL: Refresh user profile to get updated circle_id
        const profileResult = await backendService.getProfile();
        if (profileResult.success && profileResult.data) {
          // Update the user in auth state with new circle_id
          const currentUser = get().user;
          if (currentUser) {
            set({ 
              user: { 
                ...currentUser, 
                circleId: profileResult.data.circle_id 
              } 
            });
          }
        }
        
        // Load circle data after joining
        await get().loadCircleData();
        // Refresh feeds to show circle content
        await get().fetchFeeds();
        return true;
      }
      console.log('Join circle failed:', result.error);
      return false;
    } catch (error) {
      console.error('Failed to join circle:', error);
      return false;
    }
  },
  
  loadCircleData: async () => {
    try {
      const circleResult = await backendService.getMyCircle();
      if (circleResult.success && circleResult.data) {
        const circle = circleResult.data;
        
        // Load circle members
        const membersResult = await backendService.getCircleMembers(circle.id);
        const members = membersResult.success ? membersResult.data : [];
        
        set({
          circleId: circle.id,
          circleName: circle.name,
          inviteCode: circle.invite_code,
          circleMembers: members || []
        });
      }
    } catch (error) {
      console.error('Failed to load circle data:', error);
    }
  },
  
  // Following actions
  followUser: async (userId) => {
    try {
      await backendService.followUser(userId);
      // Clear cache to force fresh feed fetch
      memoryCache.clear('feed:follow');
      memoryCache.clear('feed:circle');
      // Update following list
      await get().loadFollowing();
      // Refresh feeds to show their content (force refresh)
      await get().fetchFeeds(true);
    } catch (error) {
      console.error('Failed to follow user:', error);
    }
  },
  
  unfollowUser: async (userId) => {
    try {
      await backendService.unfollowUser(userId);
      // Clear cache to force fresh feed fetch
      memoryCache.clear('feed:follow');
      memoryCache.clear('feed:circle');
      // Update following list
      await get().loadFollowing();
      // Refresh feeds (force refresh)
      await get().fetchFeeds(true);
    } catch (error) {
      console.error('Failed to unfollow user:', error);
    }
  },
  
  loadFollowing: async () => {
    try {
      const [followingResult, followersResult] = await Promise.all([
        backendService.getFollowing(),
        backendService.getFollowers()
      ]);
      
      set({
        following: followingResult.success ? followingResult.data : [],
        followers: followersResult.success ? followersResult.data : []
      });
    } catch (error) {
      console.error('Failed to load following data:', error);
    }
  },
});