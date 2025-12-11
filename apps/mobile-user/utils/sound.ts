import { Audio } from 'expo-av';

let soundObject: Audio.Sound | null = null;

/**
 * Play notification sound (bell/ring)
 * Uses ping.mp3 from assets
 */
export async function playNotificationSound() {
  try {
    // Set audio mode for notifications
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    // Unload previous sound if exists
    if (soundObject) {
      try {
        await soundObject.unloadAsync();
      } catch (e) {
        // Ignore errors when unloading
      }
      soundObject = null;
    }

    // Create new sound object
    soundObject = new Audio.Sound();

    // Load and play ping.mp3 from assets
    await soundObject.loadAsync(require('@/assets/sound/ping.mp3'), {
      shouldPlay: true,
      volume: 0.8,
      isLooping: false,
    });

    await soundObject.playAsync();

    // Auto-unload after playing
    soundObject.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        soundObject?.unloadAsync().catch(() => {});
        soundObject = null;
      }
    });

    console.log('[SOUND] Playing notification sound: ping.mp3');
  } catch (error) {
    console.error('[ERROR] Failed to play notification sound:', error);
    // Silently fail - the notification itself will still play sound
  }
}

/**
 * Cleanup sound resources
 */
export async function cleanupSound() {
  try {
    if (soundObject) {
      await soundObject.unloadAsync();
      soundObject = null;
    }
  } catch (error) {
    console.error('[ERROR] Failed to cleanup sound:', error);
  }
}
