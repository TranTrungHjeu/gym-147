import { getLanguagePreference } from '@/locales/i18n';
import Constants from 'expo-constants';

interface YouTubeVideo {
  id: string | { videoId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeResponse {
  items: YouTubeVideo[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

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

export class YouTubeVideoService {
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly apiKey =
    Constants.expoConfig?.extra?.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY';

  private cache = new Map<string, ExerciseVideo>();

  /**
   * Get region and language based on app language setting
   */
  private async getRegionAndLanguage(): Promise<{
    regionCode: string;
    language: string;
  }> {
    try {
      // Get app language preference
      const appLanguage = await getLanguagePreference();
      console.log('🌍 App language preference:', appLanguage);

      // Check if app is set to Vietnamese
      if (appLanguage === 'vi') {
        console.log('🇻🇳 App language is Vietnamese - using VN region');
        return { regionCode: 'VN', language: 'vi' };
      }

      // Default to US English
      console.log('🇺🇸 App language is English - using US region');
      return { regionCode: 'US', language: 'en' };
    } catch (error) {
      console.warn('Failed to get app language preference:', error);
      // Fallback to US English
      console.log('🇺🇸 Fallback to English - using US region');
      return { regionCode: 'US', language: 'en' };
    }
  }

  /**
   * Get exercise video from YouTube
   * @param exerciseName - Name of the exercise
   * @returns Promise<ExerciseVideo | null>
   */
  async getExerciseVideo(exerciseName: string): Promise<ExerciseVideo | null> {
    try {
      // Check if API key is configured
      if (!this.apiKey || this.apiKey === 'YOUR_YOUTUBE_API_KEY') {
        console.log(`⚠️ YouTube API key not configured for: ${exerciseName}`);
        return null;
      }

      // Check cache first
      if (this.cache.has(exerciseName)) {
        console.log(`📹 Using cached YouTube video for: ${exerciseName}`);
        return this.cache.get(exerciseName)!;
      }

      // Create search query
      const searchQuery = await this.createSearchQuery(exerciseName);
      const { regionCode, language } = await this.getRegionAndLanguage();

      console.log(`🔍 Searching YouTube for: ${searchQuery}`);
      console.log(`🌍 Region: ${regionCode}, Language: ${language}`);

      // Make API request with region and language
      const response = await fetch(
        `${this.baseUrl}/search?part=snippet&q=${encodeURIComponent(
          searchQuery
        )}&type=video&videoCategoryId=26&maxResults=1&regionCode=${regionCode}&relevanceLanguage=${language}&key=${
          this.apiKey
        }`
      );

      if (!response.ok) {
        throw new Error(
          `YouTube API error: ${response.status} ${response.statusText}`
        );
      }

      const data: YouTubeResponse = await response.json();
      console.log(`📹 YouTube API response:`, data);

      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        const exerciseVideo = this.transformYouTubeVideo(video, exerciseName);

        // Cache the result
        this.cache.set(exerciseName, exerciseVideo);

        console.log(
          `✅ Found YouTube video for ${exerciseName}:`,
          exerciseVideo
        );
        return exerciseVideo;
      }

      console.log(`❌ No YouTube video found for: ${exerciseName}`);
      return null;
    } catch (error) {
      console.error(
        `❌ Error fetching YouTube video for ${exerciseName}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get multiple exercise videos
   * @param exerciseNames - Array of exercise names
   * @returns Promise<{[key: string]: ExerciseVideo}>
   */
  async getMultipleExerciseVideos(
    exerciseNames: string[]
  ): Promise<{ [key: string]: ExerciseVideo }> {
    const videos: { [key: string]: ExerciseVideo } = {};

    // Check if API key is configured
    if (!this.apiKey || this.apiKey === 'YOUR_YOUTUBE_API_KEY') {
      console.log('⚠️ YouTube API key not configured - skipping video loading');
      return videos;
    }

    // Process videos in parallel with rate limiting
    const promises = exerciseNames.map(async (exerciseName, index) => {
      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, index * 200));

      const video = await this.getExerciseVideo(exerciseName);
      if (video) {
        videos[exerciseName] = video;
      }
    });

    await Promise.all(promises);
    return videos;
  }

  /**
   * Create optimized search query for exercise videos
   * @param exerciseName - Name of the exercise
   * @returns Optimized search query
   */
  private async createSearchQuery(exerciseName: string): Promise<string> {
    const exercise = exerciseName.toLowerCase();
    const { language } = await this.getRegionAndLanguage();

    // Vietnamese search mappings
    const vietnameseMappings: { [key: string]: string } = {
      'jumping jacks': 'bài tập jumping jacks hướng dẫn',
      'push ups': 'hít đất đúng cách hướng dẫn',
      squats: 'squat đúng cách hướng dẫn',
      burpees: 'burpee bài tập hướng dẫn',
      'mountain climbers': 'mountain climber bài tập',
      'high knees': 'chạy nâng cao gối bài tập',
      lunges: 'lunge bài tập chân hướng dẫn',
      plank: 'plank giữ tư thế hướng dẫn',
      'sit ups': 'gập bụng đúng cách',
      crunches: 'crunch bụng hướng dẫn',
      'hiit cardio': 'hiit cardio bài tập tim mạch',
      running: 'chạy bộ kỹ thuật hướng dẫn',
      cycling: 'đạp xe bài tập hướng dẫn',
      'jumping rope': 'nhảy dây bài tập hướng dẫn',
      boxing: 'boxing bài tập võ',
      dancing: 'nhảy aerobic bài tập',
    };

    // English search mappings
    const englishMappings: { [key: string]: string } = {
      'jumping jacks': 'jumping jacks exercise tutorial how to',
      'push ups': 'push ups exercise form tutorial',
      squats: 'squats exercise proper form tutorial',
      burpees: 'burpees exercise tutorial how to',
      'mountain climbers': 'mountain climbers exercise tutorial',
      'high knees': 'high knees running exercise tutorial',
      lunges: 'lunges exercise proper form tutorial',
      plank: 'plank exercise core tutorial',
      'sit ups': 'sit ups abs exercise tutorial',
      crunches: 'crunches abs exercise tutorial',
      'hiit cardio': 'hiit cardio workout tutorial',
      running: 'running technique tutorial',
      cycling: 'cycling exercise bike tutorial',
      'jumping rope': 'jump rope exercise tutorial',
      boxing: 'boxing workout exercise tutorial',
      dancing: 'dance cardio exercise tutorial',
    };

    // Use appropriate mapping based on language
    const searchMappings =
      language === 'vi' ? vietnameseMappings : englishMappings;
    const baseQuery =
      searchMappings[exercise] || `${exercise} exercise tutorial how to`;

    console.log(`🔍 Language: ${language}, Exercise: ${exercise}`);
    console.log(`🔍 Base query: ${baseQuery}`);

    // Add Vietnamese keywords if Vietnamese locale
    if (language === 'vi') {
      const finalQuery = `${baseQuery} việt nam`;
      console.log(`🔍 Final Vietnamese query: ${finalQuery}`);
      return finalQuery;
    }

    console.log(`🔍 Final English query: ${baseQuery}`);
    return baseQuery;
  }

  /**
   * Transform YouTube video to our ExerciseVideo format
   * @param youtubeVideo - Video from YouTube API
   * @param exerciseName - Name of the exercise
   * @returns ExerciseVideo object
   */
  private transformYouTubeVideo(
    youtubeVideo: YouTubeVideo,
    exerciseName: string
  ): ExerciseVideo {
    // Extract videoId from the id object or string
    const videoId =
      typeof youtubeVideo.id === 'string'
        ? youtubeVideo.id
        : youtubeVideo.id.videoId;

    return {
      videoId: videoId,
      title: youtubeVideo.snippet.title,
      thumbnail: youtubeVideo.snippet.thumbnails.medium.url,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      duration: 'N/A', // Would need separate API call for duration
      author: youtubeVideo.snippet.channelTitle,
      publishedAt: youtubeVideo.snippet.publishedAt,
      description: youtubeVideo.snippet.description,
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ YouTube video cache cleared');
  }

  /**
   * Force refresh video (clear cache and reload)
   */
  async forceRefreshVideo(exerciseName: string): Promise<ExerciseVideo | null> {
    console.log(`🔄 Force refreshing video for: ${exerciseName}`);
    this.cache.delete(exerciseName);
    return await this.getExerciseVideo(exerciseName);
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const youtubeVideoService = new YouTubeVideoService();
