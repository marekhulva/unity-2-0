/**
 * Runtime Component Inspector
 * Helps developers identify which components are actually being used
 */

interface ActiveComponentRegistry {
  screens: {
    social: string;
    daily: string;
    progress: string;
    profile: string;
    challenges: string;
  };
  components: {
    postCard: string;
    actionItem: string;
    privacyModal: string;
  };
  lastUpdated: string;
}

const ACTIVE_COMPONENTS: ActiveComponentRegistry = {
  screens: {
    social: 'SocialScreenV6 (src/features/social/SocialScreenV6.tsx)',
    daily: 'DailyScreen (src/features/daily/DailyScreen.tsx)',
    progress: 'ProgressScreen (src/features/progress/ProgressScreen.tsx)',
    profile: 'ProfileScreen (src/features/profile/ProfileScreen.tsx)',
    challenges: 'ChallengeDetailScreen (src/features/challenges/ChallengeDetailScreen.tsx)'
  },
  components: {
    postCard: 'LuxuryPostCard (inline in SocialScreenV6.tsx line ~1217)',
    actionItem: 'ActionItem (src/features/daily/ActionItem.tsx)',
    privacyModal: 'PrivacySelectionModal (src/features/daily/PrivacySelectionModal.tsx)'
  },
  lastUpdated: '2025-08-28'
};

export class ComponentInspector {
  private static instance: ComponentInspector;
  private renderLog: Map<string, number> = new Map();

  static getInstance(): ComponentInspector {
    if (!ComponentInspector.instance) {
      ComponentInspector.instance = new ComponentInspector();
    }
    return ComponentInspector.instance;
  }

  // Log when a component renders
  logRender(componentName: string, details?: any) {
    const count = (this.renderLog.get(componentName) || 0) + 1;
    this.renderLog.set(componentName, count);
    
    if (__DEV__ && details?.verbose) {
      console.log(`[RENDER #${count}] ${componentName}`, details);
    }
  }

  // Show all active components
  showActiveComponents() {
    console.group('🎯 ACTIVE COMPONENTS');
    console.log('%cScreens:', 'font-weight: bold; color: #4CAF50');
    Object.entries(ACTIVE_COMPONENTS.screens).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log('%cCore Components:', 'font-weight: bold; color: #2196F3');
    Object.entries(ACTIVE_COMPONENTS.components).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    
    console.log(`%cLast Updated: ${ACTIVE_COMPONENTS.lastUpdated}`, 'color: #666');
    console.groupEnd();
  }

  // Show render statistics
  showRenderStats() {
    console.group('📊 RENDER STATISTICS');
    const sorted = Array.from(this.renderLog.entries())
      .sort((a, b) => b[1] - a[1]);
    
    sorted.forEach(([component, count]) => {
      console.log(`${component}: ${count} renders`);
    });
    console.groupEnd();
  }

  // Find component by partial name
  findComponent(partialName: string) {
    console.group(`🔍 SEARCHING FOR: ${partialName}`);
    
    const searchLower = partialName.toLowerCase();
    const results: string[] = [];
    
    // Search in screens
    Object.entries(ACTIVE_COMPONENTS.screens).forEach(([key, value]) => {
      if (key.toLowerCase().includes(searchLower) || value.toLowerCase().includes(searchLower)) {
        results.push(`Screen: ${key} -> ${value}`);
      }
    });
    
    // Search in components
    Object.entries(ACTIVE_COMPONENTS.components).forEach(([key, value]) => {
      if (key.toLowerCase().includes(searchLower) || value.toLowerCase().includes(searchLower)) {
        results.push(`Component: ${key} -> ${value}`);
      }
    });
    
    if (results.length > 0) {
      console.log('%cFound:', 'color: #4CAF50');
      results.forEach(r => console.log('  ' + r));
    } else {
      console.log('%cNo matches found', 'color: #f44336');
      console.log('Tip: Use showActiveComponents() to see all active components');
    }
    
    console.groupEnd();
  }

  // Clear render log
  clearStats() {
    this.renderLog.clear();
    console.log('✅ Render statistics cleared');
  }

  // Check if a component is deprecated
  checkDeprecated(componentName: string) {
    const deprecated = [
      'PostCard',
      'PostCardEnhanced',
      'PostCardBase',
      'PostCardBaseV2',
      'PostCardBaseV3',
      'SocialScreen',
      'SocialScreenV2',
      'SocialScreenV3',
      'SocialScreenV4',
      'SocialScreenV5'
    ];
    
    if (deprecated.includes(componentName)) {
      console.warn(`⚠️ ${componentName} is DEPRECATED. Use ComponentInspector.showActiveComponents() to find the active version.`);
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const inspector = ComponentInspector.getInstance();

// Attach to window in dev mode for console access
if (__DEV__ && typeof window !== 'undefined') {
  (window as any).inspector = inspector;
  (window as any).showActiveComponents = () => inspector.showActiveComponents();
  (window as any).showRenderStats = () => inspector.showRenderStats();
  (window as any).findComponent = (name: string) => inspector.findComponent(name);
  
  console.log('%c🔍 Component Inspector Ready!', 'background: #4CAF50; color: white; padding: 2px 8px; border-radius: 4px');
  console.log('Available commands:');
  console.log('  showActiveComponents() - Show all active components');
  console.log('  showRenderStats() - Show component render counts');
  console.log('  findComponent("name") - Search for a component');
  console.log('  inspector.clearStats() - Clear render statistics');
}