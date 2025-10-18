import { create } from 'zustand';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createDailySlice, DailySlice } from './slices/dailySlice';
import { createGoalsSlice, GoalsSlice } from './slices/goalsSlice';
import { createSocialSlice, SocialSlice } from './slices/socialSlice';
import { createUiSlice, UiSlice } from './slices/uiSlice';
import { createChallengeSlice, ChallengeSlice } from './slices/challengeSlice';
import { createDailyReviewSlice, DailyReviewSlice } from './slices/dailyReviewSlice';

type RootState = AuthSlice & DailySlice & GoalsSlice & SocialSlice & UiSlice & ChallengeSlice & DailyReviewSlice;
export const useStore = create<RootState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createUiSlice(...a),
  ...createGoalsSlice(...a),
  ...createDailySlice(...a),
  ...createSocialSlice(...a),
  ...createChallengeSlice(...a),
  ...createDailyReviewSlice(...a),
}));