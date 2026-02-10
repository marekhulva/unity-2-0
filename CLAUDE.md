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

### Action Completion & Sharing System (MVP)

**Current MVP Approach: Public-Only Posting**
- All action completions are shared publicly (all circles + followers)
- Privacy selection UI has been commented out (not deleted)
- Users cannot choose to keep posts private in MVP

**How It Works:**

1. **Regular Actions (Timed activities)**
   - User taps action → `PrivacySelectionModal` opens
   - Modal shows: Photo/Comment options + public notice
   - Defaults: All circles + followers selected
   - File: `src/features/daily/PrivacySelectionModal.tsx`

2. **Abstinence Actions (No X, Don't Y)**
   - User taps action → `AbstinenceModal` opens
   - Modal shows: Yes/No + Photo/Comment + public notice
   - Defaults: All circles + followers selected
   - File: `src/features/daily/AbstinenceModal.tsx`

3. **Living Progress Cards**
   - Challenge actions update daily Living Progress Card
   - Always shows in feed (public)
   - Aggregates all challenge actions for that day
   - Individual posts only created if user adds comment/photo

**Data Flow:**
```
User completes action
  ↓
Modal opens with public notice
  ↓
User adds comment/photo (optional)
  ↓
handlePrivacySelect / handleAbstinenceComplete called
  ↓
selectedCircleIds = all user circles
includeFollowers = true (always)
  ↓
Backend creates post with visibility
  ↓
Post appears in all circles' feeds + followers' feeds
```

**Where Privacy Code Lives (Commented Out):**
- `PrivacySelectionModal.tsx` lines ~421-562 (circle selection UI)
- `AbstinenceModal.tsx` lines ~304-365 (circle selection UI)

**To Re-Enable Privacy Controls:**
1. Uncomment the privacy sections in both modals
2. Remove the public notice sections
3. User will be able to choose which circles see posts
4. Default behavior: all circles checked on modal open

**Key State Variables:**
- `selectedCircleIds: Set<string>` - Which circles see the post
- `includeFollowers: boolean` - Whether followers see it
- In MVP: Always initialized to ALL circles + followers = true

**Action Completion is Final:**
- Once an action is completed, it CANNOT be uncompleted
- Removed uncomplete flow from `ActionItem.tsx` (Feb 10, 2026)
- Reasoning:
  - Conflicts with challenge database constraint (one completion per day)
  - Undermines social accountability (everyone already saw the post)
  - Users actually want to EDIT completions (add comment/photo), not undo them
- Tapping completed action gives error haptic, does nothing
- Future: May add EDIT feature to change comment/photo without affecting completion status

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