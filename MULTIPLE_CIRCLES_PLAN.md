# Multiple Circles Feature - Implementation Plan

## Project Status: 🟡 Planning Phase
Last Updated: 2025-10-18

## Vision
Allow users to join and participate in multiple circles (groups) instead of being limited to just one. This enables users to have different communities for different aspects of their life (work friends, gym buddies, family, etc).

## Current State Analysis ✅
- **Database**: Already supports multiple circles via `circle_members` table (many-to-many relationship)
- **Frontend**: Currently limited to single circle per user
- **UI**: No circle switching capability
- **Feed**: Shows content from one circle only
- **Challenges**: Tied to single circle

## Phase 1: UI/UX Design 🎨 [COMPLETED]

### 1.1 Circle Selector Component
**Location**: Top of main screens (Social, Daily, Progress)
**Design Options**:

#### Option A: Dropdown Selector
```
┌────────────────────────────────────┐
│ [🌐 All Circles ▼]  🔔  👤        │
│  ├─ 🌐 All Circles (3)            │
│  ├─ 🏀 Basketball Bros (12)       │
│  ├─ 🧘 Wellness Warriors (8)      │
│  ├─ 💼 Startup Hustlers (15)      │
│  └─ ➕ Join New Circle            │
└────────────────────────────────────┘
```

#### Option B: Tab Bar (SELECTED) ✅
```
┌────────────────────────────────────┐
│ [🌐 All Circles] [🏀 Basketball Bros] [🧘 Wellness] → │
└────────────────────────────────────┘
```

**Decision**: [✅] Tab Bar with Horizontal Scroll (Solution 3)
- Full circle names visible
- Horizontal scroll for overflow
- Scroll indicator when more tabs available
- Built with modular architecture for easy switching later

### 1.2 Social Feed Updates
**Requirements**:
- Show circle badge on each post
- Filter by selected circle
- "All Circles" view shows everything
- Visual distinction between circles

**Design**:
```
┌────────────────────────────────────┐
│ [Avatar] John Smith                │
│ 🏀 Basketball Bros • 2 hours ago  │
│ ──────────────────────────────────│
│ Just crushed 100 free throws!      │
│ [Image/Video]                      │
│ ──────────────────────────────────│
│ ❤️ 12  💬 3  🔁 Share             │
└────────────────────────────────────┘
```

### 1.3 Join Circle Modal
**Trigger**: "+" button or "Join New Circle" option
**Design**:
```
┌────────────────────────────────────┐
│      Join a New Circle             │
│ ──────────────────────────────────│
│ Enter Circle Invite Code:          │
│ ┌────────────────────────────┐    │
│ │                              │    │
│ └────────────────────────────┘    │
│                                    │
│ Or scan QR code:                  │
│ [📷 Scan QR]                      │
│                                    │
│ Popular Circles Near You:          │
│ • HOOPS2024 - Local Basketball    │
│ • ZENLIFE - Morning Meditation     │
│ • STARTUP - Entrepreneur Network   │
│                                    │
│ [Cancel]          [Join Circle]    │
└────────────────────────────────────┘
```

### 1.4 Circle Management Screen
**Location**: Settings → My Circles
**Features**:
- View all joined circles
- See member count
- Leave circle option
- Circle notifications settings

```
┌────────────────────────────────────┐
│         My Circles (3)             │
│ ──────────────────────────────────│
│ 🏀 Basketball Bros                │
│    12 members • Joined Oct 2024   │
│    [🔔 On] [Leave]                │
│ ──────────────────────────────────│
│ 🧘 Wellness Warriors              │
│    8 members • Joined Sep 2024    │
│    [🔔 Off] [Leave]               │
│ ──────────────────────────────────│
│ 💼 Startup Hustlers               │
│    15 members • Joined Sep 2024   │
│    [🔔 On] [Leave]                │
│ ──────────────────────────────────│
│        [+ Join New Circle]         │
└────────────────────────────────────┘
```

### 1.5 Challenge Screen Updates
**Show challenges from all circles**:
```
┌────────────────────────────────────┐
│      Active Challenges             │
│ [All Circles ▼] [Filter]           │
│ ──────────────────────────────────│
│ 🏀 Basketball Bros                │
│ "March Madness Shootout"           │
│ 15 participants • 5 days left      │
│ ──────────────────────────────────│
│ 🧘 Wellness Warriors              │
│ "30 Day Meditation Journey"        │
│ 8 participants • 12 days left      │
└────────────────────────────────────┘
```

## Phase 2: Backend Implementation 🔧 [TODO]

### 2.1 New State Slice
- [ ] Create `circlesSlice.ts`
  - User's circles list
  - Active circle selection
  - Circle member counts
  - Join/leave functionality

### 2.2 Backend Service Methods
- [ ] `getUserCircles()` - Fetch all circles user belongs to
- [ ] `joinCircle(inviteCode)` - Join a new circle
- [ ] `leaveCircle(circleId)` - Leave a circle
- [ ] `getCircleMembers(circleId)` - Get members of a circle
- [ ] `setActiveCircle(circleId)` - Set the active circle for filtering

### 2.3 Update Existing Services
- [ ] Update social feed to filter by circle(s)
- [ ] Update challenge fetching for multiple circles
- [ ] Update post creation to specify circle

## Phase 3: Component Implementation 🛠️ [TODO]

### 3.1 New Components
- [ ] `CircleSelector.tsx` - Dropdown/tab component
- [ ] `JoinCircleModal.tsx` - Join new circle flow
- [ ] `CircleManagementScreen.tsx` - Manage circles
- [ ] `CircleBadge.tsx` - Show circle on posts

### 3.2 Update Existing Components
- [ ] `SocialScreen.tsx` - Add circle selector
- [ ] `UnifiedActivityCard.tsx` - Show circle badge
- [ ] `ChallengeScreen.tsx` - Filter by circle
- [ ] `CreatePostModal.tsx` - Select target circle

## Phase 4: Data Migration 🔄 [TODO]
- [ ] Ensure existing users are properly in their current circle
- [ ] Create default "All Friends" circle if needed
- [ ] Update privacy settings to be circle-aware

## Implementation Order 📝
1. **UI/UX Finalization** ← Current Step
2. State Management (circlesSlice)
3. Backend Methods
4. Circle Selector Component
5. Join Circle Flow
6. Update Social Feed
7. Update Challenges
8. Circle Management Screen
9. Testing & Polish

## Technical Decisions 🤔

### Question 1: Circle Selection Persistence
**Options**:
- A) Remember last selected circle per screen
- B) Global selection across all screens ✅
- C) Always default to "All Circles"

**Decision**: [✅] **Global selection** - User's circle selection persists across all screens

### Question 2: Post Visibility
**Options**:
- A) Posts visible to single circle only ✅
- B) Posts can be shared to multiple circles
- C) Public/Circle/Private options per post

**Decision**: [✅] **Single circle per post** (simpler to start, can expand later)

### Question 3: Circle Limits
**Options**:
- A) Unlimited circles per user ✅
- B) Soft limit (e.g., 10 circles)
- C) Hard limit based on subscription

**Decision**: [✅] **Unlimited** with horizontal scroll handling overflow

### Question 4: Implementation Architecture
**Decision**: [✅] **Modular component system**
- Config-based selector switching
- Separate implementations for each UI pattern
- One-line change to switch between implementations
- See `CIRCLES_ARCHITECTURE.md` for details

## UI Mockups & Flows 🎨

### User Flow: Joining a Circle
```
1. Tap "+" or "Join Circle"
2. Enter invite code or scan QR
3. Preview circle info (name, members, description)
4. Confirm join
5. Circle added to list
6. Option to make it active circle
```

### User Flow: Switching Circles
```
1. Tap circle selector dropdown
2. See list of circles + "All Circles"
3. Select circle
4. Feed/content updates immediately
5. Selection persists until changed
```

### User Flow: Creating Post with Circles
```
1. Create new post
2. Select privacy: Public/Circle/Private
3. If Circle: Select which circle(s)
4. Post appears in selected circle feeds
```

## Success Metrics 📊
- Users join average of 2-3 circles
- Increased engagement (posts/comments)
- Cross-circle challenge participation
- Reduced user churn

## Risks & Mitigations ⚠️
1. **Complexity**: Keep UI simple, default to "All Circles"
2. **Performance**: Implement proper caching for multiple feeds
3. **Privacy concerns**: Clear indicators of post visibility
4. **Spam**: Invite code system, circle size limits

## Notes & Ideas 💡
- Future: Circle admins/moderators
- Future: Private vs public circles
- Future: Circle-specific challenges
- Future: Inter-circle competitions
- Consider: Circle discovery feature
- Consider: Recommended circles based on interests

## Progress Tracking 📈
- [x] Database analysis
- [x] Current implementation review
- [ ] UI/UX design finalization
- [ ] Technical architecture approval
- [ ] Phase 2 implementation
- [ ] Phase 3 implementation
- [ ] Testing & QA
- [ ] Launch preparation

---
*This document should be updated as decisions are made and implementation progresses.*