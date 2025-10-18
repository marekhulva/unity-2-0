# 📚 Documentation Index
*Last Updated: August 29, 2025*

## 🚀 Current Documentation

### Core System Documentation
- **[README.md](README.md)** - Project overview and setup instructions
- **[CHALLENGE_SYSTEM_COMPLETE.md](CHALLENGE_SYSTEM_COMPLETE.md)** ⭐ NEW - Complete technical documentation of Challenge system with activity times fix
- **[CHALLENGE_DEBUG_GUIDE.md](CHALLENGE_DEBUG_GUIDE.md)** ⭐ NEW - Quick debugging guide for emergency fixes
- **[CHALLENGE_ARCHITECTURE_COMPLETE.md](CHALLENGE_ARCHITECTURE_COMPLETE.md)** - Detailed Challenge architecture documentation
- **[DEBUGGING_QUICK_REFERENCE.md](DEBUGGING_QUICK_REFERENCE.md)** - Quick debugging reference with solutions

### Component & Feature Guides  
- **[ACTIVE_COMPONENTS.md](ACTIVE_COMPONENTS.md)** - Registry of which components are actually in use
- **[CHALLENGE_POST_FIX_SUMMARY.md](CHALLENGE_POST_FIX_SUMMARY.md)** - How challenge posts were fixed
- **[PRIVACY_MODAL_SWITCHING_GUIDE.md](PRIVACY_MODAL_SWITCHING_GUIDE.md)** - Guide for privacy modal versions

### Deployment
- **[TESTFLIGHT_DEPLOYMENT.md](TESTFLIGHT_DEPLOYMENT.md)** - iOS TestFlight deployment guide

---

## 📁 Archived Documentation
Older documentation moved to `docs_archive/` folder:
- COMPLETE_DOCUMENTATION.md (outdated, doesn't cover challenges)
- BACKEND_PROGRESS.md (historical progress notes)
- OPTIMIZATION_SUMMARY.md (old optimization notes)
- PHASE_4_IMAGE_OPTIMIZATION.md (completed optimization phase)
- FLOATING_COMPOSER_DESIGN.md (design notes)

---

## 🔍 Quick Links for Debugging

### Most Common Issues:
1. **Challenge times not saving** → [CHALLENGE_DEBUG_GUIDE.md#times-arent-saving](CHALLENGE_DEBUG_GUIDE.md)
2. **Activities not showing** → [CHALLENGE_DEBUG_GUIDE.md#activities-not-showing-on-daily](CHALLENGE_DEBUG_GUIDE.md)
3. **Modal not appearing** → [CHALLENGE_SYSTEM_COMPLETE.md#issue-2-modal-not-appearing](CHALLENGE_SYSTEM_COMPLETE.md)

### Key Files to Check:
- Challenge join flow: `src/features/challenges/JoinChallengeModal.tsx`
- Time setup: `src/features/challenges/TimeSetupModal.tsx`
- Daily display: `src/features/daily/DailyScreen.tsx`
- Backend service: `src/services/supabase.challenges.service.ts`

---

## 📝 Documentation Standards

When updating documentation:
1. Update the "Last Updated" date
2. Mark new sections with ⭐
3. Move outdated docs to `docs_archive/`
4. Keep technical details in COMPLETE docs
5. Keep quick fixes in DEBUG/GUIDE docs

---

## 🆘 Need Help?

1. **Start here:** [CHALLENGE_DEBUG_GUIDE.md](CHALLENGE_DEBUG_GUIDE.md)
2. **Deep dive:** [CHALLENGE_SYSTEM_COMPLETE.md](CHALLENGE_SYSTEM_COMPLETE.md)
3. **Component lookup:** [ACTIVE_COMPONENTS.md](ACTIVE_COMPONENTS.md)

---

*Use this index to quickly find the documentation you need*