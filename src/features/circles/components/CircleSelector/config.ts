// Circle Selector Configuration
// Change the implementation type here to switch between different UI patterns

export const CIRCLE_SELECTOR_CONFIG = {
  // Main implementation switch - change this to switch UI patterns
  implementation: 'TAB_BAR' as 'TAB_BAR' | 'DROPDOWN' | 'ICONS',

  // Tab Bar specific settings (Solution 3)
  tabBar: {
    showMemberCount: false, // Show member count in tabs
    maxVisibleTabs: 'auto' as 'auto' | number, // 'auto' or specific number
    showScrollIndicator: true, // Show arrow when scrollable
    abbreviateAfter: null as null | number, // null = never abbreviate
    scrollAnimated: true, // Smooth scroll animations
    tabMinWidth: 80, // Minimum width for each tab
    tabMaxWidth: 200, // Maximum width for each tab
  },

  // Dropdown specific settings (for future use)
  dropdown: {
    showMemberCount: true,
    defaultExpanded: false,
    showEmoji: true,
    maxHeight: 400,
  },

  // Icons only settings (for future use)
  icons: {
    showTooltipOnActive: true,
    maxIcons: 6,
    iconSize: 44,
  },

  // Common settings
  common: {
    showAllCirclesOption: true, // Show "All Circles" as first option
    allowJoinFromSelector: true, // Show "+ Join" option
    persistSelection: true, // Remember last selection
    hapticFeedback: true, // Enable haptic feedback on selection
  },
};