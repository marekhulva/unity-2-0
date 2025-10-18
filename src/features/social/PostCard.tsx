import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassSurface } from '../../ui/GlassSurface';
import { useStore } from '../../state/rootStore';
import { Post } from '../../state/slices/socialSlice';
import ChallengeDebug from '../../utils/challengeDebug';
import ChallengeDebugV2 from '../../utils/challengeDebugV2';

/**
 * @deprecated This component is NOT USED in production
 * The active post card component is LuxuryPostCard defined in SocialScreenV6.tsx
 * Last used: Unknown
 * Replacement: LuxuryPostCard in SocialScreenV6.tsx line ~1217
 */
export const PostCard: React.FC<{ post: Post; which:'circle'|'follow'}> = ({ post, which })=>{
  if (__DEV__) {
    console.warn('⚠️ DEPRECATED: PostCard is not used. Active component: LuxuryPostCard in SocialScreenV6.tsx');
  }
  const react = useStore(s=>s.react);
  const scale = React.useRef(new Animated.Value(1)).current;
  const pulse = () => Animated.sequence([Animated.timing(scale,{toValue:0.96,duration:80,useNativeDriver:true}), Animated.spring(scale,{toValue:1,useNativeDriver:true})]).start();
  
  // Comprehensive debug for ALL posts, especially challenge posts
  React.useEffect(() => {
    // CHECKPOINT 9: Post data in PostCard for rendering
    if (post.type === 'checkin' && (post.isChallenge || post.challengeName)) {
      ChallengeDebugV2.checkpoint('CP9-POSTCARD-RENDER', 'Post data in PostCard component', post);
      
      // Generate flow report at the end
      ChallengeDebugV2.generateReport();
    }
    
    ChallengeDebug.logRendering('PostCard', post);
    ChallengeDebug.checkFieldMapping(post);
    
    if (post.type === 'checkin') {
      console.log('🔍 [CRITICAL DEBUG] Checkin post full data:', {
        id: post.id,
        type: post.type,
        // Check both naming conventions
        isChallenge: post.isChallenge,
        is_challenge: (post as any).is_challenge,
        challengeName: post.challengeName,
        challenge_name: (post as any).challenge_name,
        challengeId: post.challengeId,
        challenge_id: (post as any).challenge_id,
        challengeProgress: post.challengeProgress,
        challenge_progress: (post as any).challenge_progress,
        // All keys
        allKeys: Object.keys(post),
        // Full post object
        fullPost: JSON.stringify(post, null, 2)
      });
    }
  }, [post]);
  
  // style by type
  const borderTint = post.isChallenge ? 'rgba(192,192,192,0.5)' // Silver for challenges
                    : post.type==='checkin' ? (post.goalColor || 'rgba(16,185,129,0.5)') 
                    : post.type==='photo' ? 'rgba(255,255,255,0.35)'
                    : post.type==='audio' ? 'rgba(160,170,255,0.45)'
                    : 'rgba(255,255,255,0.12)';
  return (
    <View style={styles.cardContainer}>
      {/* Golden or Silver gradient border - very thin like the tab indicator */}
      <View style={styles.goldBorderContainer}>
        <LinearGradient
          colors={post.isChallenge ? ['#C0C0C0', '#808080'] : ['#FFD700', '#FFA500']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.goldBorder}
        />
      </View>
      
      <GlassSurface style={styles.card}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={{fontSize:16}}>{post.avatar ?? '👤'}</Text>
          </View>
          <View style={{flex:1}}>
            <Pressable><Text style={styles.user}>{post.user}</Text></Pressable>
            <Text style={styles.when}>{post.time}</Text>
          </View>
          {post.isChallenge && post.challengeName ? (
            <View style={styles.challengeChip}>
              <Text style={styles.challengeChipText}>🏆 {post.challengeName}</Text>
            </View>
          ) : (
            post.type==='checkin' && !!post.goal && (
              <View style={[styles.goalChip, { borderColor: (post.goalColor || '#10B981')+'55' }]}>
                <Text style={[styles.goalChipText, { color: post.goalColor || '#10B981' }]}>{post.goal}</Text>
              </View>
            )
          )}
        </View>

        {/* Content */}
        {post.type==='checkin' && (
          <View style={styles.block}>
            <Text style={styles.checkTitle}>✅ {post.actionTitle}</Text>
            {!!post.streak && <Text style={styles.meta}>🔥 {post.streak} day streak</Text>}
            {post.isChallenge && post.challengeProgress && (
              <Text style={styles.challengeProgressText}>📊 {post.challengeProgress}</Text>
            )}
          </View>
        )}
        {!!post.content && <Text style={styles.content}>{post.content}</Text>}
        
        {/* Challenge leaderboard info */}
        {post.isChallenge && (post.leaderboardPosition || post.totalParticipants) && (
          <View style={styles.challengeInfo}>
            {post.leaderboardPosition && post.leaderboardPosition <= 3 && (
              <Text style={styles.challengeInfoText}>
                {post.leaderboardPosition === 1 ? '🥇' : post.leaderboardPosition === 2 ? '🥈' : '🥉'} Currently {post.leaderboardPosition === 1 ? '1st' : post.leaderboardPosition === 2 ? '2nd' : '3rd'} place
              </Text>
            )}
            {post.totalParticipants && (
              <Text style={[styles.challengeInfoText, post.leaderboardPosition ? {marginLeft: 8} : {}]}>
                {post.leaderboardPosition && post.leaderboardPosition <= 3 ? '·' : ''} 👥 {post.totalParticipants} participants
              </Text>
            )}
          </View>
        )}
        
        {!!post.photoUri && <Image source={{uri: post.photoUri}} style={styles.photo} />}
        {post.type==='audio' && post.audioUri && (
          <View style={styles.audioRow}>
            <Text style={styles.audioBadge}>🎙️ Voice note</Text>
          </View>
        )}

        <Animated.View style={[styles.row,{transform:[{scale}]}]}>
          {['👏','💪','🔥'].map(e=>(
            <Pressable key={e} onPress={()=>{ pulse(); react(post.id,e,which); }} style={styles.pill}>
              <Text style={styles.pillText}>{e} {(post.reactions[e]||0)}</Text>
            </Pressable>
          ))}
          <Pressable style={[styles.pill, {marginLeft:'auto'}]}>
            <Text style={styles.pillText}>💬 Comment</Text>
          </Pressable>
        </Animated.View>
      </GlassSurface>
    </View>
  );
};
const styles=StyleSheet.create({
  cardContainer:{ 
    marginBottom:12, 
    position:'relative',
  },
  goldBorderContainer:{
    position:'absolute',
    top:0,
    left:0,
    right:0,
    bottom:0,
    borderRadius:16,
    padding:1, // Creates the thin border effect
    zIndex:0,
  },
  goldBorder:{
    flex:1,
    borderRadius:16,
  },
  card:{ 
    padding:16, 
    borderWidth:0, // Remove the existing border since we have the gold one
    borderRadius:16,
    backgroundColor:'rgba(0,0,0,0.98)', // Ensure card is opaque
    position:'relative',
    zIndex:1,
  },
  header:{ flexDirection:'row', alignItems:'center', marginBottom:8, gap:10 },
  avatar:{ width:36, height:36, borderRadius:18, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'rgba(255,255,255,0.14)' },
  user:{ color:'#FFF', fontWeight:'700' },
  when:{ color:'rgba(255,255,255,0.6)', fontSize:12 },
  goalChip:{ borderWidth:1, borderRadius:999, paddingVertical:6, paddingHorizontal:10 },
  goalChipText:{ fontWeight:'700' },
  challengeChip:{ 
    backgroundColor:'rgba(192,192,192,0.15)', 
    borderWidth:1, 
    borderColor:'rgba(192,192,192,0.4)', 
    borderRadius:999, 
    paddingVertical:6, 
    paddingHorizontal:10 
  },
  challengeChipText:{ color:'#C0C0C0', fontWeight:'700', fontSize:12 },
  challengeProgressText:{ color:'#FFD700', marginTop:4, fontWeight:'600' },
  challengeInfo:{ flexDirection:'row', alignItems:'center', marginTop:8, marginBottom:8 },
  challengeInfoText:{ color:'rgba(255,255,255,0.7)', fontSize:13 },
  block:{ borderWidth:1, borderColor:'rgba(255,255,255,0.12)', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:12, padding:10, marginBottom:8 },
  checkTitle:{ color:'#FFF', fontWeight:'700' },
  meta:{ color:'rgba(255,255,255,0.7)', marginTop:4 },
  content:{ color:'#ECEDEF', marginTop:6, marginBottom:8, lineHeight:20 },
  photo:{ width:'100%', height:220, borderRadius:12, marginTop:4 },
  audioRow:{ marginTop:6, marginBottom:6 },
  audioBadge:{ color:'#DADBE0' },
  row:{ flexDirection:'row', gap:8 },
  pill:{ borderColor:'rgba(255,255,255,0.12)', borderWidth:1, paddingVertical:8, paddingHorizontal:14, borderRadius:999, backgroundColor:'rgba(255,255,255,0.05)' },
  pillText:{ color:'#FFFFFF' }
});