import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { Users, Trophy, TrendingUp, Crown, Award, X } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useStore } from '../../state/rootStore';
import { supabase, supabaseService } from '../../services/supabase.service';
import { calculateConsistency } from '../../utils/consistencyCalculator';
import { ProfileClaudeOptionB as ProfileClaude } from '../profile/ProfileClaudeOptionB';

export const CircleScreen = () => {
  const insets = useSafeAreaInsets();
  const {
    circleId,
    circleName,
    circleMembers,
    loadCircleData,
    currentUser,
    user
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [membersWithStats, setMembersWithStats] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleMemberPress = (userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log('[CircleScreen] Member pressed - userId:', userId, 'currentUserId:', user?.id);
    // Show profile in modal instead of navigating
    setSelectedUserId(userId);
  };

  useEffect(() => {
    // Only load if we don't have members yet
    if (circleId && (!circleMembers || circleMembers.length === 0)) {
      loadData();
    }
  }, [circleId]);

  useEffect(() => {
    if (circleMembers && circleMembers.length > 0) {
      calculateMemberStats();
    }
  }, [circleMembers]);

  const calculateMemberStats = async () => {
    try {
      // Fetch bulk completion stats for all members in 2 queries instead of 2*N
      const userIds = circleMembers.map(m => m.user_id);
      const bulkStats = await supabaseService.getBulkOverallCompletionStats(userIds);

      const membersWithConsistency = circleMembers.map(member => {
        const stats = bulkStats[member.user_id] || { expected: 0, completed: 0, percentage: 0 };
        console.log(`📊 [Circle] Member ${member.display_name}: ${stats.completed}/${stats.expected} = ${stats.percentage}%`);

        return {
          ...member,
          consistencyPercentage: stats.percentage,
          consistencyTrend: 'stable' as const
        };
      });

      setMembersWithStats(membersWithConsistency);
    } catch (error) {
      console.error('Error calculating member stats:', error);
      // Set all to 0 if there's an error
      const membersWithConsistency = circleMembers.map(member => ({
        ...member,
        consistencyPercentage: 0,
        consistencyTrend: 'stable' as const
      }));
      setMembersWithStats(membersWithConsistency);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    if (circleId) {
      await loadCircleData();
    }
    setIsLoading(false);
  };

  // If not in a circle, show join prompt
  if (!circleId) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CIRCLE</Text>
          <LinearGradient
            colors={['#FFD700', '#FFA500', '#FFD700']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          />
        </View>
        
        <View style={styles.emptyContainer}>
          <Users size={80} color="#FFD700" />
          <Text style={styles.emptyTitle}>Join a Circle</Text>
          <Text style={styles.emptySubtitle}>
            Connect with others and build consistency together
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header - Matching Social V6 exactly */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{circleName?.toUpperCase() || 'CIRCLE'}</Text>
        <View style={styles.headerUnderline}>
          <LinearGradient
            colors={[
              '#D4AF37',  // Antique gold highlight
              '#C9A050',  // Rich gold
              '#B8860B',  // Dark goldenrod
              '#A0790A',  // Deep gold (no grey)
              '#B8860B',  // Dark goldenrod again
              '#C9A050',  // Rich gold again
              '#D4AF37'   // Antique gold edge
            ]}
            locations={[0, 0.2, 0.35, 0.5, 0.65, 0.8, 1]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Circle Stats Card */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.statsCard}
        >
          <LinearGradient
            colors={['rgba(255,215,0,0.1)', 'rgba(0,0,0,0.3)']}
            style={StyleSheet.absoluteFillObject}
          />
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Users size={24} color="#FFD700" />
              <Text style={styles.statValue}>{membersWithStats?.length || 0}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            
            <View style={styles.statItem}>
              <Trophy size={24} color="#FFD700" />
              <Text style={styles.statValue}>
                {membersWithStats?.length > 0 
                  ? Math.round(
                      membersWithStats.reduce((acc, m) => acc + (m.consistencyPercentage || 0), 0) / 
                      membersWithStats.length
                    )
                  : 0}%
              </Text>
              <Text style={styles.statLabel}>Avg Consistency</Text>
            </View>
            
            <View style={styles.statItem}>
              <TrendingUp size={24} color="#FFD700" />
              <Text style={styles.statValue}>7</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>
        </Animated.View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LEADERBOARD</Text>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#FFD700" />
          ) : (
            <View>
              {(membersWithStats || [])
                .sort((a, b) => b.consistencyPercentage - a.consistencyPercentage)
                .map((member, index) => {
                const consistency = member.consistencyPercentage || 0;
                const isCurrentUser = member.user_id === currentUser?.id;
                const displayName = member.profiles?.username || member.profiles?.name || 'Unknown User';
                
                return (
                  <Animated.View
                    key={member.user_id}
                    entering={FadeInDown.delay(200 + index * 50).springify()}
                  >
                    <Pressable 
                      style={[
                        styles.memberCard, 
                        isCurrentUser && styles.currentUserCard
                      ]}
                      onPress={() => handleMemberPress(member.user_id)}
                    >
                      {/* Rank Badge */}
                      <View style={styles.rankContainer}>
                        {index === 0 ? (
                          <Crown size={20} color="#FFD700" />
                        ) : index === 1 ? (
                          <Award size={20} color="#C0C0C0" />
                        ) : index === 2 ? (
                          <Award size={20} color="#CD7F32" />
                        ) : (
                          <Text style={styles.rankNumber}>#{index + 1}</Text>
                        )}
                      </View>
                      
                      {/* User Info */}
                      <View style={styles.userInfo}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </Text>
                        </View>
                        <Text style={styles.userName} numberOfLines={1}>
                          {displayName} {isCurrentUser && '(You)'}
                        </Text>
                      </View>
                      
                      {/* Consistency Circle */}
                      <View style={styles.consistencyContainer}>
                        <Svg width={50} height={50}>
                          <SvgCircle
                            cx="25"
                            cy="25"
                            r="20"
                            stroke="rgba(192,192,192,0.2)"
                            strokeWidth="4"
                            fill="none"
                          />
                          <SvgCircle
                            cx="25"
                            cy="25"
                            r="20"
                            stroke={index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : index === 2 ? "#CD7F32" : "#888"}
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${(consistency / 100) * 126} 126`}
                            strokeLinecap="round"
                            transform="rotate(-90 25 25)"
                          />
                        </Svg>
                        <View style={styles.percentageContainer}>
                          <Text style={styles.percentageText}>{consistency}%</Text>
                        </View>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Profile View Modal - Shows when a member is clicked */}
      {selectedUserId && (
        <Modal
          visible={!!selectedUserId}
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : 'fullScreen'}
          transparent={Platform.OS === 'android'}
          onRequestClose={() => setSelectedUserId(null)}
        >
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            {/* Close button - Always show for all profiles */}
            <Pressable
              style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 50 : 20,
                left: 20,
                zIndex: 1000,
                padding: 10,
              }}
              onPress={() => {
                console.log('[CircleScreen] Closing profile modal');
                setSelectedUserId(null);
              }}
            >
              <X size={24} color="#FFFFFF" />
            </Pressable>
            <ProfileClaude userId={selectedUserId} isInModal={true} source="Circle" />
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  
  headerUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    overflow: 'hidden',
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: 100,
  },
  
  statsCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    overflow: 'hidden',
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  statItem: {
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  
  section: {
    padding: 20,
  },
  
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  
  currentUserCard: {
    borderColor: 'rgba(255,215,0,0.3)',
    backgroundColor: 'rgba(255,215,0,0.05)',
  },
  
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  
  rankNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFF',
  },
  
  consistencyContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  percentageContainer: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  
  // Empty state styles
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 20,
  },
  
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 10,
    textAlign: 'center',
  },
});