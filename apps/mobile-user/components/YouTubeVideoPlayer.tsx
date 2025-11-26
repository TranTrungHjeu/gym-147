import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Clock, Play, User, X, Youtube } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface ExerciseVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  videoUrl: string;
  embedUrl: string;
  watchUrl: string;
  duration: string;
  author: string;
  publishedAt: string;
  description: string;
}

interface YouTubeVideoPlayerProps {
  exerciseName: string;
  video?: ExerciseVideo | null;
  loading?: boolean;
  onLoadVideo?: () => void;
  style?: any;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function YouTubeVideoPlayer({
  exerciseName,
  video,
  loading = false,
  onLoadVideo,
  style,
}: YouTubeVideoPlayerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  const handlePlayVideo = () => {
    if (!video) {
      Alert.alert(
        'Video Tutorial Not Available',
        'To enable exercise video tutorials, please configure the YouTube API key in the app settings.',
        [{ text: 'OK' }]
      );
      return;
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleOpenInYouTube = async () => {
    if (!video) return;

    try {
      await Linking.openURL(video.watchUrl);
    } catch (error) {
      console.error('Error opening YouTube:', error);
      Alert.alert('Error', 'Could not open YouTube');
    }
  };

  // Create HTML for YouTube embed
  const createYouTubeHTML = (embedUrl: string) => {
    // Extract video ID from embed URL
    const videoIdMatch = embedUrl.match(/(?:embed\/|v=)([a-zA-Z0-9_-]{11})/);
    const videoId = videoIdMatch ? videoIdMatch[1] : '';

    // Use youtube-nocookie.com to avoid cookie issues and error 153
    const nocookieEmbedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, maximum-scale=1.0">
          <meta name="apple-mobile-web-app-capable" content="yes">
          <meta name="apple-mobile-web-app-status-bar-style" content="black">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <meta name="referrer" content="no-referrer-when-downgrade">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #000;
              width: 100%;
              height: 100%;
              overflow: hidden;
              -webkit-overflow-scrolling: touch;
            }
            .video-container {
              position: relative;
              width: 100%;
              height: 100%;
              background: #000;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            iframe {
              width: 100%;
              height: 100%;
              border: none;
              pointer-events: auto;
            }
            .controls {
              position: absolute;
              bottom: 10px;
              left: 10px;
              right: 10px;
              background: rgba(0,0,0,0.7);
              color: white;
              padding: 10px;
              border-radius: 5px;
              text-align: center;
              z-index: 10;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="video-container">
            <iframe
              id="youtube-player"
              src="${nocookieEmbedUrl}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(
      'https://www.youtube.com'
    )}&widget_referrer=${encodeURIComponent(
      '*'
    )}&iv_load_policy=3&cc_load_policy=0"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              webkitallowfullscreen
              mozallowfullscreen
              referrerpolicy="no-referrer-when-downgrade"
              loading="lazy"
              title="YouTube video player">
            </iframe>
          </div>
          <div class="controls">
            <p>YouTube Tutorial • Tap to play/pause</p>
          </div>
        </body>
      </html>
    `;
  };

  const styles = StyleSheet.create({
    container: {
      marginVertical: theme.spacing.sm,
    },
    videoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    thumbnailContainer: {
      position: 'relative',
      width: '100%',
      aspectRatio: 16 / 9,
    },
    videoThumbnail: {
      width: '100%',
      height: '100%',
      backgroundColor: theme.colors.border,
    },
    playOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    playButton: {
      width: 64,
      height: 64,
      borderRadius: theme.radius.round,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.lg,
    },
    durationBadge: {
      position: 'absolute',
      bottom: theme.spacing.sm,
      right: theme.spacing.sm,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    durationText: {
      ...Typography.caption,
      color: '#fff',
    },
    videoInfo: {
      padding: theme.spacing.md,
    },
    videoTitle: {
      ...Typography.h5,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    videoMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      ...Typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    videoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.radius.md,
      ...theme.shadows.sm,
    },
    videoButtonDisabled: {
      backgroundColor: theme.colors.border,
    },
    videoButtonText: {
      ...Typography.buttonMedium,
      color: theme.colors.textInverse,
      marginLeft: theme.spacing.xs,
    },
    videoButtonTextDisabled: {
      color: theme.colors.textSecondary,
    },
    loadingCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 120,
      ...theme.shadows.md,
    },
    loadingText: {
      ...Typography.bodyMedium,
      marginTop: theme.spacing.md,
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      width: screenWidth * 0.95,
      height: screenHeight * 0.85,
      backgroundColor: theme.colors.background,
      borderRadius: theme.radius.xl,
      overflow: 'hidden',
      ...theme.shadows.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    modalTitle: {
      ...Typography.h4,
      color: theme.colors.text,
      flex: 1,
      marginRight: theme.spacing.md,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.round,
      backgroundColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    videoContainer: {
      flex: 1,
      backgroundColor: '#000',
    },
    webView: {
      flex: 1,
    },
    videoControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    authorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: theme.spacing.xs,
    },
    authorText: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
    },
    openYouTubeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FF0000',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      gap: theme.spacing.xs,
      ...theme.shadows.md,
    },
    openYouTubeButtonText: {
      ...Typography.buttonSmall,
      color: '#fff',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000',
      padding: theme.spacing.xxl,
    },
    errorText: {
      ...Typography.bodyMedium,
      color: '#fff',
      textAlign: 'center',
      marginTop: theme.spacing.md,
    },
  });

  return (
    <View style={[styles.container, style]}>
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            {t('workouts.loadingVideo', { default: 'Loading video...' })}
          </Text>
        </View>
      ) : video ? (
        <View style={styles.videoCard}>
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: video.thumbnail }}
              style={styles.videoThumbnail}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.playOverlay}
              onPress={handlePlayVideo}
              activeOpacity={0.8}
            >
              <View style={styles.playButton}>
                <Play
                  size={28}
                  color={theme.colors.primary}
                  fill={theme.colors.primary}
                />
              </View>
            </TouchableOpacity>

            {video.duration !== 'N/A' && (
              <View style={styles.durationBadge}>
                <Clock size={12} color="#fff" />
                <Text style={styles.durationText}>{video.duration}</Text>
              </View>
            )}
          </View>

          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {video.title}
            </Text>

            <View style={styles.videoMeta}>
              <View style={styles.metaItem}>
                <User size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText} numberOfLines={1}>
                  {video.author}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Youtube size={14} color="#FF0000" />
                <Text style={[styles.metaText, { color: '#FF0000' }]}>
                  YouTube
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.videoButton}
              onPress={handlePlayVideo}
              activeOpacity={0.8}
            >
              <Play
                size={18}
                color={theme.colors.textInverse}
                fill={theme.colors.textInverse}
              />
              <Text style={styles.videoButtonText}>
                {t('workouts.watchTutorial')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={2}>
                {video?.title || exerciseName}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseModal}
              >
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.videoContainer}>
              {video ? (
                <WebView
                  style={styles.webView}
                  source={{ html: createYouTubeHTML(video.embedUrl) }}
                  allowsInlineMediaPlayback={true}
                  mediaPlaybackRequiresUserAction={false}
                  allowsFullscreenVideo={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  mixedContentMode="always"
                  setSupportMultipleWindows={false}
                  allowsProtectedMedia={true}
                  sharedCookiesEnabled={false}
                  thirdPartyCookiesEnabled={false}
                  cacheEnabled={true}
                  incognito={false}
                  userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
                  onError={(error) => {
                    console.error('WebView error:', error);
                    Alert.alert(
                      'Error',
                      'Failed to load video. Please try again or open in YouTube app.'
                    );
                  }}
                  onHttpError={(error) => {
                    console.error('WebView HTTP error:', error);
                  }}
                  onLoadEnd={() => {
                    console.log('✅ YouTube video loaded successfully');
                  }}
                  onMessage={(event) => {
                    console.log('WebView message:', event.nativeEvent.data);
                  }}
                />
              ) : (
                <View style={styles.errorContainer}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={styles.errorText}>Loading video...</Text>
                </View>
              )}
            </View>

            <View style={styles.videoControls}>
              <View style={styles.authorInfo}>
                <User size={16} color={theme.colors.textSecondary} />
                <Text style={styles.authorText} numberOfLines={1}>
                  {video?.author || 'Unknown'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.openYouTubeButton}
                onPress={handleOpenInYouTube}
                activeOpacity={0.8}
              >
                <Youtube size={16} color="#fff" />
                <Text style={styles.openYouTubeButtonText}>YouTube</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default YouTubeVideoPlayer;
