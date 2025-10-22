import { useTheme } from '@/utils/theme';
import { Typography } from '@/utils/typography';
import { Clock, Play, User, X, Youtube } from 'lucide-react-native';
import React, { useState } from 'react';
import {
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
  onLoadVideo?: () => void;
  style?: any;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

function YouTubeVideoPlayer({
  exerciseName,
  video,
  onLoadVideo,
  style,
}: YouTubeVideoPlayerProps) {
  const { theme } = useTheme();
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
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 0;
              background: #000;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
            }
            .video-container {
              position: relative;
              width: 100%;
              height: 0;
              padding-bottom: 56.25%; /* 16:9 aspect ratio */
            }
            iframe {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border: none;
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
            }
          </style>
        </head>
        <body>
          <div class="video-container">
            <iframe
              src="${embedUrl}?autoplay=1&rel=0&modestbranding=1"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
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
      marginVertical: 12,
    },
    videoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    videoThumbnail: {
      width: '100%',
      height: 200,
      borderRadius: 8,
      backgroundColor: theme.colors.border,
    },
    playOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    playButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    videoInfo: {
      marginTop: 12,
    },
    videoTitle: {
      ...Typography.h4,
      color: theme.colors.text,
      marginBottom: 8,
      lineHeight: 22,
    },
    videoMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
    },
    metaText: {
      ...Typography.caption,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    videoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    videoButtonDisabled: {
      backgroundColor: theme.colors.border,
    },
    videoButtonText: {
      ...Typography.bodyLarge,
      color: theme.colors.textInverse,
      marginLeft: 8,
      fontWeight: '600',
    },
    videoButtonTextDisabled: {
      color: theme.colors.textSecondary,
    },
    setupCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 20,
      marginTop: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    setupIcon: {
      alignSelf: 'center',
      marginBottom: 12,
    },
    setupTitle: {
      ...Typography.h4,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    setupDescription: {
      ...Typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    setupButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      alignSelf: 'center',
    },
    setupButtonText: {
      ...Typography.bodyLarge,
      color: theme.colors.textInverse,
      fontWeight: '600',
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
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    modalTitle: {
      ...Typography.h3,
      color: theme.colors.text,
      flex: 1,
      marginRight: 16,
      lineHeight: 24,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
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
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    authorInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    authorText: {
      ...Typography.bodyMedium,
      color: theme.colors.text,
      marginLeft: 8,
    },
    openYouTubeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FF0000',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      shadowColor: '#FF0000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    openYouTubeButtonText: {
      ...Typography.bodyMedium,
      color: '#fff',
      marginLeft: 6,
      fontWeight: '600',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#000',
      padding: 40,
    },
    errorIcon: {
      marginBottom: 20,
    },
    errorText: {
      ...Typography.h4,
      color: '#fff',
      textAlign: 'center',
      marginBottom: 12,
    },
    errorSubtext: {
      ...Typography.bodyMedium,
      color: '#ccc',
      textAlign: 'center',
      marginBottom: 24,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      ...Typography.bodyLarge,
      color: theme.colors.textInverse,
      fontWeight: '600',
    },
  });

  return (
    <View style={[styles.container, style]}>
      {video ? (
        <View style={styles.videoCard}>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: video.thumbnail }}
              style={styles.videoThumbnail}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.playOverlay}
              onPress={handlePlayVideo}
            >
              <View style={styles.playButton}>
                <Play
                  size={24}
                  color={theme.colors.primary}
                  fill={theme.colors.primary}
                />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {video.title}
            </Text>

            <View style={styles.videoMeta}>
              <View style={styles.metaItem}>
                <User size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{video.author}</Text>
              </View>
              <View style={styles.metaItem}>
                <Clock size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>{video.duration}</Text>
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
            >
              <Play size={18} color={theme.colors.textInverse} />
              <Text style={styles.videoButtonText}>Watch Tutorial</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.setupCard}>
          <Youtube
            size={48}
            color={theme.colors.textSecondary}
            style={styles.setupIcon}
          />
          <Text style={styles.setupTitle}>Video Tutorial Not Available</Text>
          <Text style={styles.setupDescription}>
            To enable exercise video tutorials, please configure the YouTube API
            key in the app settings.
          </Text>
          <TouchableOpacity style={styles.setupButton} onPress={onLoadVideo}>
            <Text style={styles.setupButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

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
                  onError={(error) => {
                    console.error('WebView error:', error);
                  }}
                  onHttpError={(error) => {
                    console.error('WebView HTTP error:', error);
                  }}
                />
              ) : (
                <View style={styles.errorContainer}>
                  <Youtube size={64} color="#FF0000" style={styles.errorIcon} />
                  <Text style={styles.errorText}>Video Not Available</Text>
                  <Text style={styles.errorSubtext}>
                    Unable to load the video tutorial. Please check your
                    internet connection.
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={onLoadVideo}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.videoControls}>
              <View style={styles.authorInfo}>
                <User size={16} color={theme.colors.textSecondary} />
                <Text style={styles.authorText}>
                  By {video?.author || 'Unknown'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.openYouTubeButton}
                onPress={handleOpenInYouTube}
              >
                <Youtube size={16} color="#fff" />
                <Text style={styles.openYouTubeButtonText}>
                  Open in YouTube
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default YouTubeVideoPlayer;
