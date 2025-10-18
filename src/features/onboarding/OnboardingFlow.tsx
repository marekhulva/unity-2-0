import React, { useState } from 'react';
import { JourneySelectionScreen } from './JourneySelectionScreen';
import { JourneyConfirmationScreen } from './JourneyConfirmationScreen';
import { GoalSettingScreen } from './GoalSettingScreen';
import { MilestonesScreen } from './MilestonesScreen';
import { ActionsCommitmentsScreen } from './ActionsCommitmentsScreen';
import { ReviewCommitScreen } from './ReviewCommitScreen';
import { TimeSelectionScreen } from './TimeSelectionScreen';
import { RoutineBuilderScreen } from './RoutineBuilderScreen';
import { 
  OnboardingState, 
  PurchasedProgram, 
  OnboardingGoal, 
  Milestone, 
  Action 
} from './types';
import { useStore } from '../../state/rootStore';

// Mock data for demo - replace with actual data from your backend
const MOCK_PURCHASED_PROGRAMS: PurchasedProgram[] = [
  {
    id: 'jj-basketball',
    name: "JJ's Elite Basketball Program",
    author: 'JJ Murray',
    authorImage: 'https://example.com/jj.jpg',
    coverImage: 'https://images.unsplash.com/photo-1608245449230-4ac19066d2d0',
    description: 'Train like a champion with UNT basketball star JJ Murray',
    duration: '12 weeks',
    difficulty: 'intermediate',
    category: 'fitness',
    gradient: ['#00853E', '#FFB81C'],
    price: 99.99,
    purchasedAt: new Date('2024-01-15'),
    features: [
      'Daily shooting drills',
      'Form analysis videos',
      'College-level techniques',
      'Progressive skill building',
    ]
  },
  {
    id: 'testosterone-program',
    name: 'Natural Testosterone Optimization',
    author: 'Dr. Andrew Huberman',
    authorImage: 'https://example.com/huberman.jpg',
    coverImage: 'https://images.unsplash.com/photo-1583521214690-73421a1829a9',
    description: 'Science-based protocol for optimizing testosterone naturally',
    duration: '8 weeks',
    difficulty: 'beginner',
    category: 'health',
    gradient: ['#667EEA', '#764BA2'],
    price: 149.99,
    purchasedAt: new Date('2024-02-01'),
    features: [
      'Evidence-based protocols',
      'Lifestyle optimization',
      'Supplement guidance',
      'Weekly progress tracking',
    ]
  },
  {
    id: '75-hard',
    name: '75 HARD Mental Toughness',
    author: 'Andy Frisella',
    authorImage: 'https://example.com/frisella.jpg',
    coverImage: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
    description: 'Transform your life in 75 days with zero compromises. Build unbreakable mental toughness.',
    duration: '75 days',
    difficulty: 'extreme',
    category: 'mindset',
    gradient: ['#DC2626', '#991B1B'],
    price: 0,
    purchasedAt: new Date('2024-03-01'),
    features: [
      '2x daily 45-minute workouts',
      'Follow strict diet plan',
      'Drink 1 gallon of water',
      'Read 10 pages daily',
    ]
  },
];

interface Props {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<Props> = ({ onComplete }) => {
  const [state, setState] = useState<OnboardingState>({
    currentStep: -1, // Start with journey selection
    totalSteps: 8, // Total steps: journey selection, confirmation, routine, routine actions, goal, milestones, goal actions, review
    journeyType: null,
    milestones: [],
    actions: [],
    routineActions: [],
    isCompleted: false,
  });
  const [selectedProgram, setSelectedProgram] = useState<PurchasedProgram | undefined>();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const addGoal = useStore((state) => state.addGoal);

  const handleJourneySelection = (type: 'routine' | 'goal' | 'program', program?: PurchasedProgram) => {
    // Store the selection and show confirmation
    setSelectedProgram(program);
    setState({
      ...state,
      journeyType: type,
      selectedProgram: program,
    });
    setShowConfirmation(true);
  };

  const handleJourneyConfirmed = () => {
    console.log('🔵 [DEBUG] handleJourneyConfirmed called');
    console.log('🔵 [DEBUG] state.journeyType:', state.journeyType);
    console.log('🔵 [DEBUG] selectedProgram:', selectedProgram);
    console.log('🔵 [DEBUG] selectedProgram?.id:', selectedProgram?.id);
    
    setShowConfirmation(false);
    
    // If 75 Hard is selected, create predefined goals and actions
    if (selectedProgram?.id === '75-hard') {
      // Create 75 Hard specific routine
      const seventyFiveHardRoutine: OnboardingGoal = {
        title: '75 HARD Challenge',
        category: 'fitness', // Using fitness since 'mindset' isn't in the OnboardingGoal type
        targetDate: new Date(Date.now() + 74 * 24 * 60 * 60 * 1000), // 74 days from today = 75 days total (including today)
        milestones: 5, // Every 15 days is a milestone
        why: 'Build unbreakable mental toughness and transform my life through discipline',
      };
      
      // Create 75 Hard required daily actions
      const seventyFiveHardActions: Action[] = [
        {
          id: '75h-1',
          title: '45 min workout (outdoor)',
          type: 'commitment',
          frequency: 'daily',
          timeOfDay: '07:00',
          daysPerWeek: 7,
          category: 'fitness',
          icon: '🏃',
          description: 'One workout must be outdoors regardless of weather',
          requiresTime: true, // Time-specific activity
        },
        {
          id: '75h-2',
          title: '45 min workout (anywhere)',
          type: 'commitment',
          frequency: 'daily',
          timeOfDay: '17:00',
          daysPerWeek: 7,
          category: 'fitness',
          icon: '💪',
          description: 'Second workout can be indoors or outdoors',
          requiresTime: true, // Time-specific activity
        },
        {
          id: '75h-3',
          title: 'Follow diet (no cheat meals)',
          type: 'commitment',
          frequency: 'daily',
          timeOfDay: 'anytime', // Changed from undefined
          daysPerWeek: 7,
          category: 'health',
          icon: '🥗',
          description: 'Stick to your chosen diet with zero cheat meals or alcohol',
          requiresTime: false, // Don't show in time selection
        },
        {
          id: '75h-4',
          title: 'Drink 1 gallon of water',
          type: 'commitment',
          frequency: 'daily',
          timeOfDay: 'anytime', // Changed from undefined
          daysPerWeek: 7,
          category: 'health',
          icon: '💧',
          description: 'Complete 1 gallon (128 oz) of water throughout the day',
          requiresTime: false, // Don't show in time selection
          periodicReminders: true,
        },
        {
          id: '75h-5',
          title: 'Read 10 pages (non-fiction)',
          type: 'commitment',
          frequency: 'daily',
          timeOfDay: '21:00',
          daysPerWeek: 7,
          category: 'skills',
          icon: '📚',
          description: 'Read 10 pages of a non-fiction/self-development book',
          requiresTime: true, // Time-specific activity
        },
        {
          id: '75h-6',
          title: 'Take progress photo',
          type: 'commitment',
          frequency: 'daily',
          timeOfDay: '06:30',
          daysPerWeek: 7,
          category: 'other',
          icon: '📸',
          description: 'Document your transformation with a daily progress photo',
          requiresTime: true, // Time-specific activity
        },
      ];
      
      // Check if any activities require time selection
      const hasTimeRequiredActivities = seventyFiveHardActions.some(a => a.requiresTime === true);
      
      setState(prev => ({
        ...prev,
        routine: seventyFiveHardRoutine,
        routineActions: seventyFiveHardActions,
        currentStep: hasTimeRequiredActivities ? 6 : 5, // Go to time selection if needed, otherwise review
      }));
    } else if (state.journeyType === 'routine') {
      // For routine creation, go straight to routine builder
      console.log('🟢 [DEBUG] Setting up routine creation flow');
      setState(prev => ({
        ...prev,
        currentStep: 0, // Go to routine builder
      }));
    } else if (state.journeyType === 'goal') {
      // For goal creation, go straight to goal setting
      console.log('🟢 [DEBUG] Setting up goal creation flow');
      setState(prev => ({
        ...prev,
        currentStep: 2, // Go to goal setting
      }));
    }
  };


  const handleGoalSubmit = (goal: OnboardingGoal) => {
    console.log('🔵 [DEBUG] handleGoalSubmit called with goal:', goal);
    console.log('🔵 [DEBUG] Setting currentStep to 4 for goal actions');
    setState({
      ...state,
      goal,
      currentStep: 4, // Go to goal actions
      // currentStep: 3, // Go to milestones (commented out - skipping milestones for now)
    });
  };

  const handleMilestonesSubmit = (milestones: Milestone[]) => {
    setState({
      ...state,
      milestones,
      currentStep: 4, // Go to goal actions
    });
  };

  const handleActionsSubmit = (actions: Action[]) => {
    console.log('🎯 [DEBUG] handleActionsSubmit called with actions:', actions);
    console.log('🎯 [DEBUG] Actions count:', actions.length);
    console.log('🎯 [DEBUG] Actions details:', JSON.stringify(actions.map(a => ({ id: a.id, title: a.title, type: a.type }))));
    
    const newState = {
      ...state,
      actions,
      currentStep: 5, // Go to review after goal actions
    };
    
    console.log('🎯 [DEBUG] New state will have:', {
      goal: newState.goal?.title,
      routine: newState.routine?.title,
      actionsCount: newState.actions.length,
      currentStep: newState.currentStep
    });
    
    setState(newState);
  };

  const handleCommit = async () => {
    console.log('🟦 [ONBOARDING] handleCommit called');
    console.log('🟦 [ONBOARDING] isCommitting:', isCommitting);
    console.log('🟦 [ONBOARDING] state.routine:', state.routine?.title);
    console.log('🟦 [ONBOARDING] state.goal:', state.goal?.title);
    
    if (isCommitting || (!state.goal && !state.routine)) {
      console.log('🔴 [ONBOARDING] Blocked: isCommitting=' + isCommitting + ' or no goal/routine');
      return;
    }
    
    setIsCommitting(true);
    setCommitError(null);
    console.log('🟢 [ONBOARDING] Starting commit process...');
    
    const startTime = Date.now();
    
    try {
      let createdRoutine = null;
      let createdGoal = null;
      
      // Step 1A: Create the routine if provided
      if (state.routine) {
        console.log('🟦 [STEP 1A] Creating routine:', state.routine.title);

        // Get the goals count before adding to find the new one
        const goalsBefore = useStore.getState().goals;
        const goalsCountBefore = goalsBefore.length;

        await addGoal({
          title: state.routine.title,
          type: 'routine', // Mark this as a routine
          metric: '', // Routines don't need metrics
          // Don't set deadline for routines - they're ongoing
          why: state.routine.why || 'Daily foundation for success',
          color: state.routine.category === 'fitness' ? '#22C55E' :
                 state.routine.category === 'mindfulness' ? '#60A5FA' :
                 state.routine.category === 'productivity' ? '#A78BFA' :
                 state.routine.category === 'health' ? '#EF4444' : '#FFD700',
          category: state.routine.category,
        });

        // Wait and find the created routine by getting the newest goal
        await new Promise(resolve => setTimeout(resolve, 500));
        const goalsAfter = useStore.getState().goals;

        // The newly created goal should be the one that was added
        // Find it by comparing before/after or get the last one added
        if (goalsAfter.length > goalsCountBefore) {
          // Get the newest goal that wasn't in the original list
          createdRoutine = goalsAfter.find(g =>
            g.title === state.routine!.title &&
            !goalsBefore.some(gb => gb.id === g.id)
          ) || goalsAfter[goalsAfter.length - 1]; // Fallback to last goal
        } else {
          // If no new goal was added, something went wrong
          console.error('🔴 [STEP 1A] No new goal was added!');
          createdRoutine = goalsAfter.find(g => g.title === state.routine!.title);
        }

        console.log('🟢 [STEP 1A] Routine created:', createdRoutine?.id);
      }
      
      // Step 1B: Create the goal if provided
      if (state.goal) {
        console.log('🟦 [STEP 1B] Creating goal:', state.goal.title);
        console.log('🟦 [STEP 1B] Goal data:', JSON.stringify({
          title: state.goal.title,
          category: state.goal.category,
          targetDate: state.goal.targetDate,
          milestones: state.milestones.length
        }));
        await addGoal({
          title: state.goal.title,
          // NOTE: 'type' field removed - doesn't exist in database yet
          metric: state.goal.targetValue?.toString() || '',
          deadline: state.goal.targetDate.toISOString(),
          why: state.goal.why,
          color: state.goal.category === 'fitness' ? '#22C55E' : 
                 state.goal.category === 'mindfulness' ? '#60A5FA' : 
                 state.goal.category === 'productivity' ? '#A78BFA' : '#FFD700',
          category: state.goal.category,
          milestones: state.milestones,
        });

        // Wait and find the created goal
        // NOTE: We're finding by title only because 'type' field doesn't exist in database yet
        // See SESSION_DOCUMENTATION.md Technical Debt section for details
        await new Promise(resolve => setTimeout(resolve, 500));
        const goals = useStore.getState().goals;
        createdGoal = goals.find(g => g.title === state.goal!.title);
        console.log('🟢 [STEP 1B] Goal created:', createdGoal?.id);
      }
      
      // Step 2: Create actions for routine (can be standalone without a goal)
      if (state.routineActions.length > 0) {
        console.log('🟦 [STEP 2] Creating', state.routineActions.length, 'routine actions');
        const addAction = useStore.getState().addAction;

        for (const action of state.routineActions) {
          const dailyAction = {
            title: action.title,
            goalId: createdRoutine?.id || undefined, // Can be undefined for standalone routines
            goalTitle: createdRoutine?.title,
            type: 'commitment' as const,
            frequency: action.frequency || 'daily',
            scheduled_days: action.scheduledDays,
            time: action.timeOfDay === 'anytime' ? undefined : action.timeOfDay,
            streak: 0,
            done: false,
          };

          await addAction(dailyAction);
          console.log('✅ [STEP 2] Routine action created:', action.title);
        }
      }
      
      // Step 3: Create actions for goal
      if (createdGoal && state.actions.length > 0) {
        console.log('🟦 [STEP 3] Creating', state.actions.length, 'goal actions');
        const addAction = useStore.getState().addAction;
        const actionPromises = state.actions.map((action, index) => {
          console.log('🟦 [STEP 3] Preparing action', index + 1, ':', action.title);
          // Format frequency string
          let frequencyStr = 'Daily';
          if (action.type === 'one-time') {
            frequencyStr = 'Once';
          } else if (action.frequency === 'weekly' && action.daysPerWeek) {
            frequencyStr = `${action.daysPerWeek}x/week`;
          } else if (action.frequency === 'daily') {
            frequencyStr = 'Daily';
          }
          
          const dailyAction = {
            title: action.title,
            goalId: createdGoal.id,
            goalTitle: createdGoal.title,
            type: action.type === 'one-time' ? 'one-time' as const : 'commitment' as const,
            frequency: frequencyStr,
            time: action.timeOfDay,
            streak: 0,
            done: false,
          };
          
          // Return promise but don't await here - we'll await all at once
          return addAction(dailyAction)
            .then(() => {
              console.log('✅ [STEP 3] Goal action created:', action.title);
            })
            .catch(error => {
              console.error('🔴 [STEP 3] Failed action:', action.title, error);
              // Don't throw - allow other actions to be created
            });
        });
        
        // Wait for all actions to complete (in parallel)
        console.log('🟦 [STEP 3] Awaiting all action promises...');
        const actionStartTime = Date.now();
        await Promise.all(actionPromises);
        console.log('🟢 [STEP 3] All goal actions completed in', Date.now() - actionStartTime, 'ms');
      }
      
      // Step 4: Verify data was actually saved to Supabase
      console.log('🟦 [STEP 5] Verifying data in Supabase...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for DB propagation
      
      const verifyGoals = useStore.getState().fetchGoals;
      const verifyActions = useStore.getState().fetchDailyActions;
      
      await Promise.all([
        verifyGoals(),
        verifyActions()
      ]);
      
      const finalGoals = useStore.getState().goals;
      const finalActions = useStore.getState().actions;
      
      console.log('🔵 [VERIFICATION] Final goals count:', finalGoals.length);
      console.log('🔵 [VERIFICATION] Final actions count:', finalActions.length);
      
      if (finalGoals.length === 0) {
        console.error('🔴 [VERIFICATION] WARNING: No goals found after creation!');
      }
      if (finalActions.length === 0) {
        console.error('🔴 [VERIFICATION] WARNING: No actions found after creation!');
      }
      
      // Step 6: Store milestones (use AsyncStorage for mobile)
      console.log('🟦 [STEP 6] Saving onboarding state...');
      try {
        if (typeof localStorage !== 'undefined') {
          // Web environment
          localStorage.setItem('onboarding_milestones', JSON.stringify(state.milestones));
          localStorage.setItem('onboarding_completed', 'true');
          console.log('🟢 [STEP 6] localStorage saved successfully');
        } else {
          // Mobile environment - data is already in database
          console.log('🟢 [STEP 6] Mobile: data saved to database');
        }
      } catch (storageError) {
        console.log('🔴 [STEP 6] Storage failed:', storageError.message);
        // Don't fail the whole process for storage issues
      }
      
      // Success! Update state and close
      const totalTime = Date.now() - startTime;
      console.log('🎉 [SUCCESS] Total commit time:', totalTime, 'ms');
      console.log('🟢 [ONBOARDING] Updating state to completed');
      
      // Manually trigger data refresh here as well (backup)
      console.log('🟦 [ONBOARDING] Triggering manual data refresh...');
      const fetchGoals = useStore.getState().fetchGoals;
      const fetchDailyActions = useStore.getState().fetchDailyActions;
      
      setTimeout(async () => {
        console.log('🟦 [ONBOARDING] Refreshing goals and actions from within onboarding...');
        await Promise.all([
          fetchGoals(),
          fetchDailyActions()
        ]);
        console.log('✅ [ONBOARDING] Data refresh complete');
      }, 100);
      
      setState({
        ...state,
        isCompleted: true,
      });
      
      // Small delay for UI feedback before closing
      console.log('🟦 [ONBOARDING] Waiting 300ms before closing...');
      setTimeout(() => {
        console.log('🟢 [ONBOARDING] About to call onComplete');
        console.log('🟢 [ONBOARDING] onComplete function exists?', typeof onComplete === 'function');
        try {
          onComplete();
          console.log('✅ [ONBOARDING] onComplete called successfully');
        } catch (completeError) {
          console.error('🔴 [ONBOARDING] Error calling onComplete:', completeError);
        }
      }, 300);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('🔴 [ERROR] Commit failed:', errorMessage);
      console.error('🔴 [ERROR] Full error:', error);
      console.error('🔴 [ERROR] Stack:', error instanceof Error ? error.stack : 'No stack');
      
      setCommitError('Failed to save your goals. Please try again.');
      setIsCommitting(false);
      
      // Show error for 3 seconds then reset
      setTimeout(() => {
        setCommitError(null);
      }, 3000);
    }
  };

  const handleBack = () => {
    setState({
      ...state,
      currentStep: Math.max(0, state.currentStep - 1),
    });
  };

  // Show confirmation screen if journey was just selected
  if (showConfirmation && state.journeyType) {
    return (
      <JourneyConfirmationScreen
        journeyType={state.journeyType}
        program={selectedProgram}
        onContinue={handleJourneyConfirmed}
      />
    );
  }

  // Wrap screens with progress indicator (except journey selection)
  const renderScreen = () => {
    console.log('🟡 [DEBUG] renderScreen - currentStep:', state.currentStep);
    console.log('🟡 [DEBUG] renderScreen - state.goal:', state.goal?.title);
    console.log('🟡 [DEBUG] renderScreen - state.routine:', state.routine?.title);
    switch (state.currentStep) {
    case -1:
      // Journey selection - JJ's, Huberman's, or Create Your Own
      return (
        <JourneySelectionScreen
          purchasedPrograms={MOCK_PURCHASED_PROGRAMS}
          onSelectJourney={handleJourneySelection}
        />
      );
      
    case 0:
      // Routine setup - combined name and actions screen
      return (
        <RoutineBuilderScreen
          onSubmit={(routine, actions) => {
            // Set both routine and actions
            // For standalone routine, go to review; otherwise go to goal setting
            setState({
              ...state,
              routine,
              routineActions: actions,
              currentStep: state.journeyType === 'routine' ? 5 : 2, // Review for standalone, goal for combined
            });
          }}
          onBack={handleBack}
        />
      );
    
    case 2:
      // Goal setup
      return (
        <GoalSettingScreen
          onSubmit={(goal) => {
            console.log('🔵 [DEBUG] handleGoalSubmit called with goal:', goal);
            // Always go to actions step to add activities to the goal
            const nextStep = 4;
            console.log('🔵 [DEBUG] Setting currentStep to', nextStep, 'for journeyType:', state.journeyType);
            setState({
              ...state,
              goal,
              currentStep: nextStep,
            });
          }}
          onBack={handleBack}
          isRoutine={false}
          onSkip={() => {
            // Skip back to type selection
            setState({ ...state, currentStep: -2 });
          }}
        />
      );
    
    // case 3:
    //   // Goal milestones (COMMENTED OUT - skipping milestones for now)
    //   return state.goal ? (
    //     <MilestonesScreen
    //       goal={state.goal}
    //       onSubmit={handleMilestonesSubmit}
    //       onBack={handleBack}
    //     />
    //   ) : null;
    
    case 4:
      // Goal actions
      console.log('🟢 [DEBUG] Case 4 - Goal actions, state.goal exists?', !!state.goal);
      return state.goal ? (
        <ActionsCommitmentsScreen
          goal={state.goal}
          onSubmit={handleActionsSubmit}
          onBack={handleBack}
          isRoutine={false}
        />
      ) : null;
    
    case 5:
      // Review and commit
      console.log('📊 [DEBUG] Rendering ReviewCommitScreen with:', {
        goal: state.goal?.title,
        routine: state.routine?.title,
        actionsCount: state.actions?.length || 0,
        actions: state.actions,
        routineActionsCount: state.routineActions?.length || 0,
        routineActions: state.routineActions
      });
      return (state.goal || state.routine) ? (
        <ReviewCommitScreen
          goal={state.goal}
          routine={state.routine}
          milestones={state.milestones}
          actions={state.actions}
          routineActions={state.routineActions}
          onCommit={handleCommit}
          onBack={handleBack}
          isCommitting={isCommitting}
          error={commitError}
        />
      ) : null;
    
    case 6:
      // Time selection for 75 Hard
      return state.routineActions.length > 0 ? (
        <TimeSelectionScreen
          actions={state.routineActions}
          programName="75 HARD"
          onSubmit={(updatedActions) => {
            setState(prev => ({
              ...prev,
              routineActions: updatedActions,
              currentStep: 5, // Go to review after time selection
            }));
          }}
          onBack={handleBack}
        />
      ) : null;
    
    default:
      return null;
    }
  };

  // Return the screen without progress indicator
  return renderScreen();
};

