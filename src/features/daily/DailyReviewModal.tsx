import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../state/rootStore';
import { GlassSurface } from '../../ui/GlassSurface';

type MissedReason = { completed: boolean; distractions?: string; steps?: string };

export const DailyReviewModal: React.FC = () => {
  const isOpen = useStore(s=>s.isDailyReviewOpen);
  const close = useStore(s=>s.closeDailyReview);
  const actions = useStore(s=>s.actions);
  const toggleAction = useStore(s=>s.toggleAction);
  const addAction = useStore(s=>s.addAction);

  // Missed = not done today
  const missed = React.useMemo(()=>actions.filter(a=>!a.done),[actions]);

  // Steps:
  // 0 = missed-action loop (per-item)
  // 1 = biggest win
  // 2 = insight
  // 3 = gratitude
  // 4 = add tomorrow actions
  // 5 = intention -> complete
  const [step, setStep] = React.useState<number>(0);
  const [idx, setIdx] = React.useState<number>(0);
  const [reasons, setReasons] = React.useState<Record<string, MissedReason>>({});
  const [answers, setAnswers] = React.useState<Record<string,string>>({
    biggestWin:'', insight:'', grateful:'', intention:''
  });
  const [tomorrowText, setTomorrowText] = React.useState<string>('');

  React.useEffect(()=>{ if(isOpen){ setStep(0); setIdx(0); setReasons({}); setAnswers({ biggestWin:'', insight:'', grateful:'', intention:'' }); setTomorrowText(''); }},[isOpen]);

  const currentMissed = missed[idx];

  const handleMarkDone = (done:boolean) => {
    if(!currentMissed) return;
    setReasons(r => ({ ...r, [currentMissed.id]: { ...(r[currentMissed.id]||{}), completed: done }}));
  };

  const handleNextFromMissed = () => {
    if(!currentMissed) {
      setStep(1);
      return;
    }
    const r = reasons[currentMissed.id];
    if(!r || r.completed===undefined) return; // require an answer

    // if completed now, toggle it as done (late)
    if(r.completed && !currentMissed.done) {
      toggleAction(currentMissed.id);
    }

    if(idx >= missed.length-1) {
      setStep(1);
      setIdx(0);
    } else {
      setIdx(i=>i+1);
    }
  };

  const handleBackFromMissed = () => {
    if(idx<=0) return;
    setIdx(i=>i-1);
  };

  const onDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
    close();
  };

  const addTomorrow = () => {
    const text = (tomorrowText||'').trim();
    if(!text) return;
    addAction({
      id: Date.now().toString(),
      title: text,
      goalTitle: 'Free Task',
      type: 'one-time',
      streak: 0,
      done: false
    });
    setTomorrowText('');
  };

  return (
    <Modal visible={isOpen} animationType="fade" transparent>
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFillObject}/>
        <ScrollView contentContainerStyle={styles.wrap}>
          <GlassSurface style={styles.card}>
            {/* STEP 0: MISSED ACTION REVIEW */}
            {step===0 && (
              <>
                <View style={styles.header}>
                  <Text style={styles.title}>Action Review</Text>
                  <Text style={styles.badge}>{missed.length ? `${idx+1}/${missed.length}` : '0/0'}</Text>
                </View>

                {missed.length===0 ? (
                  <View style={{ alignItems:'center', marginVertical:16 }}>
                    <Text style={styles.big}>🎉 Perfect Day!</Text>
                    <Text style={styles.muted}>You completed all your actions today.</Text>
                    <Pressable style={styles.primary} onPress={()=>setStep(1)}>
                      <Text style={styles.primaryText}>Continue to Day Review</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={styles.block}>
                      <Text style={styles.label}>{currentMissed?.title}</Text>
                      {!!currentMissed?.goalTitle && (
                        <Text style={styles.pill}>{currentMissed.goalTitle} • {currentMissed.time || 'All day'}</Text>
                      )}
                    </View>

                    <Text style={[styles.label,{marginBottom:8}]}>Did you complete this today?</Text>
                    <View style={styles.row}>
                      <Pressable
                        onPress={()=>handleMarkDone(true)}
                        style={[styles.choice, reasons[currentMissed.id]?.completed===true && styles.choiceActive]}
                      >
                        <Text style={styles.choiceText}>✅ Done</Text>
                      </Pressable>
                      <Pressable
                        onPress={()=>handleMarkDone(false)}
                        style={[styles.choice, reasons[currentMissed.id]?.completed===false && styles.choiceActiveRed]}
                      >
                        <Text style={styles.choiceText}>❌ Not Done</Text>
                      </Pressable>
                    </View>

                    {reasons[currentMissed.id]?.completed===false && (
                      <>
                        <Text style={[styles.label,{marginTop:16}]}>What got in the way?</Text>
                        <TextInput
                          placeholder="Distractions, blockers, context..."
                          placeholderTextColor="rgba(255,255,255,0.55)"
                          value={reasons[currentMissed.id]?.distractions || ''}
                          onChangeText={(v)=>setReasons(r=>({...r, [currentMissed.id]:{...(r[currentMissed.id]||{completed:false}), distractions:v}}))}
                          style={styles.input}
                          multiline
                        />
                        <Text style={[styles.label,{marginTop:12}]}>What will you try next time?</Text>
                        <TextInput
                          placeholder="A concrete step or adjustment..."
                          placeholderTextColor="rgba(255,255,255,0.55)"
                          value={reasons[currentMissed.id]?.steps || ''}
                          onChangeText={(v)=>setReasons(r=>({...r, [currentMissed.id]:{...(r[currentMissed.id]||{completed:false}), steps:v}}))}
                          style={styles.input}
                          multiline
                        />
                      </>
                    )}

                    <View style={styles.navRow}>
                      <Pressable disabled={idx===0} onPress={handleBackFromMissed} style={[styles.secondary, idx===0 && styles.disabled]}>
                        <Text style={styles.secondaryText}>Previous</Text>
                      </Pressable>
                      <Pressable onPress={handleNextFromMissed} style={styles.primary}>
                        <Text style={styles.primaryText}>{idx>=missed.length-1 ? 'Continue' : 'Next Action'}</Text>
                      </Pressable>
                    </View>
                  </>
                )}
              </>
            )}

            {/* STEP 1–5 */}
            {step>=1 && step<=5 && (
              <>
                <View style={styles.header}>
                  <Text style={styles.title}>Day Review</Text>
                  <Text style={styles.badge}>{step}/5</Text>
                </View>

                {step===1 && (
                  <ReviewInput
                    title="What was your biggest win today?"
                    value={answers.biggestWin}
                    onChange={(v)=>setAnswers(a=>({...a, biggestWin:v}))}
                  />
                )}
                {step===2 && (
                  <ReviewInput
                    title="What insight or lesson did you gain today?"
                    value={answers.insight}
                    onChange={(v)=>setAnswers(a=>({...a, insight:v}))}
                  />
                )}
                {step===3 && (
                  <ReviewInput
                    title="What are you most grateful for?"
                    value={answers.grateful}
                    onChange={(v)=>setAnswers(a=>({...a, grateful:v}))}
                  />
                )}
                {step===4 && (
                  <View style={{ marginBottom:8 }}>
                    <Text style={styles.sectionTitle}>Add actions for tomorrow</Text>
                    <TextInput
                      placeholder="e.g., Pack gym bag"
                      placeholderTextColor="rgba(255,255,255,0.55)"
                      value={tomorrowText}
                      onChangeText={setTomorrowText}
                      style={styles.input}
                    />
                    <Pressable onPress={addTomorrow} style={[styles.secondary,{marginTop:8}]}>
                      <Text style={styles.secondaryText}>Add to Tomorrow</Text>
                    </Pressable>
                    <Text style={[styles.muted,{marginTop:8}]}>You can add multiple—each tap adds one.</Text>
                  </View>
                )}
                {step===5 && (
                  <ReviewInput
                    title="What is your intention for tomorrow?"
                    value={answers.intention}
                    onChange={(v)=>setAnswers(a=>({...a, intention:v}))}
                  />
                )}

                <View style={styles.navRow}>
                  <Pressable onPress={()=>setStep(s=>Math.max(1, s-1))} style={[styles.secondary, step===1 && styles.disabled]}>
                    <Text style={styles.secondaryText}>Back</Text>
                  </Pressable>
                  {step<5 ? (
                    <Pressable onPress={()=>setStep(s=>s+1)} style={styles.primary}>
                      <Text style={styles.primaryText}>Next</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={onDone} style={styles.primary}>
                      <Text style={styles.primaryText}>Finish</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </GlassSurface>

          {/* Close Tap Target */}
          <Pressable onPress={close} style={styles.scrimCloser} />
        </ScrollView>
      </View>
    </Modal>
  );
};

const ReviewInput: React.FC<{title:string; value:string; onChange:(v:string)=>void;}> = ({title,value,onChange}) => (
  <View style={{ marginBottom:8 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <TextInput
      placeholder="Type here…"
      placeholderTextColor="rgba(255,255,255,0.55)"
      value={value}
      onChangeText={onChange}
      style={styles.input}
      multiline
    />
  </View>
);

const styles = StyleSheet.create({
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.9)' },
  wrap:{ flexGrow:1, padding:20, justifyContent:'center' },
  card:{ padding:16 },
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 },
  title:{ color:'#FFF', fontSize:20, fontWeight:'800' },
  badge:{ color:'#111', backgroundColor:'#FFF', paddingHorizontal:10, paddingVertical:4, borderRadius:999, overflow:'hidden', fontWeight:'800' },
  big:{ color:'#FFF', fontSize:22, fontWeight:'800', marginBottom:6 },
  muted:{ color:'rgba(255,255,255,0.7)' },
  block:{ padding:12, borderWidth:1, borderColor:'rgba(255,255,255,0.08)', borderRadius:16, marginBottom:12, backgroundColor:'rgba(255,255,255,0.04)' },
  label:{ color:'#FFF', fontWeight:'700' },
  pill:{ color:'rgba(255,255,255,0.7)', marginTop:6 },
  row:{ flexDirection:'row', gap:8, marginTop:8 },
  choice:{ flex:1, alignItems:'center', paddingVertical:12, borderRadius:14, borderWidth:1, borderColor:'rgba(255,255,255,0.12)', backgroundColor:'rgba(255,255,255,0.05)' },
  choiceActive:{ borderColor:'rgba(255,255,255,0.6)', backgroundColor:'rgba(255,255,255,0.12)' },
  choiceActiveRed:{ borderColor:'rgba(255,99,99,0.6)', backgroundColor:'rgba(255,99,99,0.12)' },
  choiceText:{ color:'#FFF', fontWeight:'700' },
  input:{ marginTop:8, borderWidth:1, borderColor:'rgba(255,255,255,0.12)', borderRadius:14, padding:12, color:'#FFF', backgroundColor:'rgba(255,255,255,0.05)' },
  navRow:{ flexDirection:'row', gap:10, marginTop:16 },
  primary:{ flex:1, alignItems:'center', paddingVertical:12, borderRadius:14, backgroundColor:'#FFF' },
  primaryText:{ color:'#000', fontWeight:'800' },
  secondary:{ flex:1, alignItems:'center', paddingVertical:12, borderRadius:14, borderWidth:1, borderColor:'rgba(255,255,255,0.12)', backgroundColor:'rgba(255,255,255,0.04)' },
  secondaryText:{ color:'#FFF', fontWeight:'800' },
  disabled:{ opacity:0.5 },
  sectionTitle:{ color:'#FFF', fontWeight:'800', marginBottom:8 },
  scrimCloser:{ height:50 }
});