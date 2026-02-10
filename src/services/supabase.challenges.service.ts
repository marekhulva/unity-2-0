import { supabase } from './supabase.service';
import type {
  Challenge,
  ChallengeWithDetails,
  ChallengeParticipant,
  ChallengeCompletion,
  UserBadge,
  LeaderboardEntry,
  ChallengeForumThread,
  ChallengeForumReply,
  ActivityTime,
  PredeterminedActivity,
} from '../types/challenges.types';

class SupabaseChallengeService {
  supabase = supabase;

  // Ensure activities have IDs (generate from title hash if missing)
  private ensureActivityIds(activities: any[]): any[] {
    if (!activities || !Array.isArray(activities)) return [];
    return activities.map((activity, index) => ({
      ...activity,
      id: activity.id || `activity-${index}-${activity.title?.replace(/\s+/g, '-').toLowerCase() || index}`,
    }));
  }

  // Add IDs to challenge activities
  private enrichChallengeWithActivityIds(challenge: any): any {
    return {
      ...challenge,
      predetermined_activities: this.ensureActivityIds(challenge.predetermined_activities),
    };
  }

  async getGlobalChallenges(): Promise<Challenge[]> {
    if (__DEV__) console.log('🌍 [CHALLENGES] Fetching global challenges');

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('scope', 'global')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching global challenges:', error);
      throw error;
    }

    const challengesWithCounts = await Promise.all(
      (data || []).map(async (challenge) => {
        const participantCount = await this.getParticipantCount(challenge.id);
        return this.enrichChallengeWithActivityIds({
          ...challenge,
          participant_count: participantCount,
        });
      })
    );

    if (__DEV__) console.log('🟢 [CHALLENGES] Found global challenges:', challengesWithCounts.length);
    return challengesWithCounts;
  }

  async getCircleChallenges(circleId: string): Promise<Challenge[]> {
    if (__DEV__) console.log('👥 [CHALLENGES] Fetching challenges for circle:', circleId);

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('scope', 'circle')
      .eq('circle_id', circleId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching circle challenges:', error);
      throw error;
    }

    const challengesWithCounts = await Promise.all(
      (data || []).map(async (challenge) => {
        const participantCount = await this.getParticipantCount(challenge.id);
        return this.enrichChallengeWithActivityIds({
          ...challenge,
          participant_count: participantCount,
        });
      })
    );

    if (__DEV__) console.log('🟢 [CHALLENGES] Found circle challenges:', challengesWithCounts.length);
    return challengesWithCounts;
  }

  async getAllUserCircleChallenges(): Promise<Challenge[]> {
    if (__DEV__) console.log('👥 [CHALLENGES] Fetching all challenges from user circles');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (__DEV__) console.log('🔴 [CHALLENGES] No user found');
      return [];
    }

    const { data: circleData, error: circleError } = await supabase
      .from('circle_members')
      .select('circle_id')
      .eq('user_id', user.id);

    if (circleError) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching user circles:', circleError);
      return [];
    }

    if (!circleData || circleData.length === 0) {
      if (__DEV__) console.log('🟡 [CHALLENGES] User has no circles');
      return [];
    }

    const circleIds = circleData.map(c => c.circle_id);
    if (__DEV__) console.log('🟢 [CHALLENGES] User is in', circleIds.length, 'circles');

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('scope', 'circle')
      .in('circle_id', circleIds)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching all circle challenges:', error);
      throw error;
    }

    const challengesWithCounts = await Promise.all(
      (data || []).map(async (challenge) => {
        const participantCount = await this.getParticipantCount(challenge.id);
        return this.enrichChallengeWithActivityIds({
          ...challenge,
          participant_count: participantCount,
        });
      })
    );

    if (__DEV__) console.log('🟢 [CHALLENGES] Found total circle challenges:', challengesWithCounts.length);
    return challengesWithCounts;
  }

  async getChallenge(challengeId: string): Promise<ChallengeWithDetails | null> {
    if (__DEV__) console.log('🔍 [CHALLENGES] Fetching challenge:', challengeId);

    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching challenge:', error);
      return null;
    }

    if (__DEV__) console.log('🟢 [CHALLENGES] Challenge data loaded:', data?.name);

    const participantCount = await this.getParticipantCount(challengeId);
    if (__DEV__) console.log('🟢 [CHALLENGES] Participant count:', participantCount);

    const myParticipation = await this.getMyParticipation(challengeId);
    if (__DEV__) console.log('🟢 [CHALLENGES] My participation:', myParticipation ? 'Found' : 'Not found', myParticipation);

    return this.enrichChallengeWithActivityIds({
      ...data,
      participant_count: participantCount,
      my_participation: myParticipation || undefined,
    });
  }

  async getParticipantCount(challengeId: string): Promise<number> {
    const { count, error } = await supabase
      .from('challenge_participants')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', challengeId);

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error counting participants:', error);
      return 0;
    }

    return count || 0;
  }

  async getMyParticipation(challengeId: string): Promise<ChallengeParticipant | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error getting participation:', error);
    }

    return data;
  }

  async joinChallenge(
    challengeId: string,
    selectedActivityIds: string[],
    activityTimes: ActivityTime[]
  ): Promise<{ success: boolean; data?: ChallengeParticipant; error?: string }> {
    if (__DEV__) console.log('🏆 [CHALLENGES] Joining challenge:', challengeId);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const existing = await this.getMyParticipation(challengeId);
    if (existing) {
      return { success: false, error: 'Already joined this challenge' };
    }

    const { data: challenge } = await supabase
      .from('challenges')
      .select('duration_days')
      .eq('id', challengeId)
      .single();

    if (!challenge) {
      return { success: false, error: 'Challenge not found' };
    }

    const personalStartDate = new Date();
    const personalEndDate = new Date();
    personalEndDate.setDate(personalEndDate.getDate() + challenge.duration_days);

    const { data, error } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        user_id: user.id,
        selected_activity_ids: selectedActivityIds,
        activity_times: activityTimes,
        personal_start_date: personalStartDate.toISOString(),
        personal_end_date: personalEndDate.toISOString(),
        current_day: 1,
        completed_days: 0,
        current_streak: 0,
        longest_streak: 0,
        completion_percentage: 0,
      })
      .select()
      .single();

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error joining challenge:', error);
      return { success: false, error: error.message };
    }

    if (__DEV__) console.log('🟢 [CHALLENGES] Successfully joined challenge with personal start date:', personalStartDate.toISOString());
    return { success: true, data };
  }

  async leaveChallenge(
    participantId: string,
    keepActivities: boolean
  ): Promise<{ success: boolean; error?: string }> {
    if (__DEV__) console.log('🚪 [CHALLENGES] Leaving challenge:', participantId);

    const { error } = await supabase
      .from('challenge_participants')
      .update({
        status: 'left',
        left_at: new Date().toISOString(),
        kept_activities: keepActivities,
      })
      .eq('id', participantId);

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error leaving challenge:', error);
      return { success: false, error: error.message };
    }

    if (__DEV__) console.log('🟢 [CHALLENGES] Successfully left challenge');
    return { success: true };
  }

  async recordCompletion(
    participantId: string,
    activityId: string,
    linkedActionId?: string,
    photoUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (__DEV__) console.log('✅ [CHALLENGES] Recording completion:', {
      participantId,
      activityId,
      linkedActionId,
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: participant, error: participantError } = await supabase
      .from('challenge_participants')
      .select('user_id, challenge_id')
      .eq('id', participantId)
      .single();

    if (participantError || !participant) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching participant:', participantError);
      return { success: false, error: 'Participant not found' };
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('challenge_completions')
      .select('id')
      .eq('participant_id', participantId)
      .eq('challenge_activity_id', activityId)
      .eq('completion_date', today)
      .maybeSingle();

    if (existing) {
      if (__DEV__) console.log('⚠️ [CHALLENGES] Activity already completed today');
      return { success: false, error: 'Already completed today' };
    }

    const completionData: any = {
      user_id: participant.user_id,
      challenge_id: participant.challenge_id,
      participant_id: participantId,
      challenge_activity_id: activityId,
      completion_date: today,
      verification_type: photoUrl ? 'photo' : 'honor',
    };

    if (linkedActionId) {
      completionData.action_id = linkedActionId;
    }

    if (photoUrl) {
      completionData.photo_url = photoUrl;
    }

    const { error } = await supabase
      .from('challenge_completions')
      .insert(completionData);

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error recording completion:', error);
      return { success: false, error: error.message };
    }

    await this.updateParticipantProgress(participant.challenge_id, participant.user_id);

    if (__DEV__) console.log('🟢 [CHALLENGES] Completion recorded successfully');
    return { success: true };
  }

  async updateParticipantProgress(challengeId: string, userId: string): Promise<void> {
    if (__DEV__) console.log('📊 [CHALLENGES] Updating participant progress');

    const { data: participant } = await supabase
      .from('challenge_participants')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .single();

    if (!participant) return;

    const { data: challenge } = await supabase
      .from('challenges')
      .select('duration_days, success_threshold')
      .eq('id', challengeId)
      .single();

    if (!challenge) return;

    const { count: completedActivities } = await supabase
      .from('challenge_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('challenge_id', challengeId);

    const totalDays = challenge.duration_days;

    // Calculate current day (days since personal start)
    const currentDay = Math.floor(
      (new Date().getTime() - new Date(participant.personal_start_date).getTime()) /
        (1000 * 60 * 60 * 24)
    ) + 1;

    // Calculate consistency: (completed activities / expected activities so far) × 100
    // Get number of activities user selected for this challenge
    const activitiesPerDay = participant.selected_activity_ids?.length || 1;
    const daysSoFar = Math.min(currentDay, totalDays);
    const expectedActivities = daysSoFar * activitiesPerDay;

    const completionPercentage = expectedActivities > 0
      ? Math.round(((completedActivities || 0) / expectedActivities) * 100)
      : 0;

    if (__DEV__) console.log(`📊 Challenge consistency: ${completedActivities || 0}/${expectedActivities} activities (${daysSoFar} days × ${activitiesPerDay} activities/day) = ${completionPercentage}%`);

    const daysTaken = currentDay > totalDays ? totalDays : currentDay;

    let status = participant.status;
    let badgeEarned = participant.badge_earned;

    if (currentDay > totalDays) {
      if (completionPercentage >= challenge.success_threshold) {
        status = 'completed';
        if (completionPercentage >= 80) badgeEarned = 'gold';
        else if (completionPercentage >= 60) badgeEarned = 'silver';
        else badgeEarned = 'bronze';
      } else {
        status = 'failed';
        badgeEarned = 'failed';
      }
    }

    // Calculate unique days with completions (for display purposes only)
    // This is SEPARATE from consistency % which is activity-based
    // Shows "X / Y days completed" in UI to indicate engagement
    const { data: uniqueDays } = await supabase
      .from('challenge_completions')
      .select('completion_date')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId);

    const completedDaysCount = uniqueDays
      ? new Set(uniqueDays.map(d => d.completion_date)).size
      : 0;

    await supabase
      .from('challenge_participants')
      .update({
        completed_days: completedDaysCount,
        current_day: currentDay,
        completion_percentage: completionPercentage,
        days_taken: daysTaken,
        status,
        badge_earned: badgeEarned,
        completed_at: status === 'completed' ? new Date().toISOString() : participant.completed_at,
        last_completion_at: new Date().toISOString(),
      })
      .eq('id', participant.id);

    if (status === 'completed' && badgeEarned && badgeEarned !== 'failed') {
      await this.awardBadge(userId, challengeId, badgeEarned as any);
    }

    await this.recalculateLeaderboardRanks(challengeId);

    if (__DEV__) console.log('🟢 [CHALLENGES] Progress updated:', { completionPercentage, status, badgeEarned });
  }

  async awardBadge(
    userId: string,
    challengeId: string,
    badgeType: 'gold' | 'silver' | 'bronze'
  ): Promise<void> {
    if (__DEV__) console.log('🏆 [CHALLENGES] Awarding badge:', badgeType);

    const { data: challenge } = await supabase
      .from('challenges')
      .select('badge_emoji, badge_name')
      .eq('id', challengeId)
      .single();

    if (!challenge) return;

    const { data: participant } = await supabase
      .from('challenge_participants')
      .select('completion_percentage, days_taken')
      .eq('user_id', userId)
      .eq('challenge_id', challengeId)
      .single();

    if (!participant) return;

    const { error } = await supabase.rpc('insert_badge', {
      p_user_id: userId,
      p_challenge_id: challengeId,
      p_badge_type: badgeType,
      p_badge_emoji: challenge.badge_emoji || '🏆',
      p_badge_name: challenge.badge_name || 'Champion',
      p_completion_percentage: participant.completion_percentage,
      p_days_taken: participant.days_taken,
    });

    if (error && !error.message.includes('duplicate')) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error awarding badge:', error);
    }
  }

  async getLeaderboard(
    challengeId: string,
    options?: {
      filter?: 'all' | 'friends' | 'circle';
      sort?: 'rank' | 'fastest' | 'perfect';
      limit?: number;
    }
  ): Promise<LeaderboardEntry[]> {
    if (__DEV__) console.log('🏆 [CHALLENGES] Fetching leaderboard for:', challengeId, options);

    const { filter = 'all', sort = 'rank', limit = 100 } = options || {};

    let query = supabase
      .from('challenge_participants')
      .select(`
        user_id,
        completion_percentage,
        completed_days,
        current_streak,
        days_taken,
        "rank",
        percentile,
        profiles!user_id (
          name,
          avatar_url
        )
      `)
      .eq('challenge_id', challengeId)
      .neq('status', 'left');

    if (filter === 'friends') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: friendships } = await supabase
          .from('friendships')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        const friendIds = friendships?.map(f => f.friend_id) || [];
        if (friendIds.length > 0) {
          query = query.in('user_id', [...friendIds, user.id]);
        }
      }
    } else if (filter === 'circle') {
      const { data: challenge } = await supabase
        .from('challenges')
        .select('circle_id')
        .eq('id', challengeId)
        .single();

      if (challenge?.circle_id) {
        const { data: members } = await supabase
          .from('circle_members')
          .select('user_id')
          .eq('circle_id', challenge.circle_id);

        const memberIds = members?.map(m => m.user_id) || [];
        if (memberIds.length > 0) {
          query = query.in('user_id', memberIds);
        }
      }
    }

    switch (sort) {
      case 'fastest':
        query = query.order('days_taken', { ascending: true }).order('completion_percentage', { ascending: false });
        break;
      case 'perfect':
        query = query.order('completion_percentage', { ascending: false }).order('days_taken', { ascending: true });
        break;
      case 'rank':
      default:
        query = query.order('completion_percentage', { ascending: false }).order('days_taken', { ascending: true });
        break;
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching leaderboard:', error);
      throw error;
    }

    const leaderboard: LeaderboardEntry[] = (data || []).map((entry: any, index: number) => ({
      user_id: entry.user_id,
      username: entry.profiles?.name || 'Unknown',
      name: entry.profiles?.name,
      avatar_url: entry.profiles?.avatar_url,
      completion_percentage: entry.completion_percentage || 0,
      completed_days: entry.completed_days || 0,
      current_streak: entry.current_streak || 0,
      days_taken: entry.days_taken,
      rank: entry.rank || index + 1,
      percentile: entry.percentile,
    }));

    return leaderboard;
  }

  async recalculateLeaderboardRanks(challengeId: string): Promise<void> {
    if (__DEV__) console.log('📊 [CHALLENGES] Recalculating leaderboard ranks for:', challengeId);

    const { data: participants, error } = await supabase
      .from('challenge_participants')
      .select('id, user_id, completed_days, days_taken, completion_percentage')
      .eq('challenge_id', challengeId)
      .neq('status', 'left');

    if (error || !participants || participants.length === 0) {
      if (__DEV__) console.log('❌ [CHALLENGES] No participants to rank');
      return;
    }

    const { data: challenge } = await supabase
      .from('challenges')
      .select('duration_days')
      .eq('id', challengeId)
      .single();

    if (!challenge) return;

    const ranked = participants
      .map(p => {
        const progressScore = ((p.completed_days || 0) / challenge.duration_days) * 1000;
        const speedScore = 1000 - (p.days_taken || 0);
        const rankScore = progressScore + speedScore;

        return {
          id: p.id,
          user_id: p.user_id,
          rankScore,
          completion_percentage: p.completion_percentage || 0,
          days_taken: p.days_taken || 0,
        };
      })
      .sort((a, b) => b.rankScore - a.rankScore);

    const totalParticipants = ranked.length;

    for (let i = 0; i < ranked.length; i++) {
      const rank = i + 1;
      const percentile = ((totalParticipants - rank) / totalParticipants) * 100;

      await supabase
        .from('challenge_participants')
        .update({
          rank,
          percentile: Math.round(percentile * 10) / 10,
        })
        .eq('id', ranked[i].id);
    }

    if (__DEV__) console.log('🟢 [CHALLENGES] Ranks updated for', ranked.length, 'participants');
  }

  async getMyActiveChallenges(): Promise<ChallengeWithDetails[]> {
    if (__DEV__) console.log('📋 [CHALLENGES] Fetching my active challenges');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: participations, error } = await supabase
      .from('challenge_participants')
      .select(`
        *,
        challenges!inner (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching active challenges:', error);
      return [];
    }

    const challenges: ChallengeWithDetails[] = await Promise.all(
      (participations || []).map(async (p: any) => {
        const participantCount = await this.getParticipantCount(p.challenges.id);
        return {
          ...p.challenges,
          participant_count: participantCount,
          my_participation: p,
        };
      })
    );

    return challenges;
  }

  async getMyCompletedChallenges(): Promise<ChallengeWithDetails[]> {
    if (__DEV__) console.log('✅ [CHALLENGES] Fetching my completed challenges');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: participations, error } = await supabase
      .from('challenge_participants')
      .select(`
        *,
        challenges!inner (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching completed challenges:', error);
      return [];
    }

    const challenges: ChallengeWithDetails[] = await Promise.all(
      (participations || []).map(async (p: any) => {
        const participantCount = await this.getParticipantCount(p.challenges.id);
        return {
          ...p.challenges,
          participant_count: participantCount,
          my_participation: p,
        };
      })
    );

    return challenges;
  }

  async getMyBadges(): Promise<UserBadge[]> {
    if (__DEV__) console.log('🏆 [CHALLENGES] Fetching my badges');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching badges:', error);
      return [];
    }

    return data || [];
  }

  async getForumThreads(challengeId: string): Promise<ChallengeForumThread[]> {
    if (__DEV__) console.log('💬 [CHALLENGES] Fetching forum threads for:', challengeId);

    const { data, error } = await supabase
      .from('challenge_forum_threads')
      .select('*')
      .eq('challenge_id', challengeId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching forum threads:', error);
      throw error;
    }

    return data || [];
  }

  async createForumThread(
    challengeId: string,
    title: string,
    content: string,
    category?: string
  ): Promise<{ success: boolean; data?: ChallengeForumThread; error?: string }> {
    if (__DEV__) console.log('💬 [CHALLENGES] Creating forum thread');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('challenge_forum_threads')
      .insert({
        challenge_id: challengeId,
        author_id: user.id,
        title,
        content,
        category,
      })
      .select()
      .single();

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error creating forum thread:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  async getForumReplies(threadId: string): Promise<ChallengeForumReply[]> {
    if (__DEV__) console.log('💬 [CHALLENGES] Fetching forum replies for:', threadId);

    const { data, error } = await supabase
      .from('challenge_forum_replies')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching forum replies:', error);
      throw error;
    }

    return data || [];
  }

  async createForumReply(
    threadId: string,
    content: string,
    parentReplyId?: string
  ): Promise<{ success: boolean; data?: ChallengeForumReply; error?: string }> {
    if (__DEV__) console.log('💬 [CHALLENGES] Creating forum reply');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('challenge_forum_replies')
      .insert({
        thread_id: threadId,
        author_id: user.id,
        content,
        parent_reply_id: parentReplyId,
      })
      .select()
      .single();

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error creating forum reply:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  async getUserChallengeActivities(): Promise<any[]> {
    if (__DEV__) console.log('🏆 [CHALLENGES] Fetching user challenge activities for Daily page');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      if (__DEV__) console.log('❌ [CHALLENGES] No user found');
      return [];
    }

    const { data: participations, error } = await supabase
      .from('challenge_participants')
      .select(`
        id,
        challenge_id,
        selected_activity_ids,
        linked_action_ids,
        activity_times,
        personal_start_date,
        challenges!inner (
          id,
          name,
          status,
          predetermined_activities,
          duration_days
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('challenges.status', 'active');

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching participations:', error);
      return [];
    }

    if (!participations || participations.length === 0) {
      if (__DEV__) console.log('📊 [CHALLENGES] No active challenge participations');
      return [];
    }

    const activities = [];
    for (const participation of participations) {
      const challenge = participation.challenges;
      // Ensure activities have IDs using the same logic as when fetching challenges
      const predeterminedActivities = this.ensureActivityIds(challenge.predetermined_activities || []);
      const selectedIds = participation.selected_activity_ids || [];
      const linkedIds = participation.linked_action_ids || [];

      // Calculate current day of challenge for day-specific filtering
      const startDate = new Date(participation.personal_start_date);
      const today = new Date();
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = daysSinceStart + 1; // 1-based

      if (__DEV__) console.log('📅 [CHALLENGES] Challenge', challenge.name, '- Current Day:', currentDay);

      // If selectedIds contains undefined/null, it means the user joined before IDs were added
      // In that case, include ALL activities from the challenge
      const hasValidSelectedIds = selectedIds.length > 0 && selectedIds.every((id: any) => id && id !== 'undefined');

      if (hasValidSelectedIds) {
        // Normal case: user has valid selected activity IDs
        for (const activityId of selectedIds) {
          if (linkedIds.includes(activityId)) continue;

          const activity = predeterminedActivities.find((a: any) => a.id === activityId);
          if (activity) {
            // Check if activity should show today (day-specific filtering)
            const startDay = activity.start_day || 1;
            const endDay = activity.end_day || challenge.duration_days;

            if (currentDay >= startDay && currentDay <= endDay) {
              const activityTime = (participation.activity_times || []).find(
                (t: any) => t.activity_id === activityId && !t.is_link
              );

              activities.push({
                id: activityId,
                title: activity.title,
                emoji: activity.emoji,
                challengeId: challenge.id,
                challengeName: challenge.name,
                participantId: participation.id,
                scheduledTime: activityTime?.scheduled_time,
                is_abstinence: activity.is_abstinence || false,
              });
            } else {
              if (__DEV__) console.log('⏭️  [CHALLENGES] Skipping activity', activity.title, '(days', startDay, '-', endDay, ', current:', currentDay, ')');
            }
          }
        }
      } else {
        // Fallback: include all activities from the challenge (for legacy participations)
        if (__DEV__) console.log('🟡 [CHALLENGES] Using fallback: including all activities for participation', participation.id);
        for (const activity of predeterminedActivities) {
          if (linkedIds.includes(activity.id)) continue;

          // Check if activity should show today (day-specific filtering)
          const startDay = activity.start_day || 1;
          const endDay = activity.end_day || challenge.duration_days;

          if (currentDay >= startDay && currentDay <= endDay) {
            const activityTime = (participation.activity_times || []).find(
              (t: any) => t.activity_id === activity.id && !t.is_link
            );

            activities.push({
              id: activity.id,
              title: activity.title,
              emoji: activity.emoji,
              challengeId: challenge.id,
              challengeName: challenge.name,
              participantId: participation.id,
              scheduledTime: activityTime?.scheduled_time,
              is_abstinence: activity.is_abstinence || false,
            });
          } else {
            if (__DEV__) console.log('⏭️  [CHALLENGES] Skipping activity', activity.title, '(days', startDay, '-', endDay, ', current:', currentDay, ')');
          }
        }
      }
    }

    if (__DEV__) console.log('🟢 [CHALLENGES] Found', activities.length, 'unlinked activities');
    return activities;
  }

  async getLinkedChallengeActivities(): Promise<any[]> {
    if (__DEV__) console.log('🔗 [CHALLENGES] Fetching linked challenge activities');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: participations, error } = await supabase
      .from('challenge_participants')
      .select(`
        id,
        challenge_id,
        linked_action_ids,
        activity_times,
        challenges!inner (
          id,
          name,
          predetermined_activities
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error || !participations) return [];

    const linkedActivities = [];
    for (const participation of participations) {
      const activityTimes = participation.activity_times || [];
      const links = activityTimes.filter((t: any) => t.is_link);

      for (const link of links) {
        linkedActivities.push({
          linkedActionId: link.linked_to,
          challengeId: participation.challenge_id,
          challengeActivityId: link.activity_id,
          participantId: participation.id,
          challengeName: participation.challenges.name,
        });
      }
    }

    return linkedActivities;
  }

  async getTodayUserCompletions(): Promise<any[]> {
    if (__DEV__) console.log('✅ [CHALLENGES] Fetching today\'s completions');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('challenge_completions')
      .select('*')
      .eq('user_id', user.id)
      .gte('completed_at', `${today}T00:00:00`)
      .lt('completed_at', `${today}T23:59:59`);

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching completions:', error);
      return [];
    }

    return data || [];
  }

  async getUserParticipations(): Promise<any[]> {
    if (__DEV__) console.log('📋 [CHALLENGES] Fetching user participations');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('challenge_participants')
      .select(`
        id,
        challenge_id,
        activity_times,
        challenges!inner (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching participations:', error);
      return [];
    }

    return data || [];
  }

  async recordChallengeActivity(
    participantId: string,
    activityId: string,
    linkedActionId?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (__DEV__) console.log('🏆 [CHALLENGES] Recording challenge activity completion:', {
      participantId,
      activityId,
      linkedActionId,
    });

    const { data: participant, error: participantError } = await supabase
      .from('challenge_participants')
      .select('user_id, challenge_id')
      .eq('id', participantId)
      .single();

    if (participantError || !participant) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error fetching participant:', participantError);
      return { success: false, error: 'Participant not found' };
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: existing } = await supabase
      .from('challenge_completions')
      .select('id')
      .eq('participant_id', participantId)
      .eq('challenge_activity_id', activityId)
      .eq('completion_date', today)
      .maybeSingle();

    if (existing) {
      if (__DEV__) console.log('⚠️ [CHALLENGES] Activity already completed today');
      return { success: false, error: 'Already completed today' };
    }

    const completionData: any = {
      user_id: participant.user_id,
      challenge_id: participant.challenge_id,
      participant_id: participantId,
      challenge_activity_id: activityId,
      completion_date: today,
      verification_type: 'honor',
    };

    if (linkedActionId) {
      completionData.action_id = linkedActionId;
    }

    const { error: insertError } = await supabase
      .from('challenge_completions')
      .insert(completionData);

    if (insertError) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Error recording completion:', insertError);
      return { success: false, error: insertError.message };
    }

    await this.updateParticipantProgress(participant.challenge_id, participant.user_id);

    if (__DEV__) console.log('🟢 [CHALLENGES] Activity completed successfully');
    return { success: true };
  }

  async createChallenge(params: {
    circleId: string;
    name: string;
    description: string;
    emoji: string;
    durationDays: number;
    successThreshold: number;
    activities: PredeterminedActivity[];
  }): Promise<{ success: boolean; challengeId?: string; error?: string }> {
    try {
      if (__DEV__) console.log('🎯 [CHALLENGES] Creating new circle challenge:', params.name);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: challenge, error } = await supabase
        .from('challenges')
        .insert({
          circle_id: params.circleId,
          name: params.name,
          description: params.description,
          emoji: params.emoji,
          type: 'streak',
          scope: 'circle',
          duration_days: params.durationDays,
          success_threshold: params.successThreshold,
          predetermined_activities: params.activities,
          status: 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (__DEV__) console.error('🔴 [CHALLENGES] Error creating challenge:', error);
        return { success: false, error: error.message };
      }

      if (__DEV__) console.log('✅ [CHALLENGES] Challenge created successfully:', challenge.id);
      return { success: true, challengeId: challenge.id };
    } catch (error: any) {
      if (__DEV__) console.error('🔴 [CHALLENGES] Exception creating challenge:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }
}

export const supabaseChallengeService = new SupabaseChallengeService();
