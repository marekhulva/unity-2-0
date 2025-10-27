// Challenge Slice
// Manages challenge state and actions

import { StateCreator } from 'zustand';
import { backendService } from '../../services/backend.service';

export interface Challenge {
  id: string;
  circle_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'completed';
  min_activities: number;
  max_activities: number;
  required_daily: number;
  icon?: string;
  color?: string;
  challenge_activities?: ChallengeActivity[];
}

export interface ChallengeActivity {
  id: string;
  challenge_id: string;
  title: string;
  description?: string;
  icon?: string;
  canonical_name?: string;
  order_index: number;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  selected_activity_ids: string[];
  linked_action_ids?: string[];
  total_completions: number;
  consistency_percentage: number;
  current_streak: number;
  joined_at: string;
  profiles?: {
    id: string;
    name: string;
    username: string;
    avatar_url: string;
  };
}

export interface LeaderboardEntry extends ChallengeParticipant {
  rank: number;
}

export interface GroupStats {
  groupConsistency: number;
  participantCount: number;
  rating: string;
}

export type ChallengeSlice = {
  // State
  circleChallenges: Challenge[];
  currentChallenge: Challenge | null;
  myParticipation: ChallengeParticipant | null;
  leaderboard: LeaderboardEntry[];
  groupStats: GroupStats | null;
  challengesLoading: boolean;
  challengeError: string | null;
  
  // Actions
  fetchCircleChallenges: (circleId: string) => Promise<void>;
  loadChallenge: (challengeId: string) => Promise<void>;
  joinChallenge: (challengeId: string, selectedActivityIds: string[]) => Promise<boolean>;
  loadLeaderboard: (challengeId: string) => Promise<void>;
  loadGroupStats: (challengeId: string) => Promise<void>;
  recordActivity: (participantId: string, activityId: string, linkedActionId?: string) => Promise<boolean>;
  getTodayCompletions: (participantId: string) => Promise<any[]>;
  checkActivityMatch: (activityTitle: string, userId: string) => Promise<any>;
  linkActivity: (participantId: string, actionId: string) => Promise<boolean>;
  clearChallengeData: () => void;
};

export const createChallengeSlice: StateCreator<ChallengeSlice> = (set, get) => ({
  // Initial state
  circleChallenges: [],
  currentChallenge: null,
  myParticipation: null,
  leaderboard: [],
  groupStats: null,
  challengesLoading: false,
  challengeError: null,
  
  // Fetch all challenges for a circle
  fetchCircleChallenges: async (circleId) => {
    console.log('🏆 [CHALLENGES] Fetching challenges for circle:', circleId);
    set({ challengesLoading: true, challengeError: null });
    
    try {
      const response = await backendService.getCircleChallenges(circleId);
      
      if (response.success && response.data) {
        // Update status based on dates
        const now = new Date();
        const challenges = response.data.map((c: Challenge) => {
          const start = new Date(c.start_date);
          const end = new Date(c.end_date);
          
          let status: Challenge['status'] = c.status;
          if (now < start) status = 'upcoming';
          else if (now > end) status = 'completed';
          else status = 'active';
          
          return { ...c, status };
        });
        
        set({ 
          circleChallenges: challenges,
          challengesLoading: false 
        });
        
        console.log('🟢 [CHALLENGES] Loaded challenges:', challenges.length);
      } else {
        throw new Error('Failed to fetch challenges');
      }
    } catch (error) {
      console.error('🔴 [CHALLENGES] Error:', error);
      set({ 
        challengeError: error.message || 'Failed to load challenges',
        challengesLoading: false 
      });
    }
  },
  
  // Load a specific challenge with details
  loadChallenge: async (challengeId) => {
    console.log('🏆 [CHALLENGES] Loading challenge:', challengeId);
    set({ challengesLoading: true });
    
    try {
      const [challengeRes, participationRes] = await Promise.all([
        backendService.getChallenge(challengeId),
        backendService.getMyParticipation(challengeId)
      ]);
      
      if (challengeRes.success) {
        set({ 
          currentChallenge: challengeRes.data,
          myParticipation: participationRes.data || null,
          challengesLoading: false
        });
      }
    } catch (error) {
      console.error('🔴 [CHALLENGES] Error loading challenge:', error);
      set({ challengesLoading: false });
    }
  },
  
  // Join a challenge with selected activities
  joinChallenge: async (challengeId, selectedActivityIds) => {
    console.log('🏆 [CHALLENGES] Joining challenge with activities:', selectedActivityIds);
    set({ challengesLoading: true });
    
    try {
      const response = await backendService.joinChallenge(challengeId, selectedActivityIds);
      
      if (response.success) {
        // Reload challenge data
        await get().loadChallenge(challengeId);
        await get().loadLeaderboard(challengeId);
        
        console.log('🟢 [CHALLENGES] Successfully joined challenge');
        return true;
      } else {
        console.error('🔴 [CHALLENGES] Failed to join:', response.error);
        set({ 
          challengeError: response.error || 'Failed to join challenge',
          challengesLoading: false
        });
        return false;
      }
    } catch (error) {
      console.error('🔴 [CHALLENGES] Error joining challenge:', error);
      set({ 
        challengeError: error.message || 'Failed to join challenge',
        challengesLoading: false
      });
      return false;
    }
  },
  
  // Load leaderboard for a challenge
  loadLeaderboard: async (challengeId) => {
    console.log('🏆 [CHALLENGES] Loading leaderboard');
    
    try {
      const response = await backendService.getChallengeLeaderboard(challengeId);
      
      if (response.success && response.data) {
        // Calculate ranks
        const leaderboard = response.data
          .sort((a, b) => {
            // Sort by consistency, then total completions
            if (b.consistency_percentage !== a.consistency_percentage) {
              return b.consistency_percentage - a.consistency_percentage;
            }
            return b.total_completions - a.total_completions;
          })
          .map((participant, index) => ({
            ...participant,
            rank: index + 1
          }));
        
        set({ leaderboard });
        console.log('🟢 [CHALLENGES] Leaderboard loaded:', leaderboard.length, 'participants');
      }
    } catch (error) {
      console.error('🔴 [CHALLENGES] Error loading leaderboard:', error);
    }
  },
  
  // Load group statistics
  loadGroupStats: async (challengeId) => {
    console.log('🏆 [CHALLENGES] Loading group stats');
    
    try {
      const response = await backendService.getGroupStats(challengeId);
      
      if (response.success && response.data) {
        set({ groupStats: response.data });
        console.log('🟢 [CHALLENGES] Group stats:', response.data);
      }
    } catch (error) {
      console.error('🔴 [CHALLENGES] Error loading group stats:', error);
    }
  },
  
  // Record activity completion
  recordActivity: async (participantId, activityId, linkedActionId) => {
    console.log('🏆 [CHALLENGES] Recording activity completion');
    
    try {
      const response = await backendService.recordChallengeActivity(
        participantId,
        activityId,
        linkedActionId
      );
      
      if (response.success) {
        // Reload participation and leaderboard
        const { currentChallenge } = get();
        if (currentChallenge) {
          await get().loadChallenge(currentChallenge.id);
          await get().loadLeaderboard(currentChallenge.id);
          await get().loadGroupStats(currentChallenge.id);
        }
        
        console.log('🟢 [CHALLENGES] Activity recorded successfully');
        return true;
      } else {
        console.log('⚠️ [CHALLENGES]', response.error);
        return false;
      }
    } catch (error) {
      console.error('🔴 [CHALLENGES] Error recording activity:', error);
      return false;
    }
  },
  
  // Get today's completions for a participant
  getTodayCompletions: async (participantId) => {
    console.log('📅 [CHALLENGES] Fetching today\'s completions for participant:', participantId);
    
    try {
      const response = await backendService.getTodayCompletions(participantId);
      
      if (response.success) {
        console.log('✅ [CHALLENGES] Found', response.data?.length || 0, 'completions today');
        return response.data || [];
      } else {
        console.error('🔴 [CHALLENGES] Failed to fetch today\'s completions:', response.error);
        return [];
      }
    } catch (error) {
      console.error('🔴 [CHALLENGES] Exception fetching today\'s completions:', error);
      return [];
    }
  },
  
  // Check if activity matches existing habit
  checkActivityMatch: async (activityTitle, userId) => {
    console.log('🔍 [CHALLENGES] Checking for activity match:', activityTitle);
    
    try {
      const response = await backendService.findActivityMatches(activityTitle, userId);
      
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('🔴 [CHALLENGES] Error checking match:', error);
      return null;
    }
  },
  
  // Link challenge activity to existing action
  linkActivity: async (participantId, actionId) => {
    console.log('🔗 [CHALLENGES] Linking activity to action:', actionId);
    
    try {
      const response = await backendService.linkActivityToAction(participantId, actionId);
      
      if (response.success) {
        console.log('🟢 [CHALLENGES] Activity linked successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('🔴 [CHALLENGES] Error linking activity:', error);
      return false;
    }
  },
  
  // Clear challenge data
  clearChallengeData: () => {
    set({
      circleChallenges: [],
      currentChallenge: null,
      myParticipation: null,
      leaderboard: [],
      groupStats: null,
      challengeError: null
    });
  }
});