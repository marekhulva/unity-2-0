import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ArrowRight, Check, Calendar } from 'lucide-react-native';
import type { Challenge } from '../../types/challenges.types';
import type { ActivityTime as ActivityTimeType } from '../../types/challenges.types';
import { useStore } from '../../state/rootStore';
import { TimePickerInput } from '../../components/TimePickerInput';

interface JoinChallengeFlowProps {
  visible: boolean;
  challenge: Challenge | null;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'review' | 'times' | 'confirm';

interface ActivityTime {
  activityId: string;
  time: string;
}

export const JoinChallengeFlow = ({ visible, challenge, onClose, onSuccess }: JoinChallengeFlowProps) => {
  const insets = useSafeAreaInsets();
  const joinChallenge = useStore((state) => state.joinChallenge);
  const [currentStep, setCurrentStep] = useState<Step>('review');
  const [activityTimes, setActivityTimes] = useState<ActivityTime[]>([]);
  const [joining, setJoining] = useState(false);

  const activities = challenge?.predetermined_activities || [];

  const getFrequencyText = (frequency: string) => {
    const map: Record<string, string> = {
      'daily': 'Every day',
      'three_per_week': '3 times per week',
      'weekly': 'Once per week',
      'every_other_day': 'Every other day',
    };
    return map[frequency] || 'Daily';
  };

  const handleTimeChange = (activityId: string, timeString: string) => {
    const newTimes = [...activityTimes];
    const existingIndex = newTimes.findIndex(t => t.activityId === activityId);

    if (existingIndex >= 0) {
      newTimes[existingIndex].time = timeString;
    } else {
      newTimes.push({ activityId, time: timeString });
    }

    setActivityTimes(newTimes);
  };

  const getActivityTime = (activityId: string): string => {
    return activityTimes.find(t => t.activityId === activityId)?.time || '09:00';
  };

  const canProceedFromReview = activities.length > 0;
  const canProceedFromTimes = activityTimes.length === activities.length;

  const renderReviewStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.stepContent}>
      <View style={styles.heroSection}>
        <Text style={styles.emoji}>{challenge?.emoji}</Text>
        <Text style={styles.title}>{challenge?.name}</Text>
        <Text style={styles.subtitle}>Review the challenge activities</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Activities</Text>
        <Text style={styles.sectionSubtitle}>
          {activities.length === 1 ? 'This activity is required' : 'All activities are required'}
        </Text>

        {activities.map((activity: any, index: number) => (
          <View key={activity.id || index} style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityEmoji}>{activity.emoji}</Text>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <View style={styles.frequencyBadge}>
                  <Calendar size={14} color="#FFD700" />
                  <Text style={styles.frequencyText}>
                    {getFrequencyText(activity.frequency || 'daily')}
                  </Text>
                </View>
              </View>
              <Check size={24} color="#FFD700" />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Challenge Duration</Text>
        <Text style={styles.infoValue}>{challenge?.duration_days} days</Text>
        <Text style={styles.infoSubtext}>
          Complete {challenge?.success_threshold}% to earn the badge
        </Text>
      </View>
    </ScrollView>
  );

  const renderTimesStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.stepContent}>
      <View style={styles.heroSection}>
        <Text style={styles.emoji}>⏰</Text>
        <Text style={styles.title}>Set Reminder Times</Text>
        <Text style={styles.subtitle}>When do you want to be reminded?</Text>
      </View>

      <View style={styles.section}>
        {activities.map((activity: any, index: number) => (
          <View key={activity.id || index} style={styles.timeCard}>
            <View style={styles.timeCardHeader}>
              <Text style={styles.activityEmoji}>{activity.emoji}</Text>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <View style={styles.frequencyBadge}>
                  <Calendar size={14} color="#FFD700" />
                  <Text style={styles.frequencyText}>
                    {getFrequencyText(activity.frequency || 'daily')}
                  </Text>
                </View>
              </View>
            </View>

            <TimePickerInput
              value={getActivityTime(activity.id)}
              onChange={(time) => handleTimeChange(activity.id, time)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderConfirmStep = () => (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.stepContent}>
      <View style={styles.heroSection}>
        <Text style={styles.emoji}>{challenge?.emoji}</Text>
        <Text style={styles.title}>Ready to Start?</Text>
        <Text style={styles.subtitle}>Review your challenge setup</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Challenge</Text>
          <Text style={styles.summaryValue}>{challenge?.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Duration</Text>
          <Text style={styles.summaryValue}>{challenge?.duration_days} days</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Activities</Text>
          <Text style={styles.summaryValue}>{activities.length}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Start Date</Text>
          <Text style={styles.summaryValue}>Today</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Reminders</Text>
        {activities.map((activity: any, index: number) => {
          const activityTime = getActivityTime(activity.id);
          const [hours, minutes] = activityTime.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
          const formattedTime = `${displayHour}:${minutes} ${ampm}`;

          return (
            <View key={activity.id || index} style={styles.reminderItem}>
              <Text style={styles.activityEmoji}>{activity.emoji}</Text>
              <Text style={styles.reminderText}>{activity.title}</Text>
              <Text style={styles.reminderTime}>{formattedTime}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.badgePreview}>
        <Text style={styles.badgeEmoji}>{challenge?.badge_emoji}</Text>
        <Text style={styles.badgeText}>Earn the {challenge?.badge_name} badge!</Text>
      </View>
    </ScrollView>
  );

  const handleNext = () => {
    if (currentStep === 'review') {
      setCurrentStep('times');
    } else if (currentStep === 'times') {
      setCurrentStep('confirm');
    }
  };

  const handleBack = () => {
    if (currentStep === 'times') {
      setCurrentStep('review');
    } else if (currentStep === 'confirm') {
      setCurrentStep('times');
    }
  };

  const handleJoin = async () => {
    if (!challenge) return;

    console.log('🏆 [JOIN] Starting challenge join process');
    console.log('🏆 [JOIN] Challenge ID:', challenge.id);
    console.log('🏆 [JOIN] Activity times:', activityTimes);

    setJoining(true);

    try {
      const formattedTimes: ActivityTimeType[] = activityTimes.map(at => ({
        activity_id: at.activityId,
        scheduled_time: at.time,
        is_link: false,
      }));

      const selectedActivityIds = activities.map((a: any) => a.id);

      console.log('🏆 [JOIN] Formatted data:', {
        challengeId: challenge.id,
        selectedActivityIds,
        formattedTimes
      });

      const success = await joinChallenge(
        challenge.id,
        selectedActivityIds,
        formattedTimes
      );

      if (success) {
        console.log('✅ [JOIN] Successfully joined challenge');
        onSuccess();
      } else {
        console.log('❌ [JOIN] Failed to join challenge');
        setJoining(false);
      }
    } catch (error) {
      console.error('❌ [JOIN] Error:', error);
      setJoining(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'review': return 'Step 1 of 3';
      case 'times': return 'Step 2 of 3';
      case 'confirm': return 'Step 3 of 3';
    }
  };

  const canProceed = currentStep === 'review' ? canProceedFromReview
                   : currentStep === 'times' ? canProceedFromTimes
                   : true;

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
          <Text style={styles.headerTitle}>{getStepTitle()}</Text>
          <View style={{ width: 40 }} />
        </View>

        {currentStep === 'review' && renderReviewStep()}
        {currentStep === 'times' && renderTimesStep()}
        {currentStep === 'confirm' && renderConfirmStep()}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {currentStep !== 'review' && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          {currentStep !== 'confirm' ? (
            <TouchableOpacity
              style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!canProceed}
            >
              <Text style={styles.nextButtonText}>Continue</Text>
              <ArrowRight size={20} color="#000" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.joinButton, joining && styles.joinButtonDisabled]}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.joinButtonText}>Start Challenge!</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
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
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  activityCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 16,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  frequencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  frequencyText: {
    fontSize: 14,
    color: 'rgba(255,215,0,0.8)',
  },
  infoBox: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  infoTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFD700',
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  timeCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  timeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    marginBottom: 24,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  reminderText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
  },
  reminderTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  badgePreview: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    gap: 12,
  },
  badgeEmoji: {
    fontSize: 48,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFD700',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  joinButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
