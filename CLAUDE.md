# Claude Code Assistant Instructions

## Project Context
This is a React Native (Expo) app for goal tracking, daily actions, and social accountability.

## Key Commands

### Development
```bash
# Start dev server
cd /home/marek/Challenge\ Implementation && PORT=8054 npx expo start --web --port 8054

# Build for TestFlight
eas build --platform ios --profile preview

# Run linting (if available)
npm run lint

# Run type checking (if available)
npm run typecheck
```

### Build Numbers (CRITICAL)
**ALWAYS CHECK app.json FOR CURRENT BUILD NUMBER BEFORE BUILDING**
- Current iOS build number: Check `ios.buildNumber` in app.json
- Must increment by 1 for each new TestFlight build
- Last successful build: #18 (as of Sept 25, 2025)
- Build command: `EXPO_NO_PROMPT_FOR_CI=1 eas build --platform ios --profile production --auto-submit --non-interactive`

### Git Workflow
```bash
# Always work on circle-view-tabs branch
git checkout circle-view-tabs

# Commit pattern
git add -A && git commit -m "Descriptive message

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin circle-view-tabs
```

## Important Implementation Details

### Daily Actions Reset Logic
- Actions have `completed` (persistent) and `completed_at` (timestamp) fields
- Always check if `completed_at` is TODAY when displaying completion status
- Actions reset at midnight automatically by checking timestamp

### Premium Post Cards
- Only show for activities that are BOTH:
  1. In a challenge
  2. Tied to a goal
- Use `LuxuryPostCardPremium` component
- Include silver metallic overlay for challenge activities

### Daily Review System
- Use `DailyReviewModalV2` (not the old version)
- Bottom sheet pattern, max 75% screen height
- Saves automatically at each step
- Backend: `supabase.dailyReviews.service.ts`

### Database Operations
- Always use Supabase service layer, not direct queries
- RLS policies are enabled - respect user context
- UTC timestamps, display in local timezone

## Code Style Guidelines
- NO comments unless explicitly requested
- Follow existing patterns in codebase
- Mobile-first responsive design
- Use TypeScript strictly
- Prefer editing existing files over creating new ones

## Current Branch
Working on: `circle-view-tabs`

## Testing Accounts
- Username: 12221212
- Test Circle: TEST123

## Known Issues to Watch For
1. Keyboard overlap on iOS - use KeyboardAvoidingView
2. Action completion persistence - check TODAY's date
3. Challenge activity times - may be missing scheduled_time

## File Structure
```
src/
  features/
    daily/          - Daily actions and reviews
    social/         - Social feed and posts
  services/         - Backend services
  state/           - Zustand store and slices
  components/      - Reusable components
supabase/
  migrations/      - Database migrations
```

## Before Major Changes
1. Check SESSION_DOCUMENTATION.md for detailed history
2. Verify no duplicate work
3. Test on mobile viewport (iPhone sizes)
4. Check console logs for debugging info

## Performance Notes
- If session feels slow, consider restarting
- Batch tool calls when possible
- Use Task tool for complex searches