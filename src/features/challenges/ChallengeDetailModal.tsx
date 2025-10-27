import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trophy, Users, Calendar, Target } from 'lucide-react-native';
import { useStore } from '../../state/rootStore';
import type { Challenge } from '../../types/challenges.types';
import { JoinChallengeFlow } from './JoinChallengeFlow';

interface ChallengeDetailModalProps {
  visible: boolean;
  challengeId: string | null;
  onClose: () => void;
}

export const ChallengeDetailModal = ({ visible, challengeId, onClose }: ChallengeDetailModalProps) => {
  const insets = useSafeAreaInsets();
  const { currentChallenge, challengesLoading, loadChallenge, fetchMyActiveChallenges } = useStore();
  const [showJoinFlow, setShowJoinFlow] = useState(false);

  useEffect(() => {
    if (visible && challengeId) {
      loadChallenge(challengeId);
    }
  }, [visible, challengeId]);

  if (!visible) return null;

  const challenge = currentChallenge;
  const isJoined = !!challenge?.my_participation;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <LinearGradient
          colors={['#000000', '#0A0A0A', '#000000']}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Challenge Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {challengesLoading && !challenge ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Loading challenge...</Text>
          </View>
        ) : challenge ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.heroSection}>
              <Text style={styles.emoji}>{challenge.emoji}</Text>
              <Text style={styles.challengeName}>{challenge.name}</Text>
              {challenge.description && (
                <Text style={styles.description}>{challenge.description}</Text>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Calendar size={20} color="#FFD700" />
                <Text style={styles.statValue}>{challenge.duration_days}</Text>
                <Text style={styles.statLabel}>Days</Text>
              </View>

              <View style={styles.statBox}>
                <Users size={20} color="#FFD700" />
                <Text style={styles.statValue}>{challenge.participant_count || 0}</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>

              <View style={styles.statBox}>
                <Target size={20} color="#FFD700" />
                <Text style={styles.statValue}>{challenge.success_threshold}%</Text>
                <Text style={styles.statLabel}>To Pass</Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Trophy size={20} color="#FFD700" />
                <Text style={styles.sectionTitle}>Badge Reward</Text>
              </View>
              <View style={styles.badgeCard}>
                <Text style={styles.badgeEmoji}>{challenge.badge_emoji}</Text>
                <Text style={styles.badgeName}>{challenge.badge_name}</Text>
                <Text style={styles.badgeDescription}>
                  Complete {challenge.success_threshold}% to earn this badge
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Target size={20} color="#FFD700" />
                <Text style={styles.sectionTitle}>Daily Activities</Text>
              </View>
              {challenge.predetermined_activities && Array.isArray(challenge.predetermined_activities) && challenge.predetermined_activities.length > 0 ? (
                challenge.predetermined_activities.map((activity: any, index: number) => (
                  <View key={activity.id || index} style={styles.activityItem}>
                    <Text style={styles.activityEmoji}>{activity.emoji || '⭐'}</Text>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityTitle}>{activity.title || activity.name || 'Activity'}</Text>
                      <Text style={styles.activityFrequency}>{activity.frequency || 'Daily'}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyActivityState}>
                  <Text style={styles.emptyText}>You'll select your activities when you join</Text>
                </View>
              )}
            </View>

            {challenge.rules && Object.keys(challenge.rules).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rules</Text>
                <View style={styles.rulesCard}>
                  <Text style={styles.rulesText}>{JSON.stringify(challenge.rules)}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Challenge not found</Text>
          </View>
        )}

        {challenge && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <TouchableOpacity
              style={[styles.actionButton, isJoined && styles.actionButtonJoined]}
              onPress={() => {
                if (isJoined) {
                  console.log('View progress');
                } else {
                  setShowJoinFlow(true);
                }
              }}
            >
              <Text style={styles.actionButtonText}>
                {isJoined ? 'View Progress' : 'Join Challenge'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <JoinChallengeFlow
          visible={showJoinFlow}
          challenge={currentChallenge}
          onClose={() => setShowJoinFlow(false)}
          onSuccess={() => {
            setShowJoinFlow(false);
            onClose();
            fetchMyActiveChallenges();
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    maxWidth: 450,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  challengeName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '90%',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 32,
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFD700',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
  },
  badgeCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    gap: 12,
  },
  badgeEmoji: {
    fontSize: 48,
  },
  badgeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
  },
  badgeDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  activityEmoji: {
    fontSize: 32,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  activityFrequency: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  emptyActivityState: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.05)',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  rulesCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rulesText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  actionButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
  },
  actionButtonJoined: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
