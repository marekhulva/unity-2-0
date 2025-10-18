import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../../state/rootStore';
import { GlassSurface } from '../../ui/GlassSurface';
import { ProgressRing } from '../../ui/ProgressRing';
import { cocaScore } from '../../core/logic/calculations';

const { width } = Dimensions.get('window');

export const ProgressScreen = () => {
  const insets = useSafeAreaInsets();
  const goals = useStore(s=>s.goals);
  const actions = useStore(s=>s.actions);
  const user = useStore(s=>s.user);
  const checkins = actions.filter(a=>a.done).length;
  const topStreak = Math.max(0, ...actions.map(a=>a.streak));
  const goalsCompleted = 0;
  const consistency = actions.length ? (checkins/actions.length)*100 : 0;
  const score = cocaScore(checkins, topStreak, goalsCompleted, consistency);

  return (
    <View style={styles.container}>
      {/* Hero Card - Pinned at top EXACTLY like ProfileClaude */}
      <Animated.View 
        style={[styles.heroCard, { paddingTop: insets.top + 10 }]}
        entering={FadeInDown.duration(600).springify()}
      >
        <View style={styles.heroCardInner}>
          {/* Consistency Ring with luxury gold gradient - Same position as avatar */}
          <View style={styles.consistencySection}>
            {/* Gold gradient ring */}
            <LinearGradient
              colors={[
                '#D4AF37',  // Antique gold highlight
                '#C9A050',  // Rich gold
                '#B8860B',  // Dark goldenrod
                '#A0790A',  // Deep gold
                '#B8860B',  // Dark goldenrod again
                '#C9A050',  // Rich gold again
                '#D4AF37'   // Antique gold edge
              ]}
              locations={[0, 0.2, 0.35, 0.5, 0.65, 0.8, 1]}
              style={styles.consistencyRing}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.consistencyCircle}>
              <Text style={styles.consistencyValue}>{Math.round(consistency)}%</Text>
              <Text style={styles.consistencyLabel}>CONSISTENCY</Text>
            </View>
          </View>
          
          <Text style={styles.profileName}>{user?.name || 'Achiever'}</Text>
          
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreLabel}>Coca Score: {score}</Text>
            <Text style={styles.scoreSubtext}>Consistency & check-ins power your score</Text>
          </View>
        </View>
        
        {/* Gold gradient underline */}
        <LinearGradient
          colors={[
            '#D4AF37',
            '#C9A050',
            '#B8860B',
            '#A0790A',
            '#B8860B',
            '#C9A050',
            '#D4AF37'
          ]}
          locations={[0, 0.2, 0.35, 0.5, 0.65, 0.8, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerUnderline}
        />
      </Animated.View>
      
      <View style={styles.scrollViewWrapper}>
        {/* Fallback gradient background */}
        <LinearGradient 
          colors={[
            'rgba(10, 10, 10, 1)',
            'rgba(5, 5, 5, 1)',
            'rgba(0, 0, 0, 1)'
          ]}
          locations={[0, 0.3, 1]}
          style={styles.backgroundGradient}
          pointerEvents="none"
        />
        
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { 
              paddingTop: 200 + insets.top,
              paddingBottom: insets.bottom + 100 
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.head}>Your Goals</Text>
          {goals.length===0 ? <Text style={styles.subtle}>Add a goal from setup (placeholder).</Text> :
            goals.map(g => <GoalRow key={g.id} title={g.title} status={g.status} consistency={g.consistency} />)}
        </ScrollView>
      </View>
    </View>
  );
};

const GoalRow: React.FC<{title:string; status:string; consistency:number}> = ({title,status,consistency}) => (
  <GlassSurface style={{ padding:16, marginTop:12 }}>
    <Text style={{ color:'#FFF', fontWeight:'700' }}>{title}</Text>
    <Text style={{ color:'rgba(255,255,255,0.6)', marginTop:4 }}>{status} • {Math.round(consistency)}%</Text>
  </GlassSurface>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  
  // Hero Card Styles - Exactly like ProfileClaude
  heroCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 20,
  },
  
  heroCardInner: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  
  // Consistency Ring Styles (replacing avatar)
  consistencySection: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  consistencyRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  consistencyCircle: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  consistencyValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFD700',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  
  consistencyLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#CFCFCF',
    marginTop: 2,
  },
  
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#FFFFFF',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  
  scoreContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  
  scoreLabel: {
    fontSize: 14,
    color: '#CFCFCF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  
  scoreSubtext: {
    fontSize: 12,
    color: 'rgba(207, 207, 207, 0.7)',
    marginTop: 4,
  },
  
  headerUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  
  // ScrollView Wrapper Styles
  scrollViewWrapper: {
    flex: 1,
    position: 'relative',
  },
  
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingHorizontal: 16,
  },
  
  // Original styles
  head: { 
    color: '#FFF', 
    fontWeight: '800', 
    fontSize: 22, 
    marginBottom: 8 
  },
  big: { 
    color: '#FFF', 
    fontWeight: '900', 
    fontSize: 32 
  },
  subtle: { 
    color: 'rgba(255,255,255,0.6)', 
    marginTop: 8 
  },
});