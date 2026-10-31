export interface VideoProcessOptions {
  language?: string; // 'ita' | 'eng' | 'fra' | 'esp'
  detailLevel?: 'concise' | 'standard' | 'detailed';
  generateSummary?: boolean;
  generateTranscription?: boolean;
}

export type VideoPlatform =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'facebook'
  | 'twitter'
  | 'linkedin'
  | 'reddit'
  | 'vimeo'
  | 'dailymotion'
  | 'web';

export interface VideoProcessResult {
  success: boolean;
  url: string;
  title: string;
  author: string;
  thumbnailUrl?: string;
  videoId?: string;
  platform?: VideoPlatform;
  transcription: string;
  transcriptionPages: string[];
  summary: string;
  summaryPages: string[];
  combinedPages: string[];
  keyPoints?: string[];
  duration?: string;
  language?: string;
  wordsCount: number;
  error?: string;
  fallback?: boolean;
}

class VideoTranscribeService {
  /**
   * Helper to validate video URL (supports YouTube, Instagram, TikTok, Facebook, Twitter/X, Vimeo, etc.)
   */
  public isValidVideoUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    try {
      const parsed = new URL(trimmed);
      return (
        parsed.hostname.includes('youtube.com') ||
        parsed.hostname.includes('youtu.be') ||
        parsed.hostname.includes('instagram.com') ||
        parsed.hostname.includes('tiktok.com') ||
        parsed.hostname.includes('facebook.com') ||
        parsed.hostname.includes('fb.watch') ||
        parsed.hostname.includes('twitter.com') ||
        parsed.hostname.includes('x.com') ||
        parsed.hostname.includes('linkedin.com') ||
        parsed.hostname.includes('reddit.com') ||
        parsed.hostname.includes('vimeo.com') ||
        parsed.hostname.includes('dailymotion.com') ||
        parsed.hostname.includes('threads.net') ||
        parsed.hostname.includes('twitch.tv') ||
        /\.(mp4|webm|m4v|mov|mkv)(\?.*)?$/i.test(trimmed) ||
        parsed.protocol === 'http:' ||
        parsed.protocol === 'https:'
      );
    } catch {
      return false;
    }
  }

  /**
   * Identifies social network / platform from URL
   */
  public detectPlatform(url: string): VideoPlatform {
    try {
      const parsed = new URL(url.trim());
      const host = parsed.hostname.toLowerCase();
      if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
      if (host.includes('instagram.com')) return 'instagram';
      if (host.includes('tiktok.com')) return 'tiktok';
      if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
      if (host.includes('twitter.com') || host.includes('x.com')) return 'twitter';
      if (host.includes('linkedin.com')) return 'linkedin';
      if (host.includes('reddit.com')) return 'reddit';
      if (host.includes('vimeo.com')) return 'vimeo';
      if (host.includes('dailymotion.com')) return 'dailymotion';
    } catch {}
    return 'web';
  }

  /**
   * Extract video thumbnail and ID if YouTube
   */
  public extractYouTubeInfo(url: string): { videoId: string | null; thumbnailUrl: string | null } {
    try {
      const parsed = new URL(url.trim());
      let videoId: string | null = null;
      if (parsed.hostname.includes('youtu.be')) {
        videoId = parsed.pathname.replace(/^\//, '').split('?')[0];
      } else if (parsed.hostname.includes('youtube.com')) {
        videoId = parsed.searchParams.get('v');
        if (!videoId && parsed.pathname.includes('/shorts/')) {
          videoId = parsed.pathname.split('/shorts/')[1]?.split('?')[0] || null;
        } else if (!videoId && parsed.pathname.includes('/embed/')) {
          videoId = parsed.pathname.split('/embed/')[1]?.split('?')[0] || null;
        }
      }
      if (videoId) {
        return {
          videoId,
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        };
      }
    } catch {}
    return { videoId: null, thumbnailUrl: null };
  }

  /**
   * Call backend /api/video/process to transcribe & summarize the video
   */
  public async processVideo(
    url: string,
    options: VideoProcessOptions = {}
  ): Promise<VideoProcessResult> {
    const {
      language = 'ita',
      detailLevel = 'standard',
      generateSummary = true,
      generateTranscription = true,
    } = options;

    const res = await fetch('/api/video/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url.trim(),
        language,
        detailLevel,
        generateSummary,
        generateTranscription,
      }),
    });

    if (!res.ok) {
      let errMsg = `Errore di rete (${res.status})`;
      try {
        const errData = await res.json();
        if (errData?.error) errMsg = errData.error;
      } catch {}
      throw new Error(errMsg);
    }

    const data: VideoProcessResult = await res.json();
    if (data.error && !data.transcription && !data.summary) {
      throw new Error(data.error);
    }

    return data;
  }
}

export const videoTranscribeService = new VideoTranscribeService();
