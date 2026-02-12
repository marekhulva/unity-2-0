import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase.service';

export class PushNotificationsService {
  private static deviceToken: string | null = null;

  /**
   * Register device for push notifications and store token in database
   */
  static async registerForPushNotifications(): Promise<{ success: boolean; token?: string; error?: string }> {
    if (__DEV__) console.log('📱 [PUSH] Registering for push notifications...');

    // Check if physical device (push notifications don't work on simulator)
    if (!Device.isDevice) {
      if (__DEV__) console.log('⚠️  [PUSH] Must use physical device for push notifications');
      return { success: false, error: 'Must use physical device' };
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        if (__DEV__) console.log('❌ [PUSH] Permission denied');
        return { success: false, error: 'Permission denied' };
      }

      // Get the token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '45fa4417-6061-4661-9881-0ee7cf571b4e', // From app.json
      });

      const token = tokenData.data;
      this.deviceToken = token;

      if (__DEV__) console.log('✅ [PUSH] Got device token:', token);

      // Store token in database
      await this.saveTokenToDatabase(token);

      return { success: true, token };
    } catch (error: any) {
      if (__DEV__) console.error('❌ [PUSH] Error registering:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save push token to database
   */
  private static async saveTokenToDatabase(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (__DEV__) console.log('⚠️  [PUSH] No user logged in');
        return;
      }

      const platform = Platform.OS as 'ios' | 'android' | 'web';
      const deviceName = Device.deviceName || 'Unknown Device';

      // Upsert token (insert or update if exists)
      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token,
          platform,
          device_name: deviceName,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        });

      if (error) {
        if (__DEV__) console.error('❌ [PUSH] Error saving token:', error);
      } else {
        if (__DEV__) console.log('✅ [PUSH] Token saved to database');
      }
    } catch (error) {
      if (__DEV__) console.error('❌ [PUSH] Exception saving token:', error);
    }
  }

  /**
   * Unregister device (remove token from database)
   */
  static async unregisterDevice(): Promise<void> {
    if (!this.deviceToken) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', this.deviceToken);

      if (__DEV__) console.log('✅ [PUSH] Device unregistered');
      this.deviceToken = null;
    } catch (error) {
      if (__DEV__) console.error('❌ [PUSH] Error unregistering:', error);
    }
  }

  /**
   * Get current device token
   */
  static getDeviceToken(): string | null {
    return this.deviceToken;
  }
}
