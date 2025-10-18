import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { CircleSelectorProps } from './CircleSelectorProps';
import { CIRCLE_SELECTOR_CONFIG } from './config';
import { LuxuryTheme } from '../../../../design/luxuryTheme';

export const TabBarSelector: React.FC<CircleSelectorProps> = ({
  circles,
  activeCircleId,
  onCircleSelect,
  onJoinCircle,
  loading,
  style,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const config = CIRCLE_SELECTOR_CONFIG.tabBar;
  const commonConfig = CIRCLE_SELECTOR_CONFIG.common;

  // Check if content is scrollable
  useEffect(() => {
    const isScrollable = contentWidth > containerWidth;
    setShowScrollIndicator(isScrollable && config.showScrollIndicator);

    // Animate scroll indicator
    if (isScrollable && config.showScrollIndicator) {
      Animated.timing(fadeAnim, {
        toValue: scrollPosition < contentWidth - containerWidth - 50 ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [contentWidth, containerWidth, scrollPosition, config.showScrollIndicator]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollPosition(event.nativeEvent.contentOffset.x);
  };

  const handleContentSizeChange = (width: number, height: number) => {
    setContentWidth(width);
  };

  const handleLayout = (event: any) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const handleCirclePress = (circleId: string | null) => {
    if (commonConfig.hapticFeedback) {
      Haptics.selectionAsync();
    }
    onCircleSelect(circleId);
  };

  const renderTab = (
    emoji: string | undefined,
    name: string,
    isActive: boolean,
    onPress: () => void,
    testID?: string
  ) => (
    <TouchableOpacity
      style={[
        styles.tab,
        isActive && styles.activeTab,
        { minWidth: config.tabMinWidth, maxWidth: config.tabMaxWidth },
      ]}
      onPress={onPress}
      testID={testID}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text
        style={[
          styles.tabText,
          isActive && styles.activeTabText,
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        scrollEventThrottle={16}
      >
        {/* All Circles Tab */}
        {commonConfig.showAllCirclesOption && renderTab(
          '🌐',
          'All Circles',
          activeCircleId === null,
          () => handleCirclePress(null),
          'all-circles-tab'
        )}

        {/* Individual Circle Tabs */}
        {circles.map((circle) =>
          renderTab(
            circle.emoji,
            circle.name,
            activeCircleId === circle.id,
            () => handleCirclePress(circle.id),
            `circle-tab-${circle.id}`
          )
        )}

        {/* Join New Circle Tab */}
        {commonConfig.allowJoinFromSelector && (
          <TouchableOpacity
            style={[styles.tab, styles.addTab]}
            onPress={onJoinCircle}
            testID="join-circle-tab"
          >
            <Text style={styles.addIcon}>➕</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <Animated.View
          style={[
            styles.scrollIndicator,
            {
              opacity: fadeAnim,
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.scrollArrow}>→</Text>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: LuxuryTheme.colors.primary.gold,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeTabText: {
    color: LuxuryTheme.colors.primary.gold,
  },
  emoji: {
    fontSize: 16,
  },
  addTab: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 10,
    minWidth: 44,
  },
  addIcon: {
    fontSize: 16,
  },
  scrollIndicator: {
    position: 'absolute',
    right: 5,
    top: '50%',
    transform: [{ translateY: -15 }],
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  scrollArrow: {
    fontSize: 14,
    color: LuxuryTheme.colors.primary.gold,
    fontWeight: 'bold',
  },
});