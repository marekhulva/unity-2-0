// Supabase Challenge Service
// Handles all challenge-related database operations

import { supabase } from './supabase.service';

export interface Challenge {
  id: string;
  circle_id: string;
  name: string;  // Your schema uses 'name'
  title?: string;  // Keep for compatibility
  description: string;
  start_date: string;
  end_date: string;
  is_active: boolean;  // Your schema uses boolean
  status?: 'upcoming' | 'active' | 'completed';  // Computed from dates
  config?: {  // Your schema stores settings in JSONB
    min_activities?: number;
    max_activities?: number;
    required_daily?: number;
    scoring_type?: string;
    icon?: string;
    color?: string;
    status?: string;
  };
  // Fallback for direct properties
  min_activities?: number;
  max_activities?: number;
  required_daily?: number;
  icon?: string;
  created_at: string;
  created_by?: string;
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
}

export interface ChallengeCompletion {
  id: string;
  participant_id: string;
  activity_id: string;
  completed_at: string;
  completion_date: string;
}

export interface ActivityMapping {
  id: string;
  canonical_name: string;
  display_name: string;
  aliases: string[];
  category: string;
  default_icon: string;
}

class SupabaseChallengeService {
  // Export supabase for auth access
  supabase = supabase;
  // Get all challenges for a circle
  async getCircleChallenges(circleId: string) {
    if (__DEV__) console.log('🏆 [CHALLENGES] Fetching challenges for circle:', circleId);
    
    // First fetch challenges without join to avoid relationship errors
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('circle_id', circleId)
      .order('start_date', { ascending: false });
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching challenges:', error);
      throw error;
    }
    
    if (__DEV__) console.log('🟢 [CHALLENGES] Found challenges:', data?.length || 0);
    
    // If we have challenges, map config and fetch related data
    if (data && data.length > 0) {
      for (const challenge of data) {
        // Map config values to top-level properties for easier access
        if (challenge.config) {
          challenge.min_activities = challenge.config.min_activities || 3;
          challenge.max_activities = challenge.config.max_activities || 5;
          challenge.required_daily = challenge.config.required_daily || 3;
          challenge.icon = challenge.config.icon;
          challenge.title = challenge.name;  // Map name to title for UI compatibility
          
          // Compute status from dates and is_active
          const now = new Date();
          const start = new Date(challenge.start_date);
          const end = new Date(challenge.end_date);
          
          if (!challenge.is_active) {
            challenge.status = 'completed';
          } else if (now < start) {
            challenge.status = 'upcoming';
          } else if (now > end) {
            challenge.status = 'completed';
          } else {
            challenge.status = 'active';
          }
        }
        // Try to fetch activities for each challenge
        try {
          if (__DEV__) console.log('🔍 [CHALLENGES] Fetching activities for challenge:', challenge.id);
          const { data: activities, error: actError } = await supabase
            .from('challenge_activities')
            .select('*')
            .eq('challenge_id', challenge.id)
            .order('order_index');
          
          if (actError) {
            if (__DEV__) console.error('❌ [CHALLENGES] Error fetching activities:', actError);
            challenge.challenge_activities = [];
          } else {
            if (__DEV__) console.log('✅ [CHALLENGES] Found activities:', activities?.length || 0);
            challenge.challenge_activities = activities || [];
          }
        } catch (err) {
          if (__DEV__) console.log('Could not fetch activities, error:', err);
          challenge.challenge_activities = [];
        }
        
        // Fetch participants
        try {
          const { data: participants } = await supabase
            .from('challenge_participants')
            .select('*')
            .eq('challenge_id', challenge.id);
          
          challenge.challenge_participants = participants || [];
        } catch (err) {
          if (__DEV__) console.log('Could not fetch participants');
          challenge.challenge_participants = [];
        }
      }
    }
    
    return data || [];
  }
  
  // Get a single challenge with details
  async getChallenge(challengeId: string) {
    const { data, error } = await supabase
      .from('challenges')
      .select(`
        *,
        challenge_activities (*),
        challenge_participants (
          *,
          profiles (
            id,
            name,
            username,
            avatar_url
          )
        )
      `)
      .eq('id', challengeId)
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // Join a challenge
  async joinChallenge(challengeId: string, selectedActivityIds: string[]) {
    if (__DEV__) console.log('🏆 [CHALLENGES] Joining challenge:', challengeId);
    if (__DEV__) console.log('📝 [CHALLENGES] Selected activity IDs:', selectedActivityIds);
    if (__DEV__) console.log('📝 [CHALLENGES] Number of activities:', selectedActivityIds.length);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    // Check if already joined
    const { data: existing } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single();
    
    if (existing) {
      if (__DEV__) console.log('⚠️ [CHALLENGES] Already joined this challenge');
      return { success: false, error: 'Already joined this challenge' };
    }
    
    // Join the challenge
    const { data, error } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        user_id: user.id,
        selected_activity_ids: selectedActivityIds,
        linked_action_ids: []
      })
      .select()
      .single();
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error joining challenge:', error);
      throw error;
    }
    
    if (__DEV__) console.log('🟢 [CHALLENGES] Successfully joined challenge');
    if (__DEV__) console.log('✅ [CHALLENGES] Saved participant data:', JSON.stringify(data, null, 2));
    if (__DEV__) console.log('✅ [CHALLENGES] Saved activities:', data.selected_activity_ids);
    return { success: true, data };
  }
  
  // Get user's participation in a challenge
  async getMyParticipation(challengeId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      if (__DEV__) console.error('🔴 [CHALLENGES] Error getting participation:', error);
    }
    
    return data;
  }
  
  // Get leaderboard for a challenge
  async getChallengeLeaderboard(challengeId: string) {
    if (__DEV__) console.log('🏆 [CHALLENGES] Fetching leaderboard for:', challengeId);
    
    const { data, error } = await supabase
      .from('challenge_participants')
      .select(`
        *,
        profiles!user_id (
          id,
          name,
          username,
          avatar_url
        )
      `)
      .eq('challenge_id', challengeId)
      .order('consistency_percentage', { ascending: false })
      .order('total_completions', { ascending: false });
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching leaderboard:', error);
      throw error;
    }
    
    return data || [];
  }
  
  // Record activity completion
  async recordChallengeActivity(
    participantId: string, 
    activityId: string,
    linkedActionCompletionId?: string
  ) {
    if (__DEV__) console.log('🏆 [CHALLENGES] Recording activity completion');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already completed today
    const { data: existing } = await supabase
      .from('challenge_completions')
      .select('id')
      .eq('participant_id', participantId)
      .eq('activity_id', activityId)
      .eq('completion_date', today)
      .single();
    
    if (existing) {
      if (__DEV__) console.log('⚠️ [CHALLENGES] Activity already completed today');
      return { success: false, error: 'Already completed today' };
    }
    
    // Record completion
    const { data, error } = await supabase
      .from('challenge_completions')
      .insert({
        participant_id: participantId,
        activity_id: activityId,
        completion_date: today,
        linked_action_completion_id: linkedActionCompletionId
      })
      .select()
      .single();
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error recording completion:', error);
      throw error;
    }
    
    if (__DEV__) console.log('🟢 [CHALLENGES] Activity completed successfully');
    return { success: true, data };
  }
  
  // Get today's completions for a participant
  async getTodayCompletions(participantId: string) {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('challenge_completions')
      .select(`
        *,
        challenge_activities (*)
      `)
      .eq('participant_id', participantId)
      .eq('completion_date', today);
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching completions:', error);
      throw error;
    }
    
    return data || [];
  }
  
  // Get today's completions for current user (all their participations)
  async getTodayUserCompletions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('challenge_completions')
      .select(`
        activity_id,
        participant_id,
        challenge_participants!inner(user_id)
      `)
      .eq('challenge_participants.user_id', user.id)
      .eq('completion_date', today);
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching user completions:', error);
      return [];
    }
    
    return data || [];
  }
  
  // Check for activity matches with existing habits
  async findActivityMatches(activityTitle: string, userId: string) {
    if (__DEV__) console.log('🔍 [CHALLENGES] Checking for activity matches:', activityTitle);
    
    // First check exact name match in user's actions
    const { data: exactMatch } = await supabase
      .from('actions')
      .select('*')
      .eq('user_id', userId)
      .ilike('title', activityTitle)
      .single();
    
    if (exactMatch) {
      return { 
        type: 'exact',
        action: exactMatch,
        message: `You already have "${exactMatch.title}". Would you like to link them?`
      };
    }
    
    // Check canonical matches
    const { data: mapping } = await supabase
      .from('activity_mappings')
      .select('*')
      .or(`canonical_name.eq.${activityTitle.toLowerCase()},aliases.cs.{${activityTitle.toLowerCase()}}`)
      .single();
    
    if (mapping) {
      // Check if user has an action matching this canonical
      const { data: canonicalMatch } = await supabase
        .from('actions')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.${mapping.display_name},title.ilike.%${mapping.canonical_name}%`);
      
      if (canonicalMatch && canonicalMatch.length > 0) {
        return {
          type: 'canonical',
          action: canonicalMatch[0],
          mapping,
          message: `"${activityTitle}" is similar to your "${canonicalMatch[0].title}". Link them?`
        };
      }
    }
    
    return null; // No match found
  }
  
  // Link challenge activity to existing habit
  async linkActivityToAction(participantId: string, actionId: string) {
    if (__DEV__) console.log('🔗 [CHALLENGES] Linking activity to action:', actionId);
    
    // Get current linked actions
    const { data: participant } = await supabase
      .from('challenge_participants')
      .select('linked_action_ids')
      .eq('id', participantId)
      .single();
    
    if (!participant) throw new Error('Participant not found');
    
    const linkedActions = participant.linked_action_ids || [];
    if (!linkedActions.includes(actionId)) {
      linkedActions.push(actionId);
    }
    
    // Update participant
    const { error } = await supabase
      .from('challenge_participants')
      .update({ linked_action_ids: linkedActions })
      .eq('id', participantId);
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error linking activity:', error);
      throw error;
    }
    
    if (__DEV__) console.log('🟢 [CHALLENGES] Activity linked successfully');
    return { success: true };
  }
  
  // Calculate group consistency for a challenge
  async getGroupStats(challengeId: string) {
    const { data: participants } = await supabase
      .from('challenge_participants')
      .select('consistency_percentage')
      .eq('challenge_id', challengeId);
    
    if (!participants || participants.length === 0) {
      return {
        groupConsistency: 0,
        participantCount: 0,
        rating: '🌱 Starting'
      };
    }
    
    const totalConsistency = participants.reduce(
      (sum, p) => sum + (p.consistency_percentage || 0), 
      0
    );
    const avgConsistency = totalConsistency / participants.length;
    
    let rating = '🌱 Growing';
    if (avgConsistency >= 90) rating = '🔥 On Fire';
    else if (avgConsistency >= 70) rating = '💪 Strong';
    else if (avgConsistency >= 50) rating = '📈 Building';
    
    return {
      groupConsistency: Math.round(avgConsistency),
      participantCount: participants.length,
      rating
    };
  }
  
  // Update challenge status based on dates
  async updateChallengeStatuses() {
    const now = new Date();
    
    // Update to active
    await supabase
      .from('challenges')
      .update({ status: 'active' })
      .eq('status', 'upcoming')
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString());
    
    // Update to completed
    await supabase
      .from('challenges')
      .update({ status: 'completed' })
      .eq('status', 'active')
      .lt('end_date', now.toISOString());
  }
  
  // Get all challenge activities for a user to show in Daily page
  async getUserChallengeActivities() {
    if (__DEV__) console.log('🏆 [CHALLENGES] Fetching user challenge activities for Daily page');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (__DEV__) console.log('❌ [CHALLENGES] No user found');
      return [];
    }
    if (__DEV__) console.log('👤 [CHALLENGES] Fetching for user:', user.id, user.email);
    
    // Get all active participations for the user
    // Include activity_times once column is added
    const { data: participations, error } = await supabase
      .from('challenge_participants')
      .select(`
        id,
        challenge_id,
        selected_activity_ids,
        linked_action_ids,
        activity_times,
        challenges!inner (
          id,
          name,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .eq('challenges.is_active', true);
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching participations:', error);
      // If activity_times column doesn't exist yet, try without it
      if (error.message?.includes('activity_times')) {
        if (__DEV__) console.log('⚠️ [CHALLENGES] activity_times column not found, retrying without it');
        const { data: fallbackParticipations, error: fallbackError } = await supabase
          .from('challenge_participants')
          .select(`
            id,
            challenge_id,
            selected_activity_ids,
            linked_action_ids,
            challenges!inner (
              id,
              name,
              is_active
            )
          `)
          .eq('user_id', user.id)
          .eq('challenges.is_active', true);
        
        if (fallbackError) {
          if (__DEV__) console.error('🔴 [CHALLENGES] Fallback query also failed:', fallbackError);
          return [];
        }
        
        // Use fallback data without activity_times
        const participationsWithoutTimes = fallbackParticipations || [];
        if (__DEV__) console.log('📊 [CHALLENGES] Found participations (without times):', participationsWithoutTimes);
        
        // Process without times
        return this.processParticipations(participationsWithoutTimes, false);
      }
      return [];
    }
    
    if (!participations || participations.length === 0) {
      if (__DEV__) console.log('📊 [CHALLENGES] No active challenge participations');
      return [];
    }
    
    if (__DEV__) console.log('📊 [CHALLENGES] Found participations:', participations);
    return this.processParticipations(participations, true);
  }
  
  private async processParticipations(participations: any[], hasActivityTimes: boolean) {
    if (__DEV__) console.log('🔄 [CHALLENGES] Processing participations, hasActivityTimes:', hasActivityTimes);
    if (__DEV__) console.log('🔄 [CHALLENGES] Number of participations:', participations.length);
    
    // For each participation, get the selected activities
    const activities = [];
    for (const participation of participations) {
      if (__DEV__) console.log('🔍 [CHALLENGES] Processing participation:', participation.id);
      if (__DEV__) console.log('📦 [CHALLENGES] Full participation object:', JSON.stringify(participation, null, 2));
      if (__DEV__) console.log('📦 [CHALLENGES] Participation summary:', {
        id: participation.id,
        challenge_id: participation.challenge_id,
        selected_activity_ids: participation.selected_activity_ids,
        activity_times: participation.activity_times,
        linked_action_ids: participation.linked_action_ids,
        hasActivityTimes: hasActivityTimes
      });
      
      // Handle both array and string formats for selected_activity_ids
      let activityIds = participation.selected_activity_ids;
      if (!activityIds) {
        if (__DEV__) console.log('⚠️ [CHALLENGES] No selected_activity_ids for participation:', participation.id);
        continue;
      }
      
      // Ensure it's an array
      if (typeof activityIds === 'string') {
        try {
          activityIds = JSON.parse(activityIds);
          if (__DEV__) console.log('📋 [CHALLENGES] Parsed string to array:', activityIds);
        } catch (e) {
          if (__DEV__) console.log('⚠️ [CHALLENGES] Could not parse activities string, treating as array:', activityIds);
        }
      }
      
      if (!Array.isArray(activityIds) || activityIds.length === 0) {
        if (__DEV__) console.log('⚠️ [CHALLENGES] No valid activities for participation:', participation.id);
        continue;
      }
      
      if (__DEV__) console.log('📋 [CHALLENGES] Fetching activities with IDs:', activityIds);
      
      // Fetch the activity details
      const { data: challengeActivities, error: activitiesError } = await supabase
        .from('challenge_activities')
        .select('*')
        .in('id', activityIds);
      
      if (activitiesError) {
        if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching activities:', activitiesError);
        continue;
      }
      
      if (__DEV__) console.log('✅ [CHALLENGES] Found activities:', challengeActivities?.length || 0);
      
      if (challengeActivities && challengeActivities.length > 0) {
        // First, build a map of linked activities from activity_times
        const linkedActivityIds = new Set();
        if (__DEV__) console.log('🔗 [CHALLENGES] Checking for linked activities in activity_times:', participation.activity_times);
        if (participation.activity_times && Array.isArray(participation.activity_times)) {
          if (__DEV__) console.log('🔗 [CHALLENGES] activity_times has', participation.activity_times.length, 'entries');
          participation.activity_times.forEach((item: any) => {
            if (__DEV__) console.log('🔗 [CHALLENGES] Checking time entry:', item);
            if (item.is_link && item.linked_to) {
              // This activity is linked to an existing action
              linkedActivityIds.add(item.activity_id);
              if (__DEV__) console.log(`🔗✅ [CHALLENGES] Found linked activity: ${item.activity_id} -> ${item.linked_to}`);
            }
          });
        } else {
          if (__DEV__) console.log('🔗❌ [CHALLENGES] No activity_times or not an array');
        }
        
        // Map activities to include challenge info and scheduled times
        // BUT filter out linked activities - they will be handled by updating the existing action
        const mappedActivities = challengeActivities
          .filter(activity => {
            if (linkedActivityIds.has(activity.id)) {
              if (__DEV__) console.log(`🔗 [CHALLENGES] Filtering out linked activity: "${activity.title}" (${activity.id})`);
              return false; // Don't include linked activities
            }
            return true;
          })
          .map(activity => {
          if (__DEV__) console.log('📌 [CHALLENGES] Processing activity:', {
            id: activity.id,
            title: activity.title,
            display_name: activity.display_name,
            emoji: activity.emoji,
            icon: activity.icon
          });
          
          // Find the scheduled time for this activity if available
          let scheduledTime = undefined;
          if (hasActivityTimes && participation.activity_times && Array.isArray(participation.activity_times)) {
            const timeEntry = participation.activity_times.find(
              (t: any) => t.activity_id === activity.id && !t.is_link
            );
            scheduledTime = timeEntry?.scheduled_time;
            if (scheduledTime) {
              if (__DEV__) console.log(`⏰ [CHALLENGES] Activity "${activity.display_name || activity.title}" has scheduled time:`, scheduledTime);
            }
          }
          
          // Check if linked to an existing action (legacy check - should not happen after filter)
          let linkedActionId = undefined;
          if (participation.linked_action_ids && Array.isArray(participation.linked_action_ids)) {
            const linkEntry = participation.linked_action_ids.find(
              (link: any) => link.activity_id === activity.id
            );
            linkedActionId = linkEntry?.action_id;
          }
          
          return {
            ...activity,
            challengeId: participation.challenge_id,
            challengeName: participation.challenges.name,
            participantId: participation.id,
            scheduledTime: scheduledTime,
            linkedActionId: linkedActionId
          };
        });
        
        activities.push(...mappedActivities);
        if (__DEV__) console.log('📊 [CHALLENGES] Added', mappedActivities.length, 'activities from participation', participation.id);
      }
    }
    
    if (__DEV__) console.log(`🟢 [CHALLENGES] Found ${activities.length} total challenge activities for Daily page`);
    activities.forEach(a => {
      if (__DEV__) console.log(`  - ${a.display_name || a.title} (${a.id}) - scheduled: ${a.scheduledTime || 'not set'}`);
    });
    return activities;
  }

  // Get linked challenge activities for merging with regular actions
  async getLinkedChallengeActivities() {
    if (__DEV__) console.log('🔗 [CHALLENGES] Getting linked challenge activities for merging');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (__DEV__) console.log('🔗 [CHALLENGES] No user found');
      return [];
    }
    
    if (__DEV__) console.log('🔗 [CHALLENGES] Fetching participations for user:', user.id);
    const { data: participations, error } = await supabase
      .from('challenge_participants')
      .select(`
        id,
        challenge_id,
        activity_times,
        challenges!inner (
          id,
          name,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .eq('challenges.is_active', true);
    
    if (error) {
      if (__DEV__) console.error('🔗❌ [CHALLENGES] Error fetching participations:', error);
      return [];
    }
    
    if (__DEV__) console.log('🔗 [CHALLENGES] Found participations:', participations?.length || 0);
    
    const linkedActivities = [];
    
    if (participations) {
      for (const participation of participations) {
        if (__DEV__) console.log('🔗 [CHALLENGES] Checking participation:', participation.id);
        if (__DEV__) console.log('🔗 [CHALLENGES] activity_times:', participation.activity_times);
        if (participation.activity_times && Array.isArray(participation.activity_times)) {
          if (__DEV__) console.log('🔗 [CHALLENGES] Found activity_times array with', participation.activity_times.length, 'entries');
          participation.activity_times.forEach((item: any) => {
            if (__DEV__) console.log('🔗 [CHALLENGES] Checking item:', item);
            if (item.is_link && item.linked_to) {
              if (__DEV__) console.log('🔗✅ [CHALLENGES] Found link:', item.activity_id, '->', item.linked_to);
              linkedActivities.push({
                challengeActivityId: item.activity_id,
                linkedActionId: item.linked_to,
                challengeId: participation.challenge_id,
                challengeName: participation.challenges.name,
                participantId: participation.id
              });
            }
          });
        } else {
          if (__DEV__) console.log('🔗❌ [CHALLENGES] No activity_times or not an array for participation:', participation.id);
        }
      }
    }
    
    if (__DEV__) console.log('🔗 [CHALLENGES] Found linked activities:', linkedActivities);
    return linkedActivities;
  }
  
  // Update participant with linked action IDs
  async updateParticipantLinks(participantId: string, links: Record<string, string>) {
    if (__DEV__) console.log('🔗 [CHALLENGES] Updating participant links:', participantId, links);
    
    // The column is UUID[] so we need to save just the action IDs
    // We'll need to maintain the mapping separately
    const linkedActionIds = Object.values(links);
    
    // First update the linked_action_ids array
    const { data, error } = await supabase
      .from('challenge_participants')
      .update({ 
        linked_action_ids: linkedActionIds 
      })
      .eq('id', participantId)
      .select();
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error updating participant links:', error);
      throw error;
    }
    
    // Now we need to save the mapping somewhere
    // For now, let's save it in activity_times with a special format
    // Get current activity times
    const { data: participant } = await supabase
      .from('challenge_participants')
      .select('activity_times')
      .eq('id', participantId)
      .single();
    
    const currentTimes = participant?.activity_times || [];
    
    // Filter out any existing link mappings to avoid duplicates
    const nonLinkTimes = currentTimes.filter((t: any) => !t.is_link);
    
    // Add link mappings to activity_times
    const linkMappings = Object.entries(links).map(([activityId, actionId]) => ({
      activity_id: activityId,
      linked_to: actionId,
      is_link: true
    }));
    
    // Merge non-link times with new link mappings
    const updatedTimes = [...nonLinkTimes, ...linkMappings];
    
    if (__DEV__) console.log('🔗 [CHALLENGES] Saving link mappings to activity_times:', JSON.stringify(updatedTimes, null, 2));
    
    const { data: linkData, error: timeError } = await supabase
      .from('challenge_participants')
      .update({ 
        activity_times: updatedTimes 
      })
      .eq('id', participantId)
      .select();
    
    if (timeError) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error updating link mappings:', timeError);
      throw timeError; // Important: throw the error so the caller knows it failed
    }
    
    if (__DEV__) console.log('🟢 [CHALLENGES] Updated participant links and mappings');
    if (__DEV__) console.log('🟢 [CHALLENGES] Verified activity_times:', JSON.stringify(linkData?.[0]?.activity_times, null, 2));
    return linkData || data;
  }

  // Update participant with activity times for new activities
  async updateParticipantActivityTimes(participantId: string, times: Record<string, string>) {
    if (__DEV__) console.log('🔴🔴🔴 [SAVE TIMES] updateParticipantActivityTimes called');
    if (__DEV__) console.log('🔴🔴🔴 [SAVE TIMES] Participant ID:', participantId);
    if (__DEV__) console.log('🔴🔴🔴 [SAVE TIMES] Times to save:', JSON.stringify(times, null, 2));
    
    // CRITICAL FIX: First get current activity_times to preserve link mappings
    const { data: participant, error: fetchError } = await supabase
      .from('challenge_participants')
      .select('activity_times')
      .eq('id', participantId)
      .single();
    
    if (fetchError) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching current activity times:', fetchError);
      throw fetchError;
    }
    
    // Extract existing link mappings (entries with is_link: true)
    const currentTimes = participant?.activity_times || [];
    const existingLinkMappings = currentTimes.filter((t: any) => t.is_link === true);
    if (__DEV__) console.log('🔗 [SAVE TIMES] Preserving existing link mappings:', JSON.stringify(existingLinkMappings, null, 2));
    
    // Convert times object to array format for storage
    // times is { activityId: timeString }
    const newActivityTimes = Object.entries(times).map(([activityId, time]) => ({
      activity_id: activityId,
      scheduled_time: time
    }));
    
    // Merge preserved link mappings with new activity times
    const mergedActivityTimes = [...existingLinkMappings, ...newActivityTimes];
    
    if (__DEV__) console.log('⏰ [CHALLENGES] Merged activity times for DB:', JSON.stringify(mergedActivityTimes, null, 2));
    
    const { data, error } = await supabase
      .from('challenge_participants')
      .update({ 
        activity_times: mergedActivityTimes 
      })
      .eq('id', participantId)
      .select();

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error updating activity times:', error);
      if (__DEV__) console.error('🔴 [CHALLENGES] Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    if (__DEV__) console.log('✅ [CHALLENGES] Activity times updated successfully');
    if (__DEV__) console.log('✅ [CHALLENGES] Updated record:', JSON.stringify(data, null, 2));
    return data;
  }

  // Get all participations for current user
  async getUserParticipations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (__DEV__) console.log('❌ [CHALLENGES] No user found');
      return [];
    }
    
    if (__DEV__) console.log('📊 [CHALLENGES] Fetching all participations for user:', user.id);
    
    // IMPORTANT: Include activity_times in the select to get scheduled times
    const { data, error } = await supabase
      .from('challenge_participants')
      .select(`
        *,
        challenges!inner (
          id,
          name,
          is_active
        )
      `)
      .eq('user_id', user.id);
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching participations:', error);
      return [];
    }
    
    if (__DEV__) console.log('🟢 [CHALLENGES] Found participations:', data?.length || 0);
    
    // Log activity_times to debug
    if (data && data.length > 0) {
      data.forEach((p: any) => {
        if (__DEV__) console.log(`📊 [CHALLENGES] Participation ${p.id} activity_times:`, p.activity_times);
      });
    }
    
    return data || [];
  }

  // Link a single activity to an action
  async linkActivityToAction(participantId: string, activityId: string, actionId: string) {
    if (__DEV__) console.log('🔗 [CHALLENGES] Linking activity to action:', { participantId, activityId, actionId });
    
    // Get existing links
    const { data: participant, error: fetchError } = await supabase
      .from('challenge_participants')
      .select('linked_action_ids')
      .eq('id', participantId)
      .single();
    
    if (fetchError) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching participant:', fetchError);
      throw fetchError;
    }
    
    // Update or add the link
    const existingLinks = participant?.linked_action_ids || [];
    const updatedLinks = existingLinks.filter((link: any) => link.activity_id !== activityId);
    updatedLinks.push({ activity_id: activityId, action_id: actionId });
    
    const { data, error } = await supabase
      .from('challenge_participants')
      .update({ linked_action_ids: updatedLinks })
      .eq('id', participantId)
      .select();
    
    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error linking activity:', error);
      throw error;
    }
    
    if (__DEV__) console.log('🟢 [CHALLENGES] Successfully linked activity');
    return data;
  }
}

export const supabaseChallengeService = new SupabaseChallengeService();