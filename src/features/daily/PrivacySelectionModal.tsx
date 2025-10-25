import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, Pressable, Dimensions, Platform, Animated, TextInput, Image, Alert, Keyboard, ScrollView } from 'react-native';
import { Camera, Mic, MessageSquare, Check, Globe, Lock, X, MapPin, Users } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { KeyboardToolbar, useKeyboardToolbar } from '../../components/KeyboardToolbar';
import { useStore } from '../../state/rootStore';

console.log('PrivacySelectionModal.tsx (THREE-WAY) FILE LOADED');

const { width } = Dimensions.get('window');

interface PrivacySelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (
    visibility: 'private' | 'circle' | 'followers',
    contentType: 'photo' | 'audio' | 'text' | 'check',
    content?: string,
    mediaUri?: string,
    newVisibility?: {
      isPrivate: boolean;
      isExplore: boolean;
      isNetwork: boolean;
      circleIds: string[];
    }
  ) => void;
  actionTitle: string;
  streak?: number;
}

export const PrivacySelectionModal: React.FC<PrivacySelectionModalProps> = ({
  visible,
  onClose,
  onSelect,
  actionTitle,
  streak = 0,
}) => {
  // ⚡ TESTING NEW UI - Set to true to test new integrated circle selection
  const TEST_NEW_UI = true;

  // Get user circles from store
  const userCircles = useStore(s => s.userCircles);
  const fetchUserCircles = useStore(s => s.fetchUserCircles);

  // Load circles when modal opens
  useEffect(() => {
    if (visible && TEST_NEW_UI) {
      console.log('🔵 Loading user circles for privacy modal...');
      console.log('🔵 Current userCircles:', userCircles);
      fetchUserCircles().then(() => {
        console.log('🔵 Circles loaded, count:', userCircles?.length);
      });
    }
  }, [visible, TEST_NEW_UI, fetchUserCircles]);

  const [selectedMedia, setSelectedMedia] = useState<'photo' | 'audio' | null>(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [selectedPrivacy, setSelectedPrivacy] = useState<'private' | 'circle' | 'followers'>('circle');
  const [dotPosition] = useState(new Animated.Value(23)); // Start at middle position for 'circle'
  const [commentText, setCommentText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);

  // NEW: State for integrated circle selection
  const [isPrivate, setIsPrivate] = useState(false);
  const [isNetwork, setIsNetwork] = useState(false);
  const [isExplore, setIsExplore] = useState(false);
  const [selectedCircleIds, setSelectedCircleIds] = useState<Set<string>>(new Set());

  // Keyboard toolbar hook for Android/Web
  const { keyboardHeight, isKeyboardVisible, toolbarStyle } = useKeyboardToolbar();

  const handleContentSelect = async (content: 'photo' | 'audio' | 'text' | 'check') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Handle photo selection
    if (content === 'photo') {
      // Request permissions based on platform
      if (Platform.OS === 'ios') {
        const { status: cameraRollStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cameraRollStatus !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to your photos in Settings');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow access to your photos');
          return;
        }
      }

      // For iOS, we might want to use camera instead of library for better compatibility
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: Platform.OS === 'ios' ? 0.5 : 0.8, // Lower quality on iOS to avoid memory issues
        base64: false, // Don't include base64 to save memory
        exif: false, // Don't include EXIF data
      });

      if (!result.canceled && result.assets[0]) {
        // On iOS, ensure the URI is properly formatted
        let photoUri = result.assets[0].uri;
        if (Platform.OS === 'ios') {
          // iOS URIs sometimes need adjustment
          console.log('iOS Photo URI:', photoUri);
        }
        setPhotoUri(photoUri);
        setSelectedMedia('photo');
        setShowCommentInput(true); // Show comment input with photo
      }
    }
    // Handle audio selection
    else if (content === 'audio') {
      if (isRecording) {
        // Stop recording
        await stopRecording();
      } else {
        // Start recording
        await startRecording();
      }
      setSelectedMedia('audio');
      setShowCommentInput(true); // Show comment input with audio
    }
    // Handle text-only comment
    else if (content === 'text') {
      setSelectedMedia(null);
      setShowCommentInput(true);
    }
    // Handle just check (no media, no comment)
    else {
      setSelectedMedia(null);
      setShowCommentInput(false);
      setCommentText('');
    }
  };

  const startRecording = async () => {
    try {
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed', 
          Platform.OS === 'ios' 
            ? 'Please allow access to your microphone in Settings' 
            : 'Please allow access to your microphone'
        );
        return;
      }

      // Set audio mode for iOS compatibility
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: Platform.OS === 'ios',
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create recording with iOS-optimized settings
      const recording = new Audio.Recording();
      
      // Use different presets for iOS vs Android
      const recordingOptions = Platform.OS === 'ios' 
        ? {
            extension: '.m4a',
            outputFormat: Audio.RECORDING_OPTION_OUTPUT_FORMAT_MPEG_4AAC,
            audioEncoder: Audio.RECORDING_OPTION_AUDIO_ENCODER_AAC,
            sampleRate: 44100,
            numberOfChannels: 2,
            bitRate: 128000,
          }
        : Audio.RecordingOptionsPresets.HIGH_QUALITY;
      
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      
      recordingRef.current = recording;
      setIsRecording(true);
      
      // Update duration every second
      const interval = setInterval(async () => {
        if (recordingRef.current) {
          const status = await recordingRef.current.getStatusAsync();
          if (status.isRecording) {
            setRecordingDuration(Math.floor(status.durationMillis / 1000));
          } else {
            clearInterval(interval);
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert(
        'Recording Error', 
        Platform.OS === 'ios' 
          ? 'Unable to start recording. Please check microphone permissions in Settings.' 
          : 'Failed to start recording'
      );
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    
    try {
      await recordingRef.current.stopAndUnloadAsync();
      
      // Reset audio mode after recording
      if (Platform.OS === 'ios') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      }
      
      const uri = recordingRef.current.getURI();
      console.log('Recording saved to:', uri);
      
      // On iOS, validate the URI format
      if (Platform.OS === 'ios' && uri) {
        console.log('iOS Audio URI format:', uri);
      }
      
      setAudioUri(uri);
      setIsRecording(false);
      // Don't reset duration - keep it to show in the preview
      recordingRef.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save recording');
    }
  };

  const handlePrivacySelect = (privacy: 'private' | 'circle' | 'followers') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedPrivacy(privacy);
    
    // Animate dot position
    const targetPosition = privacy === 'private' ? 2 : privacy === 'circle' ? 23 : 44;
    Animated.timing(dotPosition, {
      toValue: targetPosition,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleConfirm = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Determine contentType for backend based on what's selected
    let contentType: 'photo' | 'audio' | 'text' | 'check';
    if (selectedMedia === 'photo') {
      contentType = 'photo';
    } else if (selectedMedia === 'audio') {
      contentType = 'audio';
    } else if (showCommentInput && commentText.trim()) {
      contentType = 'text';
    } else {
      contentType = 'check';
    }

    // Pass both comment AND media (if they exist)
    const content = commentText.trim() || undefined;
    const mediaUri = selectedMedia === 'photo' ? photoUri :
                    selectedMedia === 'audio' ? audioUri :
                    undefined;

    // If using new UI, pass the new visibility model
    const newVisibility = TEST_NEW_UI ? {
      isPrivate,
      isExplore,
      isNetwork,
      circleIds: Array.from(selectedCircleIds)
    } : undefined;

    onSelect(selectedPrivacy, contentType, content, mediaUri || undefined, newVisibility);

    // Reset for next time
    setTimeout(() => {
      setSelectedMedia(null);
      setShowCommentInput(false);
      setSelectedPrivacy('circle');
      setCommentText('');
      setPhotoUri(null);
      setAudioUri(null);
      // Reset new UI state
      setIsPrivate(false);
      setIsNetwork(false);
      setIsExplore(false);
      setSelectedCircleIds(new Set());
    }, 200);
  };

  const handleClose = () => {
    // Stop recording if active
    if (isRecording) {
      stopRecording();
    }
    onClose();
    // Reset state after close
    setTimeout(() => {
      setSelectedMedia(null);
      setShowCommentInput(false);
      setSelectedPrivacy('circle');
      setCommentText('');
      setPhotoUri(null);
      setAudioUri(null);
    }, 200);
  };

  if (!visible) return null;

  const contentOptions = [
    { id: 'photo', icon: Camera, label: 'Photo', color: '#FFD700' },
    { id: 'audio', icon: Mic, label: 'Audio', color: '#C0C0C0' },
    { id: 'text', icon: MessageSquare, label: 'Comment', color: '#E5E4E2' },
    { id: 'check', icon: Check, label: 'Just Check', color: '#06FFA5' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        
        <View style={styles.modalContainer}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Complete Action</Text>
              <Text style={styles.subtitle}>{actionTitle}</Text>
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakText}>🔥 {streak} days</Text>
                </View>
              )}
            </View>

            {/* Content Type Selection */}
            <View style={styles.contentSection}>
              <Text style={styles.sectionLabel}>How do you want to share?</Text>
              <View style={styles.contentGrid}>
                {contentOptions.map((option) => {
                  const Icon = option.icon;
                  // Determine if this option is selected
                  const isSelected =
                    (option.id === 'photo' && selectedMedia === 'photo') ||
                    (option.id === 'audio' && selectedMedia === 'audio') ||
                    (option.id === 'text' && selectedMedia === null && showCommentInput) ||
                    (option.id === 'check' && selectedMedia === null && !showCommentInput);
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => handleContentSelect(option.id as any)}
                      style={[
                        styles.contentButton,
                        isSelected && styles.contentButtonSelected,
                        isSelected && { borderColor: option.color }
                      ]}
                    >
                      <Icon
                        size={22}
                        color={isSelected ? option.color : 'rgba(255,255,255,0.4)'}
                      />
                      <Text style={[
                        styles.contentButtonText,
                        isSelected && { color: option.color }
                      ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Comment Input - Shows for photo, audio, or text */}
            {showCommentInput && (
              <View style={styles.commentSection}>
                <TextInput
                  style={styles.commentInput}
                  placeholder={
                    selectedMedia === 'photo' ? "Add a caption for your photo..." :
                    selectedMedia === 'audio' ? "Add a caption for your audio..." :
                    "Add a note about your progress..."
                  }
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={200}
                  autoFocus={!selectedMedia} // Only auto-focus for text-only
                  inputAccessoryViewID={Platform.OS === 'ios' ? 'privacy-modal-toolbar' : undefined}
                />
                <Text style={styles.charCount}>{commentText.length}/200</Text>
              </View>
            )}

            {/* Photo Preview - Shows when photo is selected */}
            {selectedMedia === 'photo' && photoUri && (
              <View style={styles.mediaSection}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <Pressable
                  style={styles.removeMediaButton}
                  onPress={() => {
                    setPhotoUri(null);
                    setSelectedMedia(null);
                    setShowCommentInput(false);
                  }}
                >
                  <X size={16} color="#FFFFFF" />
                </Pressable>
              </View>
            )}

            {/* Audio Recording UI - Shows when audio is selected */}
            {selectedMedia === 'audio' && (
              <View style={styles.mediaSection}>
                {isRecording ? (
                  <View style={styles.recordingContainer}>
                    <View style={styles.recordingIndicator}>
                      <View style={styles.recordingDot} />
                      <Text style={styles.recordingText}>Recording... {recordingDuration}s</Text>
                    </View>
                    <Pressable
                      style={styles.stopButton}
                      onPress={() => stopRecording()}
                    >
                      <Text style={styles.stopButtonText}>Stop</Text>
                    </Pressable>
                  </View>
                ) : audioUri ? (
                  <View style={styles.audioPreview}>
                    <Mic size={20} color="#C0C0C0" />
                    <Text style={styles.audioText}>Audio recorded ({recordingDuration}s)</Text>
                    <Pressable
                      style={styles.removeMediaButton}
                      onPress={() => {
                        setAudioUri(null);
                        setSelectedMedia(null);
                        setShowCommentInput(false);
                      }}
                    >
                      <X size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={styles.startRecordingButton}
                    onPress={() => startRecording()}
                  >
                    <Mic size={20} color="#FFD700" />
                    <Text style={styles.startRecordingText}>Tap to start recording</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Privacy Selector - Integrated Circle Selection */}
            <View style={styles.privacySection}>
              {TEST_NEW_UI ? (
                // NEW: Integrated circle selection UI
                <ScrollView style={styles.privacyScrollView} showsVerticalScrollIndicator={false}>
                  {/* Quick Options */}
                  <Text style={styles.privacySectionLabel}>WHO CAN SEE THIS?</Text>

                  <Pressable
                    style={[styles.quickOption, isPrivate && styles.quickOptionSelected]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsPrivate(true);
                      setIsNetwork(false);
                      setIsExplore(false);
                      setSelectedCircleIds(new Set());
                    }}
                  >
                    <Lock size={18} color={isPrivate ? '#FFD700' : '#FFF'} />
                    <Text style={[styles.quickOptionText, isPrivate && styles.quickOptionTextActive]}>
                      Only Me
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.quickOption, isNetwork && styles.quickOptionSelected]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsNetwork(true);
                      setIsPrivate(false);
                      setSelectedCircleIds(new Set());
                    }}
                  >
                    <Users size={18} color={isNetwork ? '#FFD700' : '#FFF'} />
                    <Text style={[styles.quickOptionText, isNetwork && styles.quickOptionTextActive]}>
                      My Network (All Circles)
                    </Text>
                  </Pressable>

                  {/* Explore Toggle */}
                  <Pressable
                    style={[styles.exploreOption, isExplore && styles.exploreOptionActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsExplore(!isExplore);
                      if (!isExplore) {
                        setIsPrivate(false);
                      }
                    }}
                  >
                    <View style={[styles.checkbox, isExplore && styles.checkboxChecked]}>
                      {isExplore && <Check size={14} color="#000" strokeWidth={3} />}
                    </View>
                    <MapPin size={18} color={isExplore ? '#FFD700' : '#FFF'} />
                    <Text style={[styles.quickOptionText, isExplore && styles.quickOptionTextActive]}>
                      Share to Explore (Discoverable)
                    </Text>
                  </Pressable>

                  {/* Debug info */}
                  <Text style={{ fontSize: 10, color: '#666', marginTop: 8 }}>
                    DEBUG: {userCircles ? `${userCircles.length} circles found` : 'No circles loaded'}
                  </Text>

                  {/* Circle Selection */}
                  {userCircles && userCircles.length > 0 ? (
                    <>
                      <Text style={[styles.privacySectionLabel, { marginTop: 16 }]}>
                        OR SELECT CIRCLES
                      </Text>
                      {userCircles.map(circle => {
                        console.log('🔵 Rendering circle:', circle.name, circle.id);
                        return (
                        <Pressable
                          key={circle.id}
                          style={[
                            styles.circleOption,
                            selectedCircleIds.has(circle.id) && styles.circleOptionSelected
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            const newSet = new Set(selectedCircleIds);
                            if (newSet.has(circle.id)) {
                              newSet.delete(circle.id);
                            } else {
                              newSet.add(circle.id);
                            }
                            setSelectedCircleIds(newSet);
                            // Clear other options when selecting circles
                            if (newSet.size > 0) {
                              setIsPrivate(false);
                              setIsNetwork(false);
                            }
                          }}
                        >
                          <View style={[styles.checkbox, selectedCircleIds.has(circle.id) && styles.checkboxChecked]}>
                            {selectedCircleIds.has(circle.id) && <Check size={14} color="#000" strokeWidth={3} />}
                          </View>
                          <Text style={styles.circleEmoji}>{circle.emoji || '⭕'}</Text>
                          <Text style={[
                            styles.circleName,
                            selectedCircleIds.has(circle.id) && styles.circleNameSelected
                          ]}>
                            {circle.name}
                          </Text>
                        </Pressable>
                      )})}
                    </>
                  ) : userCircles ? (
                    <View style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 13 }}>
                        No circles found. Join or create circles to share with them.
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.privacySectionLabel, { marginTop: 16, color: 'rgba(255,255,255,0.3)' }]}>
                      Loading circles...
                    </Text>
                  )}
                </ScrollView>
              ) : (
                // OLD: Original three-way toggle
                <Pressable
                  onPress={() => {
                    // Cycle through: private -> circle -> followers -> private
                    const nextPrivacy =
                      selectedPrivacy === 'private' ? 'circle' :
                      selectedPrivacy === 'circle' ? 'followers' : 'private';
                    handlePrivacySelect(nextPrivacy);
                  }}
                  style={styles.privacyToggle}
                >
                  <View style={styles.privacyOption}>
                    {selectedPrivacy === 'private' ? (
                      <>
                        <Lock size={14} color="#C0C0C0" />
                        <Text style={[styles.privacyText, { color: '#C0C0C0' }]}>Keep Private</Text>
                      </>
                    ) : selectedPrivacy === 'circle' ? (
                      <>
                        <Text style={styles.privacyText}>⭐ Share to Circle</Text>
                      </>
                    ) : (
                      <>
                        <Globe size={16} color="#06FFA5" />
                        <Text style={[styles.privacyText, { color: '#06FFA5' }]}>All Followers</Text>
                      </>
                    )}
                  </View>
                  <View style={[
                    styles.toggleSwitch,
                    selectedPrivacy === 'private' && styles.toggleSwitchPrivate,
                    selectedPrivacy === 'followers' && styles.toggleSwitchFollowers
                  ]}>
                    <Animated.View style={[
                      styles.toggleDot,
                      {
                        left: dotPosition,
                        backgroundColor:
                          selectedPrivacy === 'private' ? '#C0C0C0' :
                          selectedPrivacy === 'circle' ? '#FFD700' : '#06FFA5'
                    }
                  ]} />
                </View>
              </Pressable>
              )}

              <Text style={styles.privacyHint}>
                {TEST_NEW_UI ? (
                  isPrivate ? 'Only you can see this' :
                  isNetwork && isExplore ? 'Visible to your network and discoverable by everyone' :
                  isNetwork ? 'Visible to all your circles and followers' :
                  isExplore && selectedCircleIds.size > 0 ? `Visible to ${selectedCircleIds.size} circle${selectedCircleIds.size > 1 ? 's' : ''} and discoverable` :
                  isExplore ? 'Discoverable by everyone' :
                  selectedCircleIds.size > 0 ? `Visible to ${selectedCircleIds.size} selected circle${selectedCircleIds.size > 1 ? 's' : ''}` :
                  'Select who can see this'
                ) : (
                  selectedPrivacy === 'private' ? 'Only you can see this' :
                  selectedPrivacy === 'circle' ? 'Visible to your close friends' :
                  'Visible to all your followers'
                )}
              </Text>
            </View>

            {/* Action Buttons - Hide when keyboard is visible and showing comment input */}
            {!(showCommentInput && isKeyboardVisible) && (
              <View style={styles.actions}>
                <Pressable onPress={handleClose} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirm}
                  style={styles.confirmButton}
                >
                  <Text style={styles.confirmText}>
                    Complete
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* iOS Keyboard Toolbar */}
      {showCommentInput && Platform.OS === 'ios' && (
        <KeyboardToolbar
          nativeID="privacy-modal-toolbar"
          onCancel={() => {
            Keyboard.dismiss();
            setCommentText('');
          }}
          onSubmit={handleConfirm}
          submitText="Complete"
          submitDisabled={false}
        />
      )}

      {/* Android/Web Keyboard Toolbar */}
      {showCommentInput && Platform.OS !== 'ios' && isKeyboardVisible && (
        <View style={toolbarStyle}>
          <KeyboardToolbar
            onCancel={() => {
              Keyboard.dismiss();
              setCommentText('');
            }}
            onSubmit={handleConfirm}
            submitText="Complete"
            submitDisabled={false}
          />
        </View>
      )}

    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: Math.min(width * 0.9, 360),
  },
  modal: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  streakBadge: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  streakText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
  },
  contentSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  contentButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  contentButtonSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 2,
  },
  contentButtonText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  privacySection: {
    marginBottom: 24,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  toggleSwitch: {
    width: 66,  // Wider for 3 positions
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.2)',
    padding: 2,
    position: 'relative',
  },
  toggleSwitchPrivate: {
    backgroundColor: 'rgba(192,192,192,0.2)',
  },
  toggleSwitchFollowers: {
    backgroundColor: 'rgba(6,255,165,0.2)',
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    position: 'absolute',
    left: 2,
  },
  toggleDotPrivate: {
    backgroundColor: '#C0C0C0',
    left: 2,  // Left position
  },
  toggleDotCircle: {
    backgroundColor: '#FFD700',
    left: 23,  // Middle position
  },
  toggleDotFollowers: {
    backgroundColor: '#06FFA5',
    left: 44,  // Right position
  },
  privacyHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
    marginLeft: 12,
  },

  // New integrated circle selection styles
  privacyScrollView: {
    maxHeight: 400,
  },
  privacySectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(255,215,0,0.6)',
    marginBottom: 8,
    fontWeight: '600',
  },
  quickOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  quickOptionSelected: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderColor: '#FFD700',
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  quickOptionTextActive: {
    color: '#FFD700',
  },
  exploreOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
  },
  exploreOptionActive: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderColor: '#FFD700',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  circleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 4,
    gap: 8,
  },
  circleOptionSelected: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderColor: 'rgba(255,215,0,0.3)',
  },
  circleEmoji: {
    fontSize: 20,
  },
  circleName: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
  circleNameSelected: {
    color: '#FFD700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFD700',
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  confirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  confirmTextDisabled: {
    color: 'rgba(0,0,0,0.3)',
  },
  commentSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 80,
    maxHeight: 120,
  },
  charCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'right',
    marginTop: 4,
  },
  mediaSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF0000',
  },
  recordingText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  stopButton: {
    backgroundColor: '#FF0000',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  audioText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  startRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    borderRadius: 12,
    padding: 16,
  },
  startRecordingText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
});