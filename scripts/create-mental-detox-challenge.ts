import { supabase } from '../src/services/supabase.service';

async function createMentalDetoxChallenge() {
  console.log('🧠 Creating 7 Day Mental Detox challenge...\n');

  const challengeData = {
    name: '7 Day Mental Detox',
    description: `7 days to reset your mind and reclaim mental clarity.

WHAT YOU'LL TRACK:

DAY 1:
🧠 Brain Dump (60 min) - Write everything on your mind
💪 Exercise (20+ min)
😴 Sleep Goal (8+ hours)
🚫 No Social Media
🚫 No Long-Form Content
🧘 Detox Compliance

DAYS 2-7:
✍️ Freewriting (20 min on pen & paper)
💪 Exercise (20+ min)
😴 Sleep Goal (8+ hours)
🚫 No Social Media
🚫 No Long-Form Content
🧘 Detox Compliance

REPLACEMENT ACTIVITIES (encouraged):
Use the freed-up time for:
• 📺 Light TV (comedy, feel-good shows)
• 📚 High-quality books
• 💼 Deep work blocks
• 👥 In-person social interaction
• 🎨 Creative hobbies

BONUS RECOMMENDATIONS:
• Avoid alcohol, weed, other vices
• Get sunlight and movement daily
• Eat whole, real foods
• Journal your observations

WHY THIS WORKS:
Your brain is overstimulated. This detox creates space for clarity, focus, and genuine rest. The first 2-3 days are hardest - boredom is the goal. Let yourself be bored. That's when the reset happens.

Remember: You need 32/42 checkmarks to succeed (75%). That's 6 per day on average. Missing a few is OK - this is about progress, not perfection.`,
    emoji: '🧠',
    type: 'streak',
    scope: 'global',
    duration_days: 7,
    success_threshold: 75,
    badge_emoji: '🧠',
    badge_name: 'Mental Detox Master',
    has_forum: true,
    status: 'active',
    predetermined_activities: [
      {
        id: 'detox-brain-dump',
        title: 'Brain Dump',
        emoji: '🧠',
        frequency: 'once',
        min_duration_minutes: 60,
        start_day: 1,
        end_day: 1,
        description: 'Write everything on your mind for 60 minutes. Thoughts, worries, ideas, everything. Write without stopping, no structure needed.'
      },
      {
        id: 'detox-freewrite',
        title: 'Freewriting',
        emoji: '✍️',
        frequency: 'daily',
        min_duration_minutes: 20,
        start_day: 2,
        end_day: 7,
        description: 'Freewrite for 20 minutes on pen and paper. No structure, no editing, just flow.'
      },
      {
        id: 'detox-exercise',
        title: 'Exercise',
        emoji: '💪',
        frequency: 'daily',
        min_duration_minutes: 20,
        description: 'At least 20 minutes of physical movement. Walking, gym, yoga, sports - anything that gets you moving.'
      },
      {
        id: 'detox-sleep',
        title: 'Sleep Goal',
        emoji: '😴',
        frequency: 'daily',
        description: 'Get 8+ hours of quality sleep. Mark complete in the morning if you slept well.'
      },
      {
        id: 'detox-no-social',
        title: 'No Social Media',
        emoji: '🚫',
        frequency: 'daily',
        description: 'Stay off Instagram, TikTok, Twitter, Facebook, and other social media platforms today. (Checking messages/DMs is OK if necessary, but no scrolling feeds)'
      },
      {
        id: 'detox-no-content',
        title: 'No Long-Form Content',
        emoji: '📵',
        frequency: 'daily',
        description: 'Avoid YouTube, podcasts, movies, TV shows, and news today. (Exception: Light comedy TV is OK as replacement activity)'
      },
      {
        id: 'detox-compliance',
        title: 'Detox Compliance',
        emoji: '🧘',
        frequency: 'daily',
        description: 'Avoid other dopamine-heavy digital inputs today: doom-scrolling, gaming binges, rabbit-hole browsing, etc. Keep digital consumption intentional.'
      }
    ]
  };

  const { data, error } = await supabase
    .from('challenges')
    .insert(challengeData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating challenge:', error.message);
    process.exit(1);
  }

  console.log('✅ Challenge created successfully!\n');
  console.log('📋 Details:');
  console.log(`   ID: ${data.id}`);
  console.log(`   Name: ${data.name}`);
  console.log(`   Duration: ${data.duration_days} days`);
  console.log(`   Activities: ${data.predetermined_activities.length}`);
  console.log(`   Success threshold: ${data.success_threshold}%`);
  console.log(`   Badge: ${data.badge_emoji} ${data.badge_name}`);
  console.log('\n✨ Done! The challenge is now live in the app.');
}

createMentalDetoxChallenge();
