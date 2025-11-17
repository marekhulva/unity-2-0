import { StateCreator } from 'zustand';
import { backendService } from '../../services/backend.service';
import { shouldActionAppearToday } from '../../utils/actionScheduling';

export type ActionItem = { 
  id: string; 
  title: string; 
  goalId?: string;  // Link to specific goal
  goalTitle?: string; 
  goalColor?: string;
  type:'commitment'|'performance'|'one-time'; 
  frequency?: string; // e.g., "daily", "three_per_week", "weekly"
  scheduled_days?: string[]; // For weekly and 3x/week: ['monday', 'wednesday', 'friday']
  created_at?: string; // For every_other_day calculation
  time?: string; 
  streak: number; 
  done?: boolean;
  // Challenge-related fields
  challengeId?: string;        // If from a challenge
  challengeActivityId?: string; // The specific activity in challenge
  challengeParticipantId?: string; // To track completions
  challengeName?: string;      // For display (e.g., "Jing Challenge")
  isFromChallenge?: boolean;   // Quick flag for UI
  challengeIcon?: string;      // Activity icon from challenge
};

export type CompletedAction = {
  id: string;
  actionId: string;
  title: string;
  goalId?: string;  // Link to specific goal
  goalTitle?: string;
  completedAt: Date;
  isPrivate: boolean;
  streak: number;
  type: 'check' | 'photo' | 'audio' | 'milestone';
  mediaUrl?: string;
  category?: string;
};

export type DailySlice = {
  actions: ActionItem[];
  completedActions: CompletedAction[];
  actionsLoading: boolean;
  actionsError: string | null;
  fetchDailyActions: () => Promise<void>;
  toggleAction: (id: string) => Promise<void>;
  addAction: (a: Partial<ActionItem>) => Promise<void>;
  updateAction: (id: string, updates: Partial<ActionItem>) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
  addCompletedAction: (ca: CompletedAction) => void;
  clearCompletedActions: () => void;
  createCelebrationPost: () => Promise<void>;
};

export const createDailySlice: StateCreator<DailySlice> = (set, get) => ({
  actions: [],
  completedActions: [],
  actionsLoading: false,
  actionsError: null,
  
  fetchDailyActions: async () => {
    console.log('🟦 [ACTIONS] fetchDailyActions called');
    set({ actionsLoading: true, actionsError: null });
    try {
      // Clear any stale cache to ensure fresh data
      console.log('🟦 [ACTIONS] Fetching fresh data from backend');
      
      // Fetch regular daily actions
      const response = await backendService.getDailyActions();
      const regularActions: ActionItem[] = [];
      
      if (response.success) {
        console.log('🟦 [ACTIONS] Response received:', response.data?.length || 0, 'regular actions');

        // Map actions and filter based on frequency
        const mappedActions = (response.data || [])
          .map((a: any) => {
            return {
              id: a.id,
              title: a.title,
              goalId: a.goalId || a.goal?.id,  // Include goalId
              goalTitle: a.goal?.title,
              goalColor: a.goal?.color,
              type: 'commitment' as const,
              frequency: a.frequency || 'daily',
              scheduled_days: a.scheduled_days || a.scheduledDays,
              created_at: a.created_at,
              time: a.time,
              streak: 0,
              done: a.completed || false,  // Map from 'completed' field in database
              // PRESERVE COMPLETION TIMESTAMPS FOR PROGRESS PAGE!
              completed_at: a.completed_at,
              completedAt: a.completedAt,
              completed: a.completed  // Keep original completed status too
            };
          })
          .filter((action: any) => {
            // Filter actions based on their frequency
            const shouldAppear = shouldActionAppearToday({
              frequency: action.frequency,
              scheduledDays: action.scheduled_days,
              created_at: action.created_at
            });

            if (!shouldAppear) {
              console.log(`🔽 [ACTIONS] Filtering out "${action.title}" - not scheduled for today (${action.frequency})`);
            }

            return shouldAppear;
          });

        console.log(`🟦 [ACTIONS] After frequency filtering: ${mappedActions.length} actions for today`);
        regularActions.push(...mappedActions);
      }
      
      // Fetch challenge activities (already filtered - linked ones are excluded)
      console.log('🏆 [ACTIONS] Fetching challenge activities...');
      const challengeResponse = await backendService.getUserChallengeActivities();
      console.log('🏆 [ACTIONS] Challenge response:', challengeResponse);
      console.log('🏆 [ACTIONS] Raw challenge data:', JSON.stringify(challengeResponse.data, null, 2));
      const challengeActions: ActionItem[] = [];
      
      // Also get linked activities to merge with regular actions
      const linkedResponse = await backendService.getLinkedChallengeActivities();
      console.log('🔗 [ACTIONS] Linked activities:', linkedResponse);
      
      // Process linked activities - merge challenge info into regular actions
      if (linkedResponse.success && linkedResponse.data) {
        linkedResponse.data.forEach((link: any) => {
          const regularActionIndex = regularActions.findIndex(a => a.id === link.linkedActionId);
          if (regularActionIndex !== -1) {
            console.log(`🔗 [ACTIONS] Merging challenge info into action ${link.linkedActionId}`);
            regularActions[regularActionIndex] = {
              ...regularActions[regularActionIndex],
              // Add challenge fields to the existing action
              isFromChallenge: true,
              challengeId: link.challengeId,
              challengeActivityId: link.challengeActivityId,
              challengeParticipantId: link.participantId,
              challengeName: link.challengeName
            };
          }
        });
      }
      
      if (challengeResponse.success && challengeResponse.data) {
        console.log('🏆 [ACTIONS] Found', challengeResponse.data.length, 'non-linked challenge activities');
        challengeResponse.data.forEach((activity: any, index: number) => {
          console.log(`📍 [ACTIONS] Activity ${index}:`, {
            id: activity.id,
            title: activity.title || activity.display_name,
            scheduledTime: activity.scheduledTime,
            allFields: Object.keys(activity)
          });
        });
        
        // Check which activities are already completed today
        const todayCompletions = await backendService.getTodayChallengeCompletions();
        const completedActivityIds = new Set(
          todayCompletions.data?.map((c: any) => c.activity_id) || []
        );
        console.log('✅ [ACTIONS] Already completed today:', completedActivityIds);
        
        // Get participant data for activity times
        const participations = await backendService.getUserChallengeParticipations();
        const activityTimeMappings: Map<string, string> = new Map();
        
        if (participations.success && participations.data) {
          participations.data.forEach((participation: any) => {
            // Get activity times (skip link mappings)
            console.log('⏰ [ACTIONS] Participation activity_times:', participation.activity_times);
            if (participation.activity_times && Array.isArray(participation.activity_times)) {
              participation.activity_times.forEach((timeEntry: any) => {
                // Skip link mappings, only get actual times
                if (!timeEntry.is_link && timeEntry.activity_id && timeEntry.scheduled_time) {
                  activityTimeMappings.set(timeEntry.activity_id, timeEntry.scheduled_time);
                  console.log(`⏰ [ACTIONS] Mapped time for activity ${timeEntry.activity_id}: ${timeEntry.scheduled_time}`);
                }
              });
            }
          });
        }
        console.log('⏰ [ACTIONS] Activity time mappings:', activityTimeMappings);
        
        const mappedChallengeActions = challengeResponse.data.map((activity: any) => {
          console.log('🔍 [ACTIONS] Processing challenge activity:', {
            title: activity.display_name || activity.title,
            scheduledTime: activity.scheduledTime,
            id: activity.id
          });
          
          // All activities here are already non-linked (filtered by the service)
          console.log('🎯 [ACTIONS] Creating challenge action from activity:', activity);
          
          // Get the scheduled time from our mappings
          const scheduledTime = activityTimeMappings.get(activity.id);
          console.log('⏰ [ACTIONS] Scheduled time for this activity:', scheduledTime);
          
          const actionItem = {
            id: `challenge-${activity.challengeId}-${activity.id}`, // Make unique per challenge
            title: activity.display_name || activity.title || 'Unknown Activity', // Use display_name field
            type: 'commitment' as const,
            frequency: 'Daily',
            time: scheduledTime, // Use the time from activity_times mapping
            streak: 0,
            done: completedActivityIds.has(activity.id), // Check if already done today
            // Challenge-specific fields
            isFromChallenge: true,
            challengeId: activity.challengeId,
            challengeActivityId: activity.id,
            challengeParticipantId: activity.participantId,
            challengeName: activity.challengeName,
            challengeIcon: activity.emoji || activity.icon // Use emoji field
          };
          
          console.log('📦 [ACTIONS] Final action item:', actionItem);
          return actionItem;
        }).filter(Boolean); // Remove null entries (linked activities)
        
        challengeActions.push(...mappedChallengeActions);
      }
      
      // Merge all actions (linked activities are already merged into regular actions)
      const allActions = [...regularActions, ...challengeActions];
      console.log('🟢 [ACTIONS] Total actions:', allActions.length, '(', regularActions.length, 'regular +', challengeActions.length, 'challenge)');
      
      set({ actions: allActions, actionsLoading: false });
      console.log('🟢 [ACTIONS] Daily actions loaded successfully');
      
      // Also fetch today's completed actions
      console.log('🟦 [ACTIONS] Fetching today\'s completed actions...');
      const completedResponse = await backendService.getTodaysCompletedActions();
      if (completedResponse.success) {
        console.log('🟢 [ACTIONS] Found', completedResponse.data?.length || 0, 'completed actions today');
        set({ completedActions: completedResponse.data || [] });
      }
    } catch (error: any) {
      console.error('🔴 [ACTIONS] Error in fetchDailyActions:', error);
      set({ actionsError: error.message, actionsLoading: false });
    }
  },
  
  toggleAction: async (id) => {
    console.log('🟦 [ACTIONS] toggleAction called for ID:', id);

    // Find the action to check if it's from a challenge
    const action = get().actions.find(a => a.id === id);
    if (!action) {
      console.error('🔴 [ACTIONS] Action not found:', id);
      return;
    }

    const isCurrentlyDone = action.done;
    console.log(`🟦 [ACTIONS] Action "${action.title}" is currently ${isCurrentlyDone ? 'DONE' : 'NOT DONE'}`);

    try {
      // Handle unchecking (completing -> incomplete)
      if (isCurrentlyDone) {
        console.log('🔄 [ACTIONS] Uncompleting action:', action.title);
        const response = await backendService.uncompleteAction(id);

        if (response.success) {
          set((s) => ({
            actions: s.actions.map(a =>
              a.id === id
                ? { ...a, done: false }
                : a
            )
          }));
          console.log('🟢 [ACTIONS] Action uncompleted successfully');
        } else {
          console.error('🔴 [ACTIONS] Failed to uncomplete action:', response);
        }
        return;
      }

      // Handle checking (incomplete -> completing)
      // Handle challenge activities differently
      if (action.isFromChallenge && action.challengeParticipantId && action.challengeActivityId) {
        console.log('🏆 [ACTIONS] Completing challenge activity:', action.title);

        // Record challenge completion
        const response = await backendService.recordChallengeActivity(
          action.challengeParticipantId,
          action.challengeActivityId
        );

        if (response.success) {
          // Update local state
          set((s) => ({
            actions: s.actions.map(a =>
              a.id === id
                ? { ...a, done: true, streak: a.streak + 1 }
                : a
            )
          }));
          console.log('🟢 [ACTIONS] Challenge activity completed successfully');
        } else {
          console.error('🔴 [ACTIONS] Challenge completion failed:', response.error);
        }
      } else {
        // Regular action completion
        const response = await backendService.completeAction(id);
        console.log('🟦 [ACTIONS] Complete action response:', response);

        if (response.success) {
          set((s) => {
            const updatedActions = s.actions.map(a =>
              a.id === id
                ? { ...a, done: true, streak: a.streak + 1 }
                : a
            );

            // Check if all actions are now complete
            const allComplete = updatedActions.every(a => a.done);
            if (allComplete && updatedActions.length > 0) {
              console.log('🎉 [ACTIONS] ALL DAILY ACTIONS COMPLETE! Triggering celebration!');
              // Trigger celebration post
              get().createCelebrationPost();
            }

            return { actions: updatedActions };
          });
          console.log('🟢 [ACTIONS] Action marked as done locally');

          // If this regular action is linked to a challenge activity, complete that too
          if (action.challengeParticipantId && action.challengeActivityId) {
            console.log('🔗 [ACTIONS] This action is linked to challenge, completing challenge activity too');
            await backendService.recordChallengeActivity(
              action.challengeParticipantId,
              action.challengeActivityId
            );
          }
        } else {
          console.error('🔴 [ACTIONS] Failed to complete action:', response);
        }
      }
    } catch (error) {
      console.error('🔴 [ACTIONS] Failed to toggle action:', error);
    }
  },
  
  addAction: async (actionData) => {
    console.log('🟦 [ACTIONS] addAction called:', actionData.title);
    try {
      const response = await backendService.createAction({
        title: actionData.title || '',
        time: actionData.time,
        goalId: actionData.goalId,  // Pass goalId from action data
        frequency: actionData.frequency || 'daily',
        scheduled_days: actionData.scheduled_days
      });
      
      if (response.success && response.data) {
        const newAction: ActionItem = {
          id: response.data.id,
          title: response.data.title,
          goalId: response.data.goalId || response.data.goal?.id,  // Include goalId
          goalTitle: response.data.goal?.title,
          goalColor: response.data.goal?.color,
          type: 'commitment',
          frequency: response.data.frequency || 'daily',
          scheduled_days: response.data.scheduled_days,
          time: response.data.time,
          streak: 0,
          done: false
        };
        console.log('🟢 [ACTIONS] Action added to store:', newAction.title, 'with goalId:', newAction.goalId);
        
        // Prevent duplicates - check if action already exists
        set((s) => {
          const existingAction = s.actions.find(a => a.id === newAction.id);
          if (existingAction) {
            console.log('🟡 [ACTIONS] Action already exists, not adding duplicate');
            return { actions: s.actions };
          }
          return { actions: [...s.actions, newAction] };
        });
      } else {
        console.error('🔴 [ACTIONS] Failed to add action:', response.error);
      }
    } catch (error) {
      console.error('🔴 [ACTIONS] Exception adding action:', error);
    }
  },

  updateAction: async (id, updates) => {
    set({ actionsLoading: true, actionsError: null });
    try {
      const response = await backendService.updateAction(id, {
        title: updates.title,
        time: updates.time,
        goalId: updates.goalId  // Include goalId in updates
      });
      
      if (response.success && response.data) {
        set((state) => ({
          actions: state.actions.map(a => 
            a.id === id ? { 
              ...a, 
              title: response.data.title,
              time: response.data.time,
              goalTitle: response.data.goal?.title 
            } : a
          ),
          actionsLoading: false
        }));
      } else {
        set({ actionsError: response.error, actionsLoading: false });
      }
    } catch (error: any) {
      set({ actionsError: error.message, actionsLoading: false });
    }
  },

  deleteAction: async (id) => {
    set({ actionsLoading: true, actionsError: null });
    try {
      const response = await backendService.deleteAction(id);
      if (response.success) {
        set((state) => ({
          actions: state.actions.filter(a => a.id !== id),
          actionsLoading: false
        }));
      } else {
        set({ actionsError: response.error, actionsLoading: false });
      }
    } catch (error: any) {
      set({ actionsError: error.message, actionsLoading: false });
    }
  },
  
  addCompletedAction: (ca) => set((s) => ({ 
    completedActions: [...s.completedActions, ca] 
  })),
  
  clearCompletedActions: () => set({ completedActions: [] }),
  
  createCelebrationPost: async () => {
    console.log('🎊 [CELEBRATION] Creating celebration post for 100% completion!');
    try {
      // Get user info from auth slice
      const user = (get() as any).user;
      if (!user) return;
      
      // Get unique goals from completed actions
      const completedActions = get().actions.filter(a => a.done);
      const uniqueGoals = new Map();
      
      completedActions.forEach(action => {
        if (action.goalId && action.goalTitle && !uniqueGoals.has(action.goalId)) {
          uniqueGoals.set(action.goalId, {
            title: action.goalTitle,
            color: action.goalColor || '#FFD700'
          });
        }
      });
      
      // Create a special celebration post
      const celebrationPost = {
        type: 'celebration',
        content: `🎉 ${user.name || user.email} crushed today! 100% of daily actions complete! 🏆`,
        visibility: 'circle', // Share with circle
        is_celebration: true,
        celebration_type: 'daily_100',
        metadata: {
          userName: user.name || user.email,
          userAvatar: user.avatar,
          completionTime: new Date().toISOString(),
          actionCount: get().actions.length,
          goals: Array.from(uniqueGoals.values())
        }
      };
      
      // Post to social feed
      const response = await backendService.createPost(celebrationPost);
      
      if (response.success) {
        console.log('🎉 [CELEBRATION] Celebration post created successfully!');
        // Refresh the social feed to show the celebration
        const socialSlice = (get() as any);
        if (socialSlice.fetchFeeds) {
          await socialSlice.fetchFeeds();
        }
      }
    } catch (error) {
      console.error('🔴 [CELEBRATION] Failed to create celebration post:', error);
    }
  },
});