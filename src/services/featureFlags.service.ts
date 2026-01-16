import { supabase } from './supabase.service';

interface FeatureFlags {
  social_pressure_cards: boolean;
  motivation_buttons: boolean;
  streak_tracking: boolean;
  [key: string]: boolean;
}

class FeatureFlagService {
  private flags: FeatureFlags = {
    social_pressure_cards: false, // DEFAULT: OFF for MVP
    motivation_buttons: false,
    streak_tracking: true,
  };

  private lastFetch: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getFlags(): Promise<FeatureFlags> {
    const now = Date.now();
    
    // Use cached flags if recent
    if (now - this.lastFetch < this.CACHE_DURATION) {
      return this.flags;
    }

    try {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .single();

      if (!error && data) {
        this.flags = { ...this.flags, ...data };
        this.lastFetch = now;
      }
    } catch (err) {
      if (__DEV__) console.log('Using default feature flags');
    }

    return this.flags;
  }

  async isEnabled(flag: keyof FeatureFlags): Promise<boolean> {
    const flags = await this.getFlags();
    return flags[flag] ?? false;
  }

  // For testing - force refresh
  clearCache() {
    this.lastFetch = 0;
  }
}

export const featureFlags = new FeatureFlagService();