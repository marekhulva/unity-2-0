import { supabase } from './supabase.service';

export interface Notification {
  id: string;
  user_id: string;
  type: 'challenge_invite' | 'challenge_start' | 'activity_reminder' | 'streak_milestone' | 'challenge_complete' | 'badge_earned' | 'circle_challenge_created';
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  created_at: string;
  read_at?: string;
  action_url?: string;
}

class SupabaseNotificationService {
  async getNotifications(limit = 50): Promise<Notification[]> {
    try {
      console.log('🔔 [NOTIFICATIONS] Fetching notifications, limit:', limit);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ [NOTIFICATIONS] No user found');
        return [];
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('🔴 [NOTIFICATIONS] Error fetching:', error);
        return [];
      }

      console.log('🟢 [NOTIFICATIONS] Fetched', data?.length || 0, 'notifications');
      return data || [];
    } catch (error) {
      console.error('🔴 [NOTIFICATIONS] Exception:', error);
      return [];
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('🔴 [NOTIFICATIONS] Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('🔴 [NOTIFICATIONS] Exception getting count:', error);
      return 0;
    }
  }

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    try {
      console.log('🔔 [NOTIFICATIONS] Marking as read:', notificationId);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ [NOTIFICATIONS] No user found');
        return { success: false };
      }

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) {
        console.error('🔴 [NOTIFICATIONS] Error marking as read:', error);
        return { success: false };
      }

      console.log('✅ [NOTIFICATIONS] Marked as read');
      return { success: true };
    } catch (error) {
      console.error('🔴 [NOTIFICATIONS] Exception:', error);
      return { success: false };
    }
  }

  async markAllAsRead(): Promise<{ success: boolean }> {
    try {
      console.log('🔔 [NOTIFICATIONS] Marking all as read');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ [NOTIFICATIONS] No user found');
        return { success: false };
      }

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('🔴 [NOTIFICATIONS] Error marking all as read:', error);
        return { success: false };
      }

      console.log('✅ [NOTIFICATIONS] All marked as read');
      return { success: true };
    } catch (error) {
      console.error('🔴 [NOTIFICATIONS] Exception:', error);
      return { success: false };
    }
  }

  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    body: string,
    data: any = {},
    actionUrl?: string
  ): Promise<{ success: boolean; notification?: Notification }> {
    try {
      console.log('🔔 [NOTIFICATIONS] Creating notification:', { userId, type, title });

      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          body,
          data,
          action_url: actionUrl,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('🔴 [NOTIFICATIONS] Error creating:', error);
        return { success: false };
      }

      console.log('✅ [NOTIFICATIONS] Created successfully');
      return { success: true, notification };
    } catch (error) {
      console.error('🔴 [NOTIFICATIONS] Exception:', error);
      return { success: false };
    }
  }

  subscribeToNotifications(callback: (payload: any) => void) {
    const { data: { user } } = supabase.auth.getUser();
    if (!user) return null;

    console.log('🔔 [NOTIFICATIONS] Subscribing to realtime notifications');

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user}`,
        },
        (payload) => {
          console.log('🔔 [NOTIFICATIONS] New notification received:', payload);
          callback(payload);
        }
      )
      .subscribe();

    return channel;
  }
}

export const supabaseNotificationService = new SupabaseNotificationService();
