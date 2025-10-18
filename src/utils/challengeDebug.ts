/**
 * Comprehensive debug utility for challenge posts
 * This will help us trace data flow at every point
 */

export const ChallengeDebug = {
  // Color codes for different stages
  colors: {
    creation: '🟦',    // Blue - When creating/posting
    storage: '🟨',     // Yellow - Database operations
    retrieval: '🟩',   // Green - Fetching from DB
    rendering: '🟪',   // Purple - UI rendering
    error: '🟥',       // Red - Errors
    data: '📊',        // Data inspection
  },

  // 1. Log when activity is completed in Daily
  logDailyCompletion: (action: any) => {
    console.log(`${ChallengeDebug.colors.creation} [DAILY COMPLETION]`, {
      timestamp: new Date().toISOString(),
      actionTitle: action.title,
      isFromChallenge: action.isFromChallenge,
      challengeName: action.challengeName,
      challengeId: action.challengeId,
      fullAction: action
    });
  },

  // 2. Log when post is being created
  logPostCreation: (postData: any) => {
    console.log(`${ChallengeDebug.colors.creation} [POST CREATION]`, {
      timestamp: new Date().toISOString(),
      type: postData.type,
      isChallenge: postData.isChallenge,
      challengeName: postData.challengeName,
      challengeId: postData.challengeId,
      challengeProgress: postData.challengeProgress,
      fullPostData: postData
    });
  },

  // 3. Log database save attempt
  logDatabaseSave: (tableName: string, data: any, result: any, error: any) => {
    if (error) {
      console.error(`${ChallengeDebug.colors.error} [DB SAVE ERROR] ${tableName}`, {
        timestamp: new Date().toISOString(),
        data,
        error: error.message,
        fullError: error
      });
    } else {
      console.log(`${ChallengeDebug.colors.storage} [DB SAVE SUCCESS] ${tableName}`, {
        timestamp: new Date().toISOString(),
        savedData: result,
        originalData: data,
        challengeFields: {
          is_challenge: data.is_challenge,
          challenge_name: data.challenge_name,
          challenge_id: data.challenge_id
        }
      });
    }
  },

  // 4. Log when fetching from database
  logDatabaseFetch: (source: string, posts: any[]) => {
    const challengePosts = posts.filter(p => p.is_challenge || p.isChallenge);
    console.log(`${ChallengeDebug.colors.retrieval} [DB FETCH] ${source}`, {
      timestamp: new Date().toISOString(),
      totalPosts: posts.length,
      challengePosts: challengePosts.length,
      challengePostDetails: challengePosts.map(p => ({
        id: p.id,
        is_challenge: p.is_challenge,
        isChallenge: p.isChallenge,
        challenge_name: p.challenge_name,
        challengeName: p.challengeName,
        challenge_id: p.challenge_id,
        challengeId: p.challengeId
      })),
      samplePost: posts[0]
    });
  },

  // 5. Log state updates
  logStateUpdate: (action: string, state: any) => {
    console.log(`${ChallengeDebug.colors.data} [STATE UPDATE] ${action}`, {
      timestamp: new Date().toISOString(),
      feedLength: state.circleFeed?.length || 0,
      challengePostsInFeed: state.circleFeed?.filter((p: any) => p.isChallenge).length || 0,
      sampleChallengePost: state.circleFeed?.find((p: any) => p.isChallenge)
    });
  },

  // 6. Log rendering
  logRendering: (component: string, post: any) => {
    console.log(`${ChallengeDebug.colors.rendering} [RENDER] ${component}`, {
      timestamp: new Date().toISOString(),
      postId: post.id,
      isChallenge: post.isChallenge,
      challengeName: post.challengeName,
      challengeId: post.challengeId,
      challengeProgress: post.challengeProgress,
      hasChallengeData: !!(post.isChallenge || post.challengeName || post.challengeId),
      postKeys: Object.keys(post)
    });
  },

  // 7. Check field mapping
  checkFieldMapping: (data: any) => {
    console.log(`${ChallengeDebug.colors.data} [FIELD CHECK]`, {
      hasSnakeCase: {
        is_challenge: 'is_challenge' in data,
        challenge_name: 'challenge_name' in data,
        challenge_id: 'challenge_id' in data,
      },
      hasCamelCase: {
        isChallenge: 'isChallenge' in data,
        challengeName: 'challengeName' in data,
        challengeId: 'challengeId' in data,
      },
      actualFields: Object.keys(data).filter(k => k.includes('challenge') || k.includes('Challenge'))
    });
  },

  // Master debug function
  debugFullFlow: async () => {
    console.log('='.repeat(60));
    console.log('🔍 CHALLENGE POST DEBUG - FULL FLOW CHECK');
    console.log('='.repeat(60));
    
    // Check 1: Database schema
    console.log('\n1️⃣ Checking database schema...');
    const { supabase } = require('../services/supabase.service');
    
    try {
      // Try to fetch a post with challenge fields
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('❌ Cannot fetch posts:', error);
      } else if (posts && posts.length > 0) {
        const post = posts[0];
        console.log('✅ Sample post structure:', Object.keys(post));
        console.log('   Challenge fields present:', {
          is_challenge: 'is_challenge' in post,
          challenge_name: 'challenge_name' in post,
          challenge_id: 'challenge_id' in post,
          challenge_progress: 'challenge_progress' in post
        });
      }
    } catch (err) {
      console.error('❌ Database check failed:', err);
    }
    
    // Check 2: Recent challenge posts
    console.log('\n2️⃣ Checking for recent challenge posts...');
    try {
      const { data: challengePosts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_challenge', true)
        .limit(5);
      
      if (error) {
        console.error('❌ Cannot fetch challenge posts:', error);
      } else {
        console.log(`✅ Found ${challengePosts?.length || 0} challenge posts`);
        if (challengePosts && challengePosts.length > 0) {
          console.log('   Sample challenge post:', challengePosts[0]);
        }
      }
    } catch (err) {
      console.error('❌ Challenge post check failed:', err);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Debug check complete. Review logs above.');
    console.log('='.repeat(60));
  }
};

// Export for use in components
export default ChallengeDebug;