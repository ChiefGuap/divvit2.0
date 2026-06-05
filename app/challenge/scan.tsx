import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { X, Zap, Image as ImageIcon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Import mock data to resolve challenge brand names
import {
  mockDailyChallenge,
  mockDailyChallenges,
  mockStandardChallenges,
  mockGroupChallenge,
  mockGroupChallenges,
  mockReferralChallenge,
} from '../../data/mockChallenges';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 3:5 Aspect ratio for receipt frame
const FRAME_WIDTH = SCREEN_WIDTH * 0.76;
const FRAME_HEIGHT = FRAME_WIDTH * (5 / 3);

// Helper component for four thick glowing corner brackets
const CornerBracket = ({ position }: { position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' }) => {
  const borderStyles = {
    topLeft: {
      top: -2,
      left: -2,
      borderLeftWidth: 5,
      borderTopWidth: 5,
      borderTopLeftRadius: 40,
    },
    topRight: {
      top: -2,
      right: -2,
      borderRightWidth: 5,
      borderTopWidth: 5,
      borderTopRightRadius: 40,
    },
    bottomLeft: {
      bottom: -2,
      left: -2,
      borderLeftWidth: 5,
      borderBottomWidth: 5,
      borderBottomLeftRadius: 40,
    },
    bottomRight: {
      bottom: -2,
      right: -2,
      borderRightWidth: 5,
      borderBottomWidth: 5,
      borderBottomRightRadius: 40,
    },
  };

  return (
    <View
      style={[
        {
          position: 'absolute',
          width: 48,
          height: 48,
          borderColor: '#6346cd', // primary brand purple color
        },
        borderStyles[position],
      ]}
    />
  );
};

export default function ChallengeScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { challengeId } = useLocalSearchParams();
  const idStr = Array.isArray(challengeId) ? challengeId[0] : (challengeId || '');

  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [showFlash, setShowFlash] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Scan line animation
  const scanLineY = useSharedValue(0);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withTiming(FRAME_HEIGHT, {
        duration: 2500,
        easing: Easing.bezier(0.42, 0, 0.58, 1),
      }),
      -1, // infinite loop
      false // do not reverse, jump back to start
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: scanLineY.value }],
    };
  });

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Lookup brand based on challengeId
  const getChallenge = (id: string) => {
    if (!id) return null;
    if (mockDailyChallenge.id === id) return mockDailyChallenge;
    if (mockGroupChallenge.id === id) return mockGroupChallenge;
    if (mockReferralChallenge.id === id) return mockReferralChallenge;

    const daily = mockDailyChallenges.find((c) => c.id === id);
    if (daily) return daily;

    const std = mockStandardChallenges.find((c) => c.id === id);
    if (std) return std;

    const grp = mockGroupChallenges.find((c) => c.id === id);
    if (grp) return grp;

    return null;
  };

  const challenge = getChallenge(idStr);
  const brandName = challenge?.brand || challenge?.title || 'Brand';

  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  // Select image from library
  const handlePickImage = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (result.canceled || !result.assets || !result.assets[0]) return;

      // Resize/Compress Image using manipulation
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );

      const encodedUri = encodeURIComponent(resized.uri);
      router.push(`/challenge/processing?challengeId=${idStr}&photoUri=${encodedUri}`);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  // Capture image using camera ref
  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Brief screen flash overlay
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 150);

      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo?.uri) return;

      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );

      const encodedUri = encodeURIComponent(resized.uri);
      router.push(`/challenge/processing?challengeId=${idStr}&photoUri=${encodedUri}`);
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  // Graceful permission request/denial screen
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" />

        {/* Floating close button to go back */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeButton, { top: insets.top + 16, left: 16 }]}
          activeOpacity={0.8}
        >
          <BlurView intensity={25} tint="dark" style={styles.blurCircle}>
            <X color="white" size={24} />
          </BlurView>
        </TouchableOpacity>

        <View style={styles.permissionContent}>
          <View style={styles.permissionIconBg}>
            <ImageIcon color="#a590ff" size={48} />
          </View>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access so you can scan your receipt and claim your challenge points!
          </Text>

          <TouchableOpacity
            onPress={requestPermission}
            activeOpacity={0.8}
            style={styles.grantButton}
          >
            <Text style={styles.grantButtonText}>Grant Access</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.cancelTextBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" translucent />

      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={flash === 'on'}
      />

      {/* SVG Vignette Overlay */}
      <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
        <Defs>
          <RadialGradient
            id="vignette"
            cx="50%"
            cy="50%"
            rx="65%"
            ry="65%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="0%" stopColor="#000000" stopOpacity="0.0" />
            <Stop offset="55%" stopColor="#000000" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#000000" stopOpacity="0.85" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#vignette)" />
      </Svg>

      {/* Header Row */}
      <View style={[styles.headerContainer, { top: insets.top + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          style={styles.headerBtn}
        >
          <BlurView intensity={25} tint="dark" style={styles.blurCircle}>
            <X color="white" size={24} />
          </BlurView>
        </TouchableOpacity>

        <BlurView intensity={25} tint="dark" style={styles.pillContainer}>
          <Text style={styles.pillText}>SCANNER MODE</Text>
        </BlurView>

        {/* Right Spacer for alignment */}
        <View style={{ width: 48 }} />
      </View>

      {/* Scanner Viewfinder Frame */}
      <View style={styles.frameContainer}>
        <View style={styles.viewfinderFrame}>
          {/* Loop Animated Scan Line */}
          <Animated.View style={[styles.scanLineWrapper, scanLineStyle]}>
            {/* Glowing Line */}
            <View style={styles.scanLine} />
            {/* Trailing Glow Gradient */}
            <LinearGradient
              colors={['rgba(165, 144, 255, 0.35)', 'rgba(165, 144, 255, 0.0)']}
              style={styles.scanLineGradient}
            />
          </Animated.View>

          {/* Corner Brackets */}
          <CornerBracket position="topLeft" />
          <CornerBracket position="topRight" />
          <CornerBracket position="bottomLeft" />
          <CornerBracket position="bottomRight" />

          {/* Instruction overlay */}
          <Text style={styles.instructionText}>
            Align your <Text style={styles.brandHighlight}>{brandName}</Text> receipt within the frame
          </Text>
        </View>
      </View>

      {/* Footer Controls */}
      <View style={[styles.footerContainer, { bottom: insets.bottom + 24 }]}>
        {/* Flash Toggle */}
        <View style={styles.controlItem}>
          <TouchableOpacity
            onPress={toggleFlash}
            activeOpacity={0.8}
            style={styles.headerBtn}
          >
            <BlurView
              intensity={25}
              tint="dark"
              style={[
                styles.blurCircle,
                flash === 'on' && styles.activeControlBlur,
              ]}
            >
              <Zap color={flash === 'on' ? '#a590ff' : 'white'} size={24} />
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.controlLabel}>FLASH</Text>
        </View>

        {/* Shutter Button */}
        <TouchableOpacity
          onPress={handleCapture}
          activeOpacity={0.8}
          style={styles.shutterRing}
        >
          <View style={styles.shutterCenter} />
        </TouchableOpacity>

        {/* Gallery Button */}
        <View style={styles.controlItem}>
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.8}
            style={styles.headerBtn}
          >
            <BlurView intensity={25} tint="dark" style={styles.blurCircle}>
              <ImageIcon color="white" size={24} />
            </BlurView>
          </TouchableOpacity>
          <Text style={styles.controlLabel}>GALLERY</Text>
        </View>
      </View>

      {/* Shutter Flash Animation Overlay */}
      {showFlash && <View style={styles.whiteFlashOverlay} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#12052b',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(99, 70, 205, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(165, 144, 255, 0.25)',
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Outfit_700Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 15,
    fontFamily: 'Manrope',
    color: '#d4b7ff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
    paddingHorizontal: 8,
  },
  grantButton: {
    backgroundColor: '#6346cd',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6346cd',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  grantButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
  },
  cancelTextBtn: {
    marginTop: 20,
    paddingVertical: 8,
  },
  cancelText: {
    color: '#a895c2',
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    zIndex: 10,
  },
  headerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  blurCircle: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  pillContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  pillText: {
    color: '#e8d5ff',
    fontSize: 13,
    fontFamily: 'Outfit',
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  viewfinderFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(165, 144, 255, 0.35)', // primary-fixed/40
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#a590ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 10,
  },
  scanLineWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 60,
  },
  scanLine: {
    height: 3,
    backgroundColor: '#a590ff', // primary-fixed
    shadowColor: '#a590ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  scanLineGradient: {
    height: 50,
    width: '100%',
  },
  instructionText: {
    position: 'absolute',
    bottom: 32,
    left: 20,
    right: 20,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    fontFamily: 'Manrope',
    fontWeight: '600',
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  brandHighlight: {
    color: '#a590ff', // primary-fixed
    fontWeight: 'bold',
  },
  footerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  controlItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
  },
  controlLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
    fontFamily: 'Outfit_700Bold',
    marginTop: 8,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  activeControlBlur: {
    backgroundColor: 'rgba(99, 70, 205, 0.35)',
    borderWidth: 1.5,
    borderColor: '#a590ff',
  },
  shutterRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  shutterCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  whiteFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 999,
  },
});
