import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChallengeDebugV2 from '../utils/challengeDebugV2';

// Supabase project configuration
const SUPABASE_URL = 'https://ojusijzhshvviqjeyhyn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qdXNpanpoc2h2dmlxamV5aHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NjU3MjQsImV4cCI6MjA3MTE0MTcyNH0.rlQ9lIGzoaLTOW-5-W0G1J1A0WwvqZMnhGHW-FwV8GQ';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

class SupabaseService {
  // Helper to verify session
  async verifySession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('🔐 [AUTH] Session check:');
      console.log('  - Session exists:', !!session);
      console.log('  - User exists:', !!user);
      console.log('  - User ID:', user?.id || 'none');
      console.log('  - User email:', user?.email || 'none');
      
      // CRITICAL: Also check what the app thinks the user is
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        console.log('  - App cached user ID:', parsedUser.id);
        if (user && parsedUser.id !== user.id) {
          console.error('🔴 [AUTH] USER ID MISMATCH!');
          console.error('  - Supabase user:', user.id);
          console.error('  - Cached user:', parsedUser.id);
        }
      }
      
      return { session, user };
    } catch (error) {
      console.error('🔴 [AUTH] Session verification failed:', error);
      return { session: null, user: null };
    }
  }

  // Auth methods
  async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    
    if (error) throw error;
    
    // CRITICAL: Create profile for new user
    if (data.user) {
      console.log('🟦 [AUTH] Creating profile for new user:', data.user.id);
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name: name,
          email: email
        });
      
      if (profileError && !profileError.message.includes('duplicate')) {
        console.error('🔴 [AUTH] Failed to create profile:', profileError);
      } else {
        console.log('🟢 [AUTH] Profile created successfully');
      }
    }
    
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    // Get profile from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return { ...user, ...profile };
  }

  // Goals methods
  async getGoals() {
    try {
      // Verify session first
      const { user } = await this.verifySession();
      if (!user) {
        console.log('🔴 [SUPABASE] No user found in getGoals - not authenticated');
        return [];  // Return empty array instead of throwing
      }
      
      console.log('🔵 [SUPABASE] Fetching goals for user:', user.id);

      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🔴 [SUPABASE] Error fetching goals:', error);
        throw error;
      }
      
      console.log('🟢 [SUPABASE] Retrieved', data?.length || 0, 'goals from database');
      
      // Add calculated fields for frontend display
      const goalsWithCalculatedFields = (data || []).map(goal => ({
        ...goal,
        consistency: 0, // This should be calculated based on actions completed
        status: 'On Track' as const // Default status, should be calculated based on consistency
      }));
      
      return goalsWithCalculatedFields;
    } catch (error) {
      console.error('🔴 [SUPABASE] getGoals exception:', error);
      return [];  // Return empty array on error
    }
  }


  async updateGoal(id: string, updates: any) {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Add calculated fields for frontend display
    return {
      ...data,
      consistency: 0,
      status: 'On Track' as const
    };
  }

  async deleteGoal(id: string) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Actions methods
  async getDailyActions() {
    try {
      // Verify session first
      const { user } = await this.verifySession();
      if (!user) {
        console.log('🔴 [SUPABASE] No user found in getDailyActions - not authenticated');
        return [];  // Return empty array instead of throwing
      }
      console.log('🔵 [SUPABASE] Fetching daily actions for user:', user.id);

      // Don't filter by date - get ALL user's actions (they're recurring commitments)
      // The 'date' field should track when it was created, not when it's shown
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          goal:goals(id, title, color)
        `)
        .eq('user_id', user.id)
        .order('time', { ascending: true });

      if (error) {
        console.error('Error fetching daily actions:', error);
        throw error;
      }

      // LOG RAW DATABASE RESPONSE TO DEBUG
      console.log('🔴 [RAW DB RESPONSE] First action:', JSON.stringify(data?.[0], null, 2));

      // Check if completed_at is TODAY for each action
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Log raw data to debug
      console.log('🔵 [SUPABASE] Raw actions from DB:', data?.map(a => ({
        id: a.id,
        title: a.title,
        completed: a.completed,
        completed_at: a.completed_at,
        completed_today: a.completed_at && new Date(a.completed_at) >= today
      })));
      
      // Transform to camelCase and include goal data
      // IMPORTANT: Override 'completed' field to only be true if completed TODAY
      const transformed = data?.map(action => {
        const completedToday = action.completed_at && new Date(action.completed_at) >= today;
        const result = {
          ...action,
          completed: completedToday, // Only mark as completed if it was done today
          completed_at: action.completed_at,  // KEEP ORIGINAL FIELD!
          created_at: action.created_at,  // PRESERVE CREATED_AT!
          createdAt: action.created_at,  // Add camelCase version too
          goalId: action.goal_id,
          userId: action.user_id,
          completedAt: action.completed_at,
          goal: action.goal
        };

        // Debug log for first action
        if (action.title === "Yoga/Stretching") {
          console.log('🔥 [TRANSFORM] Yoga action after transform:', {
            original_completed_at: action.completed_at,
            result_completed_at: result.completed_at,
            result_completedAt: result.completedAt
          });
        }

        return result;
      }) || [];

      console.log('🔥 [TRANSFORM] First transformed action:', transformed[0]?.completed_at, transformed[0]?.completedAt);
      return transformed;
    } catch (error) {
      console.error('getDailyActions error:', error);
      return [];  // Return empty array on error
    }
  }

  async createAction(action: {
    title: string;
    time?: string;
    goalId?: string;
    frequency?: string;
    scheduled_days?: string[];
  }) {
    console.log('🔵 [SUPABASE] createAction called:', action.title);
    
    // Verify session first
    const { user } = await this.verifySession();
    if (!user) {
      console.error('🔴 [SUPABASE] Not authenticated - cannot create action!');
      throw new Error('Not authenticated');
    }
    console.log('🔵 [SUPABASE] Creating action for user ID:', user.id);

    // Remove goalId from action to avoid conflict
    const { goalId, ...actionData } = action;
    console.log('🔵 [SUPABASE] Creating action with goalId:', goalId, 'frequency:', action.frequency, 'scheduled_days:', action.scheduled_days);

    const { data, error } = await supabase
      .from('actions')
      .insert({
        ...actionData,
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],  // Creation date for tracking
        completed: false,
        goal_id: goalId,  // Map goalId to goal_id
        frequency: action.frequency || 'daily',
        scheduled_days: action.scheduled_days || null
      })
      .select()
      .single();

    if (error) {
      console.error('🔴 [SUPABASE] createAction error:', error.message);
      throw error;
    }
    console.log('🟢 [SUPABASE] Action created successfully, ID:', data.id);
    
    // Verify the action was actually saved
    console.log('🔵 [SUPABASE] Verifying action was saved...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('actions')
      .select('*')
      .eq('id', data.id)
      .single();
    
    if (verifyError || !verifyData) {
      console.error('🔴 [SUPABASE] Action verification failed!', verifyError);
      throw new Error('Action creation verification failed');
    }
    
    console.log('🟢 [SUPABASE] Action verified in database:', verifyData.title);
    return data;
  }

  async completeAction(id: string) {
    console.log('🔵 [SUPABASE] Completing action:', id);

    // Get current user
    const { user } = await this.verifySession();
    if (!user) throw new Error('User not authenticated');

    // First, insert into action_completions to track this completion
    const { error: completionError } = await supabase
      .from('action_completions')
      .insert({
        action_id: id,
        user_id: user.id,
        completed_at: new Date().toISOString()
      });

    if (completionError) {
      console.error('❌ [SUPABASE] Error logging completion:', completionError);
      // Continue even if logging fails - don't break the user experience
    } else {
      console.log('✅ [SUPABASE] Completion logged in action_completions table');
    }

    // Update the actions table with completion status
    const { data, error } = await supabase
      .from('actions')
      .update({
        completed: true,
        completed_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('🔴 [SUPABASE] Error updating action:', error);
      throw error;
    }

    console.log('🟢 [SUPABASE] Action completed successfully:', data);
    return data;
  }

  async uncompleteAction(id: string) {
    console.log('🔵 [SUPABASE] Uncompleting action:', id);

    // Get current user
    const { user } = await this.verifySession();
    if (!user) throw new Error('User not authenticated');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Delete today's completion from action_completions
    const { error: deleteError } = await supabase
      .from('action_completions')
      .delete()
      .eq('action_id', id)
      .eq('user_id', user.id)
      .gte('completed_at', today.toISOString())
      .lt('completed_at', tomorrow.toISOString());

    if (deleteError) {
      console.error('❌ [SUPABASE] Error deleting completion:', deleteError);
    } else {
      console.log('✅ [SUPABASE] Completion removed from action_completions table');
    }

    // Update the actions table to mark as incomplete
    const { data, error } = await supabase
      .from('actions')
      .update({
        completed: false,
        completed_at: null
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('🔴 [SUPABASE] Error updating action:', error);
      throw error;
    }

    console.log('🟢 [SUPABASE] Action uncompleted successfully:', data);
    return data;
  }

  async updateAction(id: string, updates: any) {
    const { data, error } = await supabase
      .from('actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteAction(id: string) {
    const { error } = await supabase
      .from('actions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ⚠️ IMPORTANT: This calculates HISTORICAL consistency (all-time), not today's completion
  // Formula: (total completions) / (number of actions × days since oldest action)
  // This gives the overall consistency percentage since the user started tracking
  async getGoalCompletionStats(userId: string) {
    console.log('📊 [SUPABASE] Fetching HISTORICAL goal completion stats for user:', userId);

    // Get all goals with their creation dates
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title, created_at')
      .eq('user_id', userId);

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
      return {};
    }

    const stats: Record<string, { expected: number; completed: number; percentage: number }> = {};

    for (const goal of goals || []) {
      // Get actions linked to this goal
      const { data: actions, error: actionsError } = await supabase
        .from('actions')
        .select('id, created_at')
        .eq('goal_id', goal.id)
        .eq('user_id', userId);

      if (actionsError) {
        console.error(`Error fetching actions for goal ${goal.id}:`, actionsError);
        continue;
      }

      if (!actions || actions.length === 0) {
        stats[goal.title] = { expected: 0, completed: 0, percentage: 0 };
        continue;
      }

      // Find the oldest action to calculate the historical period
      const oldestAction = actions.reduce((oldest, action) => {
        const actionDate = new Date(action.created_at);
        return actionDate < oldest ? actionDate : oldest;
      }, new Date(actions[0].created_at));

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Calculate days since the oldest action was created
      const daysSinceStart = Math.floor((today.getTime() - oldestAction.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Expected completions = number of actions * days since start
      const expectedCompletions = actions.length * daysSinceStart;

      // Get actual completion count from action_completions table
      // Count ALL historical completions for this goal's actions
      let completedCount = 0;

      const actionIds = actions.map(a => a.id);
      const { count, error: countError } = await supabase
        .from('action_completions')
        .select('*', { count: 'exact', head: true })
        .in('action_id', actionIds);

      if (!countError) {
        completedCount = count || 0;
      } else {
        console.warn('⚠️ [SUPABASE] Error counting completions:', countError);
      }

      const percentage = expectedCompletions > 0
        ? Math.round((completedCount / expectedCompletions) * 100)
        : 0;

      stats[goal.id] = {
        expected: expectedCompletions,
        completed: completedCount,
        percentage
      };

      console.log(`📊 Goal "${goal.title}": ${completedCount}/${expectedCompletions} = ${percentage}% (${actions.length} actions × ${daysSinceStart} days)`);
    }

    return stats;
  }

  private countWeekdaysInRange(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  private countWeekendsInRange(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  private countScheduledDaysInRange(startDate: Date, endDate: Date, scheduledDays: string[]): number {
    let count = 0;
    const current = new Date(startDate);

    const dayMap: { [key: string]: number } = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };

    const scheduledDayNumbers = scheduledDays.map(day => dayMap[day.toLowerCase()]).filter(d => d !== undefined);

    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (scheduledDayNumbers.includes(dayOfWeek)) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  async getBulkOverallCompletionStats(userIds: string[]) {
    console.log(`📊 [SUPABASE] Fetching bulk completion stats for ${userIds.length} users`);

    const results: Record<string, { expected: number; completed: number; percentage: number }> = {};

    try {
      // Fetch all actions for all users in one query
      const { data: allActions, error: actionsError } = await supabase
        .from('actions')
        .select('id, created_at, user_id, frequency, scheduled_days')
        .in('user_id', userIds);

      if (actionsError || !allActions) {
        console.error('Error fetching bulk actions:', actionsError);
        userIds.forEach(id => {
          results[id] = { expected: 0, completed: 0, percentage: 0 };
        });
        return results;
      }

      // Get all action IDs
      const allActionIds = allActions.map(a => a.id);

      // Fetch all completions in one query
      const { data: allCompletions, error: completionError } = await supabase
        .from('action_completions')
        .select('action_id, user_id')
        .in('action_id', allActionIds);

      // Calculate stats for each user
      for (const userId of userIds) {
        const userActions = allActions.filter(a => a.user_id === userId);

        if (userActions.length === 0) {
          results[userId] = { expected: 0, completed: 0, percentage: 0 };
          continue;
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        const oldestActionDate = userActions.reduce((oldest, action) => {
          const actionDate = new Date(action.created_at);
          return actionDate < oldest ? actionDate : oldest;
        }, new Date());

        let totalExpected = 0;
        for (const action of userActions) {
          const actionCreatedAt = new Date(action.created_at);
          actionCreatedAt.setHours(0, 0, 0, 0);
          const daysForThisAction = Math.floor((today.getTime() - actionCreatedAt.getTime()) / (1000 * 60 * 60 * 24)) + 1;

          const frequency = action.frequency || 'daily';
          let expectedForAction = daysForThisAction; // Default to daily

          switch (frequency) {
            case 'weekly':
              expectedForAction = Math.floor(daysForThisAction / 7);
              break;
            case 'weekdays':
              expectedForAction = this.countWeekdaysInRange(actionCreatedAt, today);
              break;
            case 'weekends':
              expectedForAction = this.countWeekendsInRange(actionCreatedAt, today);
              break;
            case 'every_other_day':
              expectedForAction = Math.floor(daysForThisAction / 2);
              break;
            case 'three_per_week':
              expectedForAction = Math.floor((daysForThisAction / 7) * 3);
              break;
          }

          totalExpected += expectedForAction;
        }

        const userActionIds = userActions.map(a => a.id);
        const totalCompleted = allCompletions?.filter(c => userActionIds.includes(c.action_id)).length || 0;
        const percentage = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;

        results[userId] = {
          expected: totalExpected,
          completed: totalCompleted,
          percentage
        };
      }

      console.log(`✅ [SUPABASE] Bulk stats calculated for ${userIds.length} users`);
      return results;
    } catch (error) {
      console.error('Error in bulk stats:', error);
      userIds.forEach(id => {
        results[id] = { expected: 0, completed: 0, percentage: 0 };
      });
      return results;
    }
  }

  async getOverallCompletionStats(userId: string) {
    console.log('📊 [SUPABASE] Fetching overall completion stats for user:', userId);

    // Get all unique action templates (not daily instances) with frequency data
    const { data: actions, error: actionsError } = await supabase
      .from('actions')
      .select('id, created_at, title, goal_id, frequency, scheduled_days')
      .eq('user_id', userId);

    if (actionsError || !actions || actions.length === 0) {
      console.error('Error fetching actions or no actions found:', actionsError);
      return { expected: 0, completed: 0, percentage: 0 };
    }

    // Calculate the oldest action creation date to determine tracking period
    const oldestActionDate = actions.reduce((oldest, action) => {
      const actionDate = new Date(action.created_at);
      return actionDate < oldest ? actionDate : oldest;
    }, new Date());

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const daysSinceStart = Math.floor((today.getTime() - oldestActionDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate total expected based on each action's frequency
    let totalExpected = 0;

    console.log('🔍 [DEBUG] Processing actions with frequencies:');
    for (const action of actions) {
      const actionCreatedAt = new Date(action.created_at);
      actionCreatedAt.setHours(0, 0, 0, 0);
      const daysForThisAction = Math.floor((today.getTime() - actionCreatedAt.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const frequency = action.frequency || 'daily';
      const scheduledDays = action.scheduled_days;

      let expectedForAction = 0;

      switch (frequency) {
        case 'daily':
          expectedForAction = daysForThisAction;
          break;
        case 'weekly':
          expectedForAction = Math.floor(daysForThisAction / 7);
          break;
        case 'weekdays':
          // Count weekdays in the period
          expectedForAction = this.countWeekdaysInRange(actionCreatedAt, today);
          break;
        case 'weekends':
          // Count weekend days in the period
          expectedForAction = this.countWeekendsInRange(actionCreatedAt, today);
          break;
        case 'every_other_day':
          expectedForAction = Math.floor(daysForThisAction / 2);
          break;
        case 'three_per_week':
          expectedForAction = Math.floor((daysForThisAction / 7) * 3);
          break;
        case 'custom':
          // For custom schedules, count how many scheduled days occurred
          if (scheduledDays && Array.isArray(scheduledDays)) {
            expectedForAction = this.countScheduledDaysInRange(actionCreatedAt, today, scheduledDays);
          } else {
            expectedForAction = daysForThisAction; // Fallback to daily
          }
          break;
        default:
          expectedForAction = daysForThisAction; // Default to daily
      }

      console.log(`   - "${action.title}": frequency=${frequency}, days=${daysForThisAction}, expected=${expectedForAction}`);
      totalExpected += expectedForAction;
    }
    console.log(`🔍 [DEBUG] Total expected: ${totalExpected}`);

    // Get actual completions from action_completions table
    const actionIds = actions.map(a => a.id);
    console.log(`🔍 [DEBUG] Querying action_completions for ${actionIds.length} action IDs`);

    const { count: totalCompleted, error: completionError } = await supabase
      .from('action_completions')
      .select('*', { count: 'exact', head: true })
      .in('action_id', actionIds);

    console.log(`🔍 [DEBUG] Completions query result: count=${totalCompleted}, error=${completionError ? 'YES' : 'NO'}`);

    if (completionError) {
      console.error('Error fetching completions:', completionError);

      // Fallback: If action_completions fails, check how many actions have completed_at
      // This gives us at least TODAY's completion status
      const { data: completedActions } = await supabase
        .from('actions')
        .select('id')
        .eq('user_id', userId)
        .not('completed_at', 'is', null);

      const fallbackCompleted = completedActions?.length || 0;
      const fallbackPercentage = totalExpected > 0
        ? Math.round((fallbackCompleted / totalExpected) * 100)
        : 0;

      console.log(`📊 Overall stats for ${userId} (using fallback):`);
      console.log(`   - Unique actions: ${actions.length}`);
      console.log(`   - Days tracking: ${daysSinceStart}`);
      console.log(`   - Expected: ${totalExpected}`);
      console.log(`   - Completed today: ${fallbackCompleted}`);
      console.log(`   - Percentage (TODAY ONLY): ${fallbackPercentage}%`);

      return {
        expected: totalExpected,
        completed: fallbackCompleted,
        percentage: fallbackPercentage
      };
    }

    const percentage = totalExpected > 0
      ? Math.round((totalCompleted / totalExpected) * 100)
      : 0;

    console.log(`📊 Overall stats for ${userId}:`);
    console.log(`   - Unique actions: ${actions.length}`);
    console.log(`   - Days tracking: ${daysSinceStart}`);
    console.log(`   - Expected (based on frequencies): ${totalExpected}`);
    console.log(`   - Completed (from action_completions): ${totalCompleted}`);
    console.log(`   - Percentage: ${percentage}%`);

    return {
      expected: totalExpected,
      completed: totalCompleted || 0,
      percentage
    };
  }
  
  async getTodaysCompletedActions() {
    try {
      const { user } = await this.verifySession();
      if (!user) {
        console.log('🔴 [SUPABASE] No user found - not authenticated');
        return [];
      }
      
      console.log('🔵 [SUPABASE] Fetching today\'s completed actions for user:', user.id);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get completed actions from the actions table
      const { data: actions, error: actionsError } = await supabase
        .from('actions')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('completed_at', today.toISOString())
        .order('completed_at', { ascending: false });
      
      if (actionsError) {
        console.error('🔴 [SUPABASE] Error fetching completed actions:', actionsError);
        return [];
      }
      
      console.log('🟢 [SUPABASE] Found', actions?.length || 0, 'completed actions today');
      
      // Convert to CompletedAction format
      return (actions || []).map(a => ({
        id: `${a.id}-completed`,
        actionId: a.id,
        title: a.title,
        goalId: a.goal?.id || a.goal_id,
        goalTitle: a.goal?.title,
        completedAt: a.completed_at || new Date().toISOString(),
        isPrivate: false,
        streak: 1,
        type: 'check',
        category: a.category
      }));
    } catch (error) {
      console.error('🔴 [SUPABASE] getTodaysCompletedActions error:', error);
      return [];
    }
  }

  // Profile methods
  async updateProfile(updates: { avatar?: string; name?: string; bio?: string }) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('No authenticated user');
    }

    console.log('🔵 [SUPABASE] Updating profile for user:', user.id, 'with updates:', JSON.stringify(updates));

    // Handle avatar - can be base64 or URL
    let avatarUrl = updates.avatar;
    if (avatarUrl && avatarUrl.startsWith('data:image')) {
      // Avatar is base64 - store directly in database
      // This is acceptable for profile photos as they're small
      console.log('🔵 [STORAGE] Storing avatar as base64 in database');
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (avatarUrl !== undefined) updateData.avatar_url = avatarUrl;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.bio !== undefined) updateData.bio = updates.bio;

    console.log('🔵 [SUPABASE] Update data being sent to DB:', JSON.stringify(updateData));

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('🔴 [SUPABASE] Error updating profile:', error);
      throw error;
    }

    console.log('🟢 [SUPABASE] Profile updated successfully. Returned data:', JSON.stringify(data));
    return data;
  }

  // Posts methods
  async getFeed(type: 'circle' | 'follow' = 'circle', limit: number = 5, offset: number = 0, circleId?: string | null) {
    const { data: { user } } = await supabase.auth.getUser();

    console.log('🟦 [FEED] getFeed called:', { type, userId: user?.id, limit, offset, circleId });

    // Must be authenticated to see feeds
    if (!user) {
      console.log('🔴 [FEED] No authenticated user for feed');
      return { posts: [], hasMore: false };
    }

    if (type === 'circle') {
      let targetCircleId = circleId;

      // If no specific circle provided and not "All Circles" mode, use profile circle
      if (targetCircleId === undefined) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('circle_id')
          .eq('id', user.id)
          .single();

        if (!profile?.circle_id) {
          console.log('🟡 [FEED] User', user.id, 'has no circle_id - returning empty circle feed');
          return { posts: [], hasMore: false };
        }
        targetCircleId = profile.circle_id;
      }

      // If circleId is null, it means "All Circles" - get posts from all user's circles
      let memberIds: string[] = [];

      if (targetCircleId === null) {
        console.log('🟦 [FEED] Fetching posts from ALL user circles');

        // Get all circles the user belongs to
        const { data: userMemberships } = await supabase
          .from('circle_members')
          .select('circle_id')
          .eq('user_id', user.id);

        if (!userMemberships || userMemberships.length === 0) {
          console.log('🟡 [FEED] User is not in any circles');
          return { posts: [], hasMore: false };
        }

        const userCircleIds = userMemberships.map(m => m.circle_id);

        // Get all members from all user's circles
        const { data: allMembers } = await supabase
          .from('circle_members')
          .select('user_id')
          .in('circle_id', userCircleIds);

        memberIds = allMembers?.map(m => m.user_id).filter(id => id !== null) || [];
        console.log('🟦 [FEED] Total members across all circles:', memberIds.length);
      } else {
        console.log('🟦 [FEED] Fetching posts from specific circle:', targetCircleId);

        // Get members from specific circle
        const { data: members } = await supabase
          .from('circle_members')
          .select('user_id')
          .eq('circle_id', targetCircleId);

        memberIds = members?.map(m => m.user_id).filter(id => id !== null) || [];
        console.log('🟦 [FEED] Circle members found:', memberIds.length);
      }

      console.log('🟦 [FEED] Valid member IDs:', memberIds);
      
      // CRITICAL FIX #2: If no members in circle, return empty (don't fetch ALL posts)
      if (memberIds.length === 0) {
        console.log('🔴 [FEED] User has no circle members - returning empty feed');
        return { posts: [], hasMore: false };
      }
      
      // Get posts from circle members with profile info (with pagination)
      // Add the current user to memberIds to see their own posts
      const idsToQuery = [...new Set([...memberIds, user.id])];
      
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          type,
          content,
          media_url,
          action_title,
          goal_title,
          goal_color,
          streak,
          created_at,
          visibility,
          circle_id,
          is_challenge,
          challenge_name,
          challenge_id,
          challenge_progress,
          leaderboard_position,
          total_participants,
          is_celebration,
          celebration_type,
          metadata,
          post_reactions!left(user_id),
          post_comments!left(id, content, user_id, created_at)
        `, { count: 'exact' })
        .in('user_id', idsToQuery)  // Only posts from circle members + self
        .in('visibility', ['public', 'circle'])  // Circle feed should only show public and circle posts, NOT followers
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ [FEED] Error fetching circle posts:', error);
        throw error;
      }
      
      // DEBUG: Log what we actually got from database
      if (posts && posts.length > 0) {
        console.log('🔍 [DEBUG] First post from DB - all fields:', Object.keys(posts[0]));
        console.log('🔍 [DEBUG] First post challenge fields:', {
          is_challenge: posts[0].is_challenge,
          challenge_name: posts[0].challenge_name,
          challenge_id: posts[0].challenge_id
        });
      }
      
      console.log('📬 [FEED] Circle posts fetched:', posts?.length || 0, 'posts');
      if (posts && posts.length > 0) {
        console.log('📋 [FEED] Post details:', posts.map(p => ({
          id: p.id,
          type: p.type,
          visibility: p.visibility,
          content: p.content?.substring(0, 30),
          action_title: p.action_title,
          user_id: p.user_id,
          created_at: p.created_at
        })));
      }
      
      // Get profiles for all post authors
      const userIds = [...new Set(posts?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', userIds);
      
      // Attach profile info to posts and process reactions/comments
      const postsWithProfiles = posts?.map(post => {
        // Count reactions and check if current user reacted
        const reactionCount = post.post_reactions?.length || 0;
        const userReacted = post.post_reactions?.some((r: any) => r.user_id === user.id) || false;

        // Count comments and transform them
        const commentCount = post.post_comments?.length || 0;
        const comments = post.post_comments?.map((c: any) => ({
          id: c.id,
          content: c.content,
          user: profiles?.find(p => p.id === c.user_id)?.name || 'Anonymous',
          userAvatar: profiles?.find(p => p.id === c.user_id)?.avatar_url || '💬',
          userId: c.user_id,
          createdAt: c.created_at
        })) || [];

        return {
          ...post,
          profiles: profiles?.find(p => p.id === post.user_id) || null,
          reactionCount,  // Changed from likeCount
          userReacted,    // Changed from userLiked
          commentCount,
          comments,  // Include transformed comments
          // Clean up the raw data
          post_reactions: undefined,
          post_comments: undefined,
          // Keep old reactions format for backward compatibility
          reactions: userReacted ? { '🔥': reactionCount } : {}
        };
      }) || [];
      
      // Check if there are more posts to load
      const hasMore = postsWithProfiles.length === limit;
      
      console.log(`📊 Circle feed loaded: ${postsWithProfiles.length} posts (page: ${offset/limit + 1}, hasMore: ${hasMore})`);
      return { posts: postsWithProfiles, hasMore };
    } else {
      // Get posts from people you follow
      console.log('🔍 Fetching Following feed for user:', user?.id);
      
      const { data: following, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user?.id);
      
      if (followError) {
        console.error('❌ Error fetching follows:', followError);
        return { posts: [], hasMore: false };
      }
      
      console.log('👥 Following data:', following);
      
      // CRITICAL FIX: Filter out null following_ids that break the query (same as circle fix)
      const followingIds = following?.map(f => f.following_id).filter(id => id !== null) || [];
      
      console.log('✅ Valid following IDs:', followingIds);
      
      // CRITICAL FIX #2: If not following anyone, return empty (don't fetch ALL posts)
      if (!followingIds || followingIds.length === 0) {
        console.log('📭 [FEED] Not following anyone - returning empty feed');
        return { posts: [], hasMore: false };
      }

      // Add current user to see their own posts in following feed
      const idsToQuery = [...new Set([...followingIds, user.id])];
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          type,
          content,
          media_url,
          action_title,
          goal_title,
          goal_color,
          streak,
          created_at,
          visibility,
          circle_id,
          is_challenge,
          challenge_name,
          challenge_id,
          challenge_progress,
          leaderboard_position,
          total_participants,
          is_celebration,
          celebration_type,
          metadata,
          profiles(name, avatar_url),
          post_reactions!left(user_id),
          post_comments!left(id, content, user_id, created_at)
        `)
        .in('user_id', idsToQuery)  // Only posts from people you follow + self
        .in('visibility', ['public', 'followers'])  // Following feed shows only public and followers posts, NOT circle
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Error fetching following posts:', error);
        throw error;
      }

      // Process reactions and comments
      const postsWithMetrics = data?.map(post => {
        const reactionCount = post.post_reactions?.length || 0;
        const userReacted = post.post_reactions?.some((r: any) => r.user_id === user.id) || false;
        const commentCount = post.post_comments?.length || 0;
        const comments = post.post_comments?.map((c: any) => ({
          id: c.id,
          content: c.content,
          user: post.profiles?.name || 'Anonymous',  // For now, use post author name as we don't have comment author profiles
          userAvatar: post.profiles?.avatar_url || '💬',
          userId: c.user_id,
          createdAt: c.created_at
        })) || [];

        return {
          ...post,
          reactionCount,  // Changed from likeCount
          userReacted,    // Changed from userLiked
          commentCount,
          comments,  // Include comments
          post_reactions: undefined,
          post_comments: undefined,
          reactions: userReacted ? { '🔥': reactionCount } : {}
        };
      }) || [];

      const hasMore = postsWithMetrics.length === limit;
      console.log(`📊 Following feed loaded: ${postsWithMetrics.length} posts (page: ${offset/limit + 1}, hasMore: ${hasMore})`);
      return { posts: postsWithMetrics, hasMore };
    }
  }


  // Image upload function for Phase 4 optimization
  async uploadImage(imageData: string, userId: string): Promise<string> {
    try {
      let base64Data: string;

      // Handle file:// URIs (from iOS image picker with base64: false)
      if (imageData.startsWith('file://')) {
        console.log('📱 Detected file:// URI, reading file...');
        const FileSystem = require('expo-file-system').default;

        // Read file as base64 directly from disk (memory efficient)
        const base64 = await FileSystem.readAsStringAsync(imageData, {
          encoding: FileSystem.EncodingType.Base64,
        });

        base64Data = `data:image/jpeg;base64,${base64}`;
        console.log('✅ File read successfully');
      }
      // Handle base64 data URIs
      else if (imageData.startsWith('data:image')) {
        base64Data = imageData;
      }
      // Fallback - assume it's already base64
      else {
        base64Data = `data:image/jpeg;base64,${imageData}`;
      }

      // Check size (base64 is ~33% larger than binary)
      const sizeInMB = base64Data.length / 1_048_576;
      if (sizeInMB > 5) {
        console.log(`⚠️ Image too large (${sizeInMB.toFixed(1)}MB), keeping as base64`);
        throw new Error('Image too large for upload');
      }

      // Extract the actual base64 data (remove data:image/jpeg;base64, prefix)
      const base64 = base64Data.includes(',')
        ? base64Data.split(',')[1]
        : base64Data;

      // Convert base64 to Uint8Array
      const decoded = atob(base64);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }

      // Generate unique filename
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

      console.log(`📤 Uploading image to Supabase Storage: ${fileName}`);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('post-images')
        .upload(fileName, bytes.buffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Image upload failed:', error);
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('post-images')
        .getPublicUrl(fileName);

      console.log(`✅ Image uploaded successfully: ${publicUrl}`);
      return publicUrl;

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      throw error;
    }
  }

  async createPost(post: {
    type: string;
    visibility: string;
    content: string;
    mediaUrl?: string;
    actionTitle?: string;
    goalTitle?: string;
    goalColor?: string;
    streak?: number;
    circleId?: string | null;
    // Challenge fields
    isChallenge?: boolean;
    challengeName?: string;
    challengeId?: string;
    challengeProgress?: string;
    leaderboardPosition?: number;
    totalParticipants?: number;
    // Celebration fields
    is_celebration?: boolean;
    celebration_type?: string;
    metadata?: any;
  }) {
    // CHECKPOINT 5: Data received in supabaseService
    ChallengeDebugV2.checkpoint('CP5-SUPABASE-RECEIVED', 'Data received in supabaseService.createPost', post);
    
    console.log('🔵 [SUPABASE] createPost called with:', {
      type: post.type,
      visibility: post.visibility,
      content: post.content?.substring(0, 50),
      actionTitle: post.actionTitle,
      circleId: post.circleId,
      // Log challenge fields
      isChallenge: post.isChallenge,
      challengeName: post.challengeName,
      challengeId: post.challengeId,
      challengeProgress: post.challengeProgress
    });
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // User must be authenticated to post
    if (!user) {
      throw new Error('You must be logged in to create posts');
    }
    
    const userId = user.id;
    console.log('👤 [SUPABASE] User ID:', userId);

    // Map camelCase to snake_case for database
    const { 
      mediaUrl, actionTitle, goalTitle, goalColor, circleId,
      isChallenge, challengeName, challengeId, challengeProgress, 
      leaderboardPosition, totalParticipants,
      is_celebration, celebration_type, metadata,
      ...postData 
    } = post;
    
    // Phase 4: Upload image to Storage if it's base64 OR file:// URI
    let finalMediaUrl = mediaUrl;
    if (mediaUrl && (mediaUrl.startsWith('data:image') || mediaUrl.startsWith('file://'))) {
      console.log('🖼️ Detected image for upload (base64 or file URI), uploading to Storage...');
      try {
        finalMediaUrl = await this.uploadImage(mediaUrl, userId);
        console.log('✨ Image optimized and uploaded!');
      } catch (uploadError) {
        console.error('⚠️ Image upload failed:', uploadError);

        // CRITICAL: If it's a file:// URI and upload fails, we CANNOT fall back
        // because the file will be deleted by iOS later
        if (mediaUrl.startsWith('file://')) {
          console.error('🚨 CRITICAL: file:// URI upload failed - photo will NOT persist!');
          throw new Error('Image upload failed. Photo cannot be saved.');
        }

        // For base64, we can fall back to storing it directly (not ideal but works)
        console.log('⚠️ Falling back to base64 storage...');
        finalMediaUrl = mediaUrl;
      }
    }
    
    const insertData = {
      ...postData,
      user_id: userId,
      media_url: finalMediaUrl,  // Use optimized URL or fallback to base64
      action_title: actionTitle,  // Map actionTitle to action_title
      goal_title: goalTitle,  // Map goalTitle to goal_title
      goal_color: goalColor,  // Map goalColor to goal_color
      circle_id: circleId,  // Map circleId to circle_id
      // Map challenge fields to snake_case
      is_challenge: isChallenge || false,
      challenge_name: challengeName,
      challenge_id: challengeId,
      challenge_progress: challengeProgress,
      leaderboard_position: leaderboardPosition,
      total_participants: totalParticipants,
      // Map celebration fields
      is_celebration: is_celebration || false,
      celebration_type: celebration_type,
      metadata: metadata ? JSON.stringify(metadata) : null
    };
    
    // CHECKPOINT 6: Data being inserted to database
    ChallengeDebugV2.checkpoint('CP6-DB-INSERT', 'Data being inserted to posts table', insertData);
    
    console.log('📤 [SUPABASE] Inserting post with data:', {
      user_id: insertData.user_id,
      type: insertData.type,
      visibility: insertData.visibility,
      content: insertData.content?.substring(0, 50),
      action_title: insertData.action_title,
      circle_id: insertData.circle_id,
      // Log challenge fields being saved
      is_challenge: insertData.is_challenge,
      challenge_name: insertData.challenge_name,
      challenge_id: insertData.challenge_id
    });
    
    const { data, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ [SUPABASE] Error creating post:', error);
      throw error;
    }
    
    // CHECKPOINT 7: Data returned from database
    ChallengeDebugV2.checkpoint('CP7-DB-RESPONSE', 'Data returned from database after insert', data);
    
    console.log('✅ [SUPABASE] Post created successfully, ID:', data?.id);
    
    // Return the created post with proper field mapping back to camelCase
    return {
      ...data,
      mediaUrl: data.media_url,
      actionTitle: data.action_title,
      goalTitle: data.goal_title,
      goalColor: data.goal_color,
      // Map challenge fields back to camelCase
      isChallenge: data.is_challenge,
      challengeName: data.challenge_name,
      challengeId: data.challenge_id,
      challengeProgress: data.challenge_progress,
      leaderboardPosition: data.leaderboard_position,
      totalParticipants: data.total_participants
    };
  }

  async getUserPosts(userId: string, limit: number = 5) {
    console.log(`📬 [SUPABASE] Fetching posts for user: ${userId}, limit: ${limit}`);

    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          id,
          name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ [SUPABASE] Error fetching user posts:', error);
      throw error;
    }

    console.log(`✅ [SUPABASE] Found ${posts?.length || 0} posts for user`);

    // Get reactions and comments for these posts
    const postIds = posts?.map(p => p.id) || [];

    const [reactionsData, commentsData] = await Promise.all([
      supabase
        .from('post_reactions')
        .select('*')
        .in('post_id', postIds),
      supabase
        .from('post_comments')
        .select(`
          *,
          profiles!post_comments_user_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .in('post_id', postIds)
        .order('created_at', { ascending: true })
    ]);

    // Map reactions and comments to posts
    const postsWithEngagement = posts?.map(post => ({
      ...post,
      reactions: reactionsData.data?.filter(r => r.post_id === post.id) || [],
      comments: commentsData.data?.filter(c => c.post_id === post.id) || [],
      user: post.profiles?.name || 'Unknown User',
      userId: post.user_id,
      avatarUrl: post.profiles?.avatar_url
    })) || [];

    return postsWithEngagement;
  }

  async reactToPost(postId: string, emoji: string = '🔥') {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user already reacted
    const { data: existing } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Remove reaction if already exists (toggle off)
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) throw error;
      return { removed: true };
    } else {
      // Add new reaction
      const { data, error } = await supabase
        .from('post_reactions')
        .insert({
          post_id: postId,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }

  async addComment(postId: string, content: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getComments(postId: string, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        *,
        profiles!user_id (
          username,
          display_name,
          avatar_emoji
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  // Real-time subscriptions
  subscribeToFeed(callback: (payload: any) => void) {
    return supabase
      .channel('feed')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'posts' },
        callback
      )
      .subscribe();
  }

  // Goal methods
  async getGoals() {
    console.log('🔵 [SUPABASE] Fetching goals for user:', (await this.verifySession()).user?.id);
    const { user } = await this.verifySession();
    if (!user) {
      console.error('🔴 [SUPABASE] Not authenticated - cannot fetch goals!');
      return [];
    }

    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔴 [SUPABASE] Error fetching goals:', error);
      return [];
    }

    console.log('🟢 [SUPABASE] Retrieved', data?.length || 0, 'goals from database');
    
    // Add calculated fields for frontend display
    const goalsWithCalculatedFields = (data || []).map(goal => ({
      ...goal,
      consistency: 0, // This should be calculated based on actions completed
      status: 'On Track' as const // Default status, should be calculated based on consistency
    }));
    
    return goalsWithCalculatedFields;
  }

  async createGoal(goal: {
    title: string;
    metric?: string;
    deadline?: string;
    category?: string;
    color?: string;
    why?: string;
    type?: 'goal' | 'routine';
  }) {
    console.log('🔵 [SUPABASE] Creating goal:', goal.title);
    const { user } = await this.verifySession();
    if (!user) {
      console.error('🔴 [SUPABASE] Not authenticated - cannot create goal!');
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase
      .from('goals')
      .insert({
        ...goal,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('🔴 [SUPABASE] Error creating goal:', error);
      throw error;
    }

    console.log('🟢 [SUPABASE] Goal created with ID:', data.id);
    return data;
  }

  async updateGoal(id: string, updates: any) {
    const { data, error } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Add calculated fields for frontend display
    return {
      ...data,
      consistency: 0,
      status: 'On Track' as const
    };
  }

  async deleteGoal(id: string) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Circle methods
  async createCircle(name: string, description?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('circles')
      .insert({
        name,
        description,
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    
    // Auto-join creator to circle
    await this.joinCircle(data.id);
    
    return data;
  }

  async joinCircleWithCode(inviteCode: string) {
    console.log('🟦 [CIRCLE] Attempting to join circle with code:', inviteCode);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('🔴 [CIRCLE] Not authenticated');
      return { success: false, error: 'Not authenticated', circle_id: null };
    }

    console.log('🟦 [CIRCLE] User authenticated:', user.id);

    // Find circle by join code
    const { data: circles, error: circleError } = await supabase
      .from('circles')
      .select('id, name')
      .ilike('join_code', inviteCode)
      .limit(1);

    if (circleError) {
      console.error('🔴 [CIRCLE] Error searching for circle:', circleError);
      return { success: false, error: circleError.message, circle_id: null };
    }

    if (!circles || circles.length === 0) {
      console.log('🔴 [CIRCLE] No circle found with code:', inviteCode);
      return { success: false, error: 'Invalid circle code', circle_id: null };
    }

    const circle = circles[0];
    console.log('🟢 [CIRCLE] Found circle:', circle.name, circle.id);

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', circle.id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      console.log('🟡 [CIRCLE] User already a member of this circle');
      return { success: false, error: 'Already a member of this circle', circle_id: circle.id };
    }

    // Add to circle_members
    const { error: memberError } = await supabase
      .from('circle_members')
      .insert({
        circle_id: circle.id,
        user_id: user.id
      });

    if (memberError) {
      console.error('🔴 [CIRCLE] Error adding to circle_members:', memberError);
      return { success: false, error: memberError.message, circle_id: null };
    }

    console.log('🟢 [CIRCLE] Added to circle_members');

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ circle_id: circle.id })
      .eq('id', user.id);

    if (profileError) {
      console.error('🔴 [CIRCLE] Error updating profile:', profileError);
      return { success: false, error: profileError.message, circle_id: null };
    }

    console.log('🟢 [CIRCLE] Successfully joined circle!');
    return { success: true, error: null, circle_id: circle.id };
  }

  async joinCircle(circleId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🟦 [CIRCLE] Adding user', user.id, 'to circle', circleId);

    // Add user to circle_members table
    const { error: memberError } = await supabase
      .from('circle_members')
      .insert({
        circle_id: circleId,
        user_id: user.id
      });

    if (memberError && !memberError.message.includes('duplicate')) {
      console.error('🔴 [CIRCLE] Failed to add to circle_members:', memberError);
      throw memberError;
    }

    // Update user's current circle in profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ circle_id: circleId })
      .eq('id', user.id);
    
    if (profileError) {
      console.error('🔴 [CIRCLE] Failed to update profile circle_id:', profileError);
      throw profileError;
    }
    
    console.log('🟢 [CIRCLE] Successfully joined circle and updated profile');
  }

  async getMyCircle() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get user's current circle
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('circle_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return null;
    }

    if (!profile?.circle_id) {
      console.log('User has no circle_id set in profile');
      return null;
    }

    // Get circle details (simplified query without nested joins)
    const { data: circle, error: circleError } = await supabase
      .from('circles')
      .select('*')
      .eq('id', profile.circle_id)
      .single();

    if (circleError) {
      console.error('Error fetching circle:', circleError);
      return null;
    }

    return circle;
  }

  async getCircleMembers(circleId: string) {
    console.log('Fetching members for circle:', circleId);
    
    // First get the member records
    const { data: members, error: membersError } = await supabase
      .from('circle_members')
      .select('user_id, role, joined_at')
      .eq('circle_id', circleId);

    if (membersError) {
      console.error('Error fetching circle members:', membersError);
      console.error('Failed query: SELECT user_id, role, joined_at FROM circle_members WHERE circle_id =', circleId);
      throw membersError;
    }

    if (!members || members.length === 0) {
      console.log('No members found for circle:', circleId);
      return [];
    }

    // Filter out null user_ids and get profiles for valid members
    const validMembers = members.filter(m => m.user_id !== null);
    const userIds = validMembers.map(m => m.user_id);
    
    console.log('Valid user IDs:', userIds);
    
    if (userIds.length === 0) {
      console.log('No valid user IDs found');
      return [];
    }
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name, username, avatar_url')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    // Combine the data
    const membersWithProfiles = validMembers.map(member => {
      const profile = profiles?.find(p => p.id === member.user_id);
      return {
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        profiles: profile || { name: 'Unknown', username: 'unknown', avatar_url: null }
      };
    });
    
    console.log('Fetched circle members with profiles:', membersWithProfiles);
    return membersWithProfiles;
  }

  // NEW: Get all circles the user belongs to (for multiple circles support)
  async getUserCircles() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔵 [CIRCLES] Fetching all circles for user:', user.id);

    // Get all circle memberships for the user
    const { data: memberships, error: membershipError } = await supabase
      .from('circle_members')
      .select(`
        circle_id,
        joined_at,
        circles:circle_id (
          id,
          name,
          created_by,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false });

    if (membershipError) {
      console.error('🔴 [CIRCLES] Error fetching user circles:', membershipError);
      throw membershipError;
    }

    // Transform the data to match our Circle interface
    const circles = (memberships || []).map(membership => {
      const circle = membership.circles;

      // Get member count for each circle (we'll need to do this separately)
      return {
        id: circle.id,
        name: circle.name,
        member_count: 0, // Will be updated below
        created_by: circle.created_by,
        created_at: circle.created_at,
        joined_at: membership.joined_at
      };
    });

    // Get member counts for all circles
    if (circles.length > 0) {
      const circleIds = circles.map(c => c.id);
      const { data: counts, error: countError } = await supabase
        .from('circle_members')
        .select('circle_id')
        .in('circle_id', circleIds);

      if (!countError && counts) {
        // Count members per circle
        const memberCounts = counts.reduce((acc, member) => {
          acc[member.circle_id] = (acc[member.circle_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Update member counts
        circles.forEach(circle => {
          circle.member_count = memberCounts[circle.id] || 0;
        });
      }
    }

    console.log('✅ [CIRCLES] Found', circles.length, 'circles for user');
    return circles;
  }

  // NEW: Leave a circle
  async leaveCircle(circleId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    console.log('🔵 [CIRCLES] User', user.id, 'leaving circle:', circleId);

    // Remove from circle_members table
    const { error: memberError } = await supabase
      .from('circle_members')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', user.id);

    if (memberError) {
      console.error('🔴 [CIRCLES] Error leaving circle:', memberError);
      throw memberError;
    }

    // If this was the user's current circle, clear it from their profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('circle_id')
      .eq('id', user.id)
      .single();

    if (profile?.circle_id === circleId) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ circle_id: null })
        .eq('id', user.id);

      if (profileError) {
        console.error('🔴 [CIRCLES] Error updating profile:', profileError);
        throw profileError;
      }
    }

    console.log('✅ [CIRCLES] Successfully left circle');
  }

  // Following methods
  async followUser(userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: userId
      });

    if (error) throw error;

    // Update counts
    await supabase.rpc('increment', { 
      table_name: 'profiles', 
      column_name: 'following_count',
      row_id: user.id 
    });
    
    await supabase.rpc('increment', { 
      table_name: 'profiles', 
      column_name: 'follower_count',
      row_id: userId 
    });
  }

  async unfollowUser(userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', userId);

    if (error) throw error;
  }

  async getFollowing() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        profiles!follows_following_id_fkey (
          id, name, username, avatar_url
        )
      `)
      .eq('follower_id', user.id);

    if (error) throw error;
    return data || [];
  }

  async getFollowers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        profiles!follows_follower_id_fkey (
          id, name, username, avatar_url
        )
      `)
      .eq('following_id', user.id);

    if (error) throw error;
    return data || [];
  }

  async getAllUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        username,
        avatar_url,
        circle_id,
        circles (
          name
        )
      `)
      .order('name');

    if (error) throw error;

    // Map the data to include circle_name
    return (data || []).map(user => ({
      id: user.id,
      name: user.name,
      username: user.username,
      avatar_url: user.avatar_url,
      circle_name: user.circles?.name || null
    }));
  }

  async getUserProfile(userId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get target user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        name,
        username,
        avatar_url,
        bio,
        circle_id,
        created_at
      `)
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Check if users are in same circle
    let isInSameCircle = false;
    if (profile.circle_id && user.id !== userId) {
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('circle_id')
        .eq('id', user.id)
        .single();
      
      isInSameCircle = currentUserProfile?.circle_id === profile.circle_id;
    }

    // Track profile view (if not viewing own profile)
    if (user.id !== userId) {
      await supabase
        .from('profile_views')
        .insert({
          viewer_id: user.id,
          viewed_id: userId
        })
        .select();
    }

    // Get goals based on privacy settings
    const goalsQuery = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    if (user.id !== userId) {
      if (isInSameCircle) {
        goalsQuery.in('visibility', ['public', 'circle']);
      } else {
        goalsQuery.eq('visibility', 'public');
      }
    }

    const { data: goals } = await goalsQuery;

    // Get actions based on privacy settings
    const actionsQuery = supabase
      .from('actions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (user.id !== userId) {
      if (isInSameCircle) {
        actionsQuery.in('visibility', ['public', 'circle']);
      } else {
        actionsQuery.eq('visibility', 'public');
      }
    }

    const { data: actions } = await actionsQuery;

    // Get posts
    const postsQuery = supabase
      .from('posts')
      .select(`
        *,
        reactions(emoji, user_id)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (user.id !== userId) {
      if (isInSameCircle) {
        postsQuery.in('visibility', ['public', 'circle']);
      } else {
        postsQuery.eq('visibility', 'public');
      }
    }

    const { data: posts } = await postsQuery;

    // Get stats
    const stats = {
      goalsCount: goals?.length || 0,
      actionsCount: actions?.length || 0,
      postsCount: posts?.length || 0,
      streakDays: 0
    };

    // Calculate current streak from actions
    if (actions && actions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let streak = 0;
      let checkDate = new Date(today);
      
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const hasAction = actions.some(a => {
          const actionDate = new Date(a.completed_at || a.created_at);
          return actionDate.toISOString().split('T')[0] === dateStr;
        });
        
        if (hasAction) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
        
        if (streak > 365) break; // Safety limit
      }
      
      stats.streakDays = streak;
    }

    return {
      profile,
      goals: goals || [],
      actions: actions || [],
      posts: posts || [],
      stats,
      isInSameCircle,
      isOwnProfile: user.id === userId
    };
  }

}

export const supabaseService = new SupabaseService();// Refresh

