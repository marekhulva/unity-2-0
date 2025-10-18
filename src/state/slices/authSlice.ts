import { StateCreator } from 'zustand';
import { backendService } from '../../services/backend.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase.service';

export type User = {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  circleId?: string;
  circleName?: string;
  followingCount?: number;
  followerCount?: number;
};

export type AuthSlice = {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isNewUser: boolean;
  hasCompletedProfileSetup: boolean;
  hasCompletedOnboarding: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  updateAvatar: (avatarUri: string) => Promise<boolean>;
  updateBio: (bio: string) => Promise<boolean>;
  completeProfileSetup: () => Promise<void>;
  completeFullOnboarding: () => Promise<void>;
};

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  loading: false,
  error: null,
  isNewUser: false,
  hasCompletedProfileSetup: false,
  hasCompletedOnboarding: false,

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const response = await backendService.signIn(email, password);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        
        // Save to storage (only if we have valid values)
        if (token) {
          await AsyncStorage.setItem('token', token);
        }
        if (user) {
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }
        
        // Check onboarding status for existing users
        const isNewUserFlag = await AsyncStorage.getItem('isNewUser');
        const hasProfileSetup = await AsyncStorage.getItem('hasCompletedProfileSetup');
        const hasOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
        
        // Check if user has goals (indicates completed onboarding)
        let actuallyCompletedOnboarding = hasOnboarding === 'true';
        if (!actuallyCompletedOnboarding) {
          const { data: goals } = await supabase
            .from('goals')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
          
          if (goals && goals.length > 0) {
            actuallyCompletedOnboarding = true;
            await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
          }
        }
        
        console.log('🔐 [LOGIN] User onboarding status:', { 
          isNewUser: isNewUserFlag === 'true',
          hasCompletedProfileSetup: hasProfileSetup === 'true',
          hasCompletedOnboarding: actuallyCompletedOnboarding
        });
        
        set({
          isAuthenticated: true,
          user,
          token,
          loading: false,
          error: null,
          isNewUser: isNewUserFlag === 'true',
          hasCompletedProfileSetup: hasProfileSetup === 'true',
          hasCompletedOnboarding: actuallyCompletedOnboarding
        });
        
        return true;
      } else {
        set({
          loading: false,
          error: response.error || 'Login failed'
        });
        return false;
      }
    } catch (error: any) {
      set({
        loading: false,
        error: error.message || 'Login failed'
      });
      return false;
    }
  },

  register: async (email: string, password: string, name: string) => {
    console.log('🚀 [REGISTER] Starting registration for:', email);
    set({ loading: true, error: null });
    try {
      const response = await backendService.signUp(email, password, name);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        console.log('✅ [REGISTER] Registration successful for user:', user.id);
        
        // Save to storage (only if we have valid values)
        if (token) {
          await AsyncStorage.setItem('token', token);
        }
        if (user) {
          await AsyncStorage.setItem('user', JSON.stringify(user));
        }
        
        // Mark as new user who needs onboarding
        console.log('🎯 [REGISTER] Setting new user flags for onboarding');
        await AsyncStorage.setItem('isNewUser', 'true');
        await AsyncStorage.setItem('hasCompletedProfileSetup', 'false');
        await AsyncStorage.setItem('hasCompletedOnboarding', 'false');
        
        console.log('🟢 [REGISTER] Updating store with new user state');
        set({
          isAuthenticated: true,
          user,
          token,
          loading: false,
          error: null,
          isNewUser: true,
          hasCompletedProfileSetup: false,
          hasCompletedOnboarding: false
        });
        
        console.log('🎉 [REGISTER] Registration complete - user should see profile setup');
        return true;
      } else {
        set({
          loading: false,
          error: response.error || 'Registration failed'
        });
        return false;
      }
    } catch (error: any) {
      set({
        loading: false,
        error: error.message || 'Registration failed'
      });
      return false;
    }
  },

  logout: async () => {
    await backendService.signOut();
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    
    set({
      isAuthenticated: false,
      user: null,
      token: null,
      error: null
    });
  },

  checkAuth: async () => {
    try {
      // CRITICAL: Always use Supabase as source of truth
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      console.log('🔐 [AUTH-CHECK] Checking authentication state');
      console.log('  - Supabase session exists:', !!session);
      console.log('  - Supabase user ID:', supabaseUser?.id || 'none');
      
      if (session && supabaseUser) {
        // Fetch profile data to get avatar
        let avatarUrl = null;
        let displayName = null;
        try {
          console.log('🔵 [AUTH] Fetching profile from database for user:', supabaseUser.id);
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url, name')
            .eq('id', supabaseUser.id)
            .single();
          
          if (profile) {
            avatarUrl = profile.avatar_url;
            displayName = profile.name;
            console.log('🔵 [AUTH] Profile found:', {
              hasAvatar: !!avatarUrl,
              avatarType: avatarUrl?.startsWith('http') ? 'HTTP URL' : avatarUrl?.startsWith('data:') ? 'BASE64' : 'NONE',
              displayName: profile.name
            });
          } else {
            console.log('🟡 [AUTH] No profile found in database');
            // Profile should exist from registration/onboarding
            // If not, user needs to complete onboarding
          }
        } catch (error) {
          console.log('🔴 [AUTH] Error loading profile:', error);
        }
        
        // Build user object from Supabase data
        const user = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: displayName || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
          avatar: avatarUrl || undefined
        };
        
        // Update AsyncStorage to match Supabase
        await AsyncStorage.setItem('token', session.access_token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        
        // Check onboarding status
        const isNewUser = await AsyncStorage.getItem('isNewUser');
        const hasCompletedProfileSetup = await AsyncStorage.getItem('hasCompletedProfileSetup');
        const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
        
        // Check if user has goals to determine if they completed onboarding
        let actuallyCompletedOnboarding = hasCompletedOnboarding === 'true';
        if (!actuallyCompletedOnboarding) {
          const { data: goals } = await supabase
            .from('goals')
            .select('id')
            .eq('user_id', supabaseUser.id)
            .limit(1);
          
          if (goals && goals.length > 0) {
            actuallyCompletedOnboarding = true;
            await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
          }
        }
        
        console.log('  - Setting app user to Supabase user:', user.id, 'with avatar:', user.avatar ? 'yes' : 'no');
        console.log('  - Onboarding status:', { isNewUser, hasCompletedProfileSetup, hasCompletedOnboarding: actuallyCompletedOnboarding });
        
        set({
          isAuthenticated: true,
          user,
          token: session.access_token,
          isNewUser: isNewUser === 'true',
          hasCompletedProfileSetup: hasCompletedProfileSetup === 'true' || !!avatarUrl,
          hasCompletedOnboarding: actuallyCompletedOnboarding
        });
      } else {
        // Check if we have cached credentials (offline support)
        const token = await AsyncStorage.getItem('token');
        const userStr = await AsyncStorage.getItem('user');
        
        if (token && userStr) {
          const cachedUser = JSON.parse(userStr);
          console.log('  - Using cached user (offline):', cachedUser.id);
          
          set({
            isAuthenticated: true,
            user: cachedUser,
            token
          });
        } else {
          console.log('  - No authentication found');
          set({
            isAuthenticated: false,
            user: null,
            token: null
          });
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  },

  clearError: () => set({ error: null }),
  
  updateAvatar: async (avatarUri: string) => {
    try {
      const currentUser = get().user;
      if (!currentUser) return false;
      
      console.log('🔵 [AUTH] Updating avatar for user:', currentUser.id);
      
      // Update backend first
      const response = await backendService.updateProfile({ avatar: avatarUri });
      
      if (response.success && response.data) {
        // Use the avatar_url from backend response
        const avatarUrl = response.data.avatar_url || avatarUri;
        
        // Update local state with the URL from backend
        const updatedUser = { ...currentUser, avatar: avatarUrl };
        set({ user: updatedUser });
        
        // Save to AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        
        console.log('🟢 [AUTH] Avatar updated successfully');
        return true;
      } else {
        console.error('🔴 [AUTH] Failed to update avatar:', response.error || 'No response data');
        return false;
      }
    } catch (error) {
      console.error('🔴 [AUTH] Exception updating avatar:', error);
      return false;
    }
  },

  updateBio: async (bio: string) => {
    try {
      const currentUser = get().user;
      if (!currentUser) return false;
      
      console.log('🔵 [AUTH] Updating bio for user:', currentUser.id);
      
      // Update backend
      const response = await backendService.updateProfile({ bio });
      
      if (response.success) {
        console.log('🟢 [AUTH] Bio updated successfully');
        // No need to update local state for bio as it's managed by ProfileV2
        return true;
      } else {
        console.error('🔴 [AUTH] Failed to update bio:', response.error);
        return false;
      }
    } catch (error) {
      console.error('🔴 [AUTH] Exception updating bio:', error);
      return false;
    }
  },

  completeProfileSetup: async () => {
    try {
      await AsyncStorage.setItem('hasCompletedProfileSetup', 'true');
      set({ hasCompletedProfileSetup: true });
      console.log('✅ [AUTH] Profile setup marked as complete');
    } catch (error) {
      console.error('🔴 [AUTH] Error marking profile setup complete:', error);
    }
  },

  completeFullOnboarding: async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('isNewUser', 'false');
      set({ 
        hasCompletedOnboarding: true,
        isNewUser: false 
      });
      console.log('✅ [AUTH] Full onboarding marked as complete');
    } catch (error) {
      console.error('🔴 [AUTH] Error marking onboarding complete:', error);
    }
  }
});