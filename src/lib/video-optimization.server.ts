import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

interface VideoOptimizationOptions {
  quality: "high" | "medium" | "low";
  targetResolution: "1080p" | "720p" | "480p" | "360p";
  bitrate: string;
  format: "mp4" | "webm" | "hls";
}

interface OptimizedVideo {
  format: string;
  bitrate: string;
  resolution: string;
  fileSize: number;
  duration: number;
  codec: string;
}

/**
 * Mobile Video Optimization Service
 * Optimizes videos for all mobile devices (iOS, Android, Samsung, Google)
 */
export class VideoOptimizer {
  /**
   * Get device-specific optimization profiles
   */
  static getDeviceProfiles() {
    return {
      // Apple devices (iPhone, iPad)
      apple: {
        iphone: {
          resolution: "720p",
          bitrate: "2500k",
          codec: "h264",
          format: "mp4",
          description: "iPhone (all models)",
        },
        ipad: {
          resolution: "1080p",
          bitrate: "4000k",
          codec: "h264",
          format: "mp4",
          description: "iPad (all models)",
        },
      },
      // Android devices (Samsung, Google Pixel, etc.)
      android: {
        samsung: {
          resolution: "1080p",
          bitrate: "3500k",
          codec: "h264",
          format: "mp4",
          description: "Samsung Galaxy (all models)",
        },
        google: {
          resolution: "1080p",
          bitrate: "3500k",
          codec: "h264",
          format: "mp4",
          description: "Google Pixel (all models)",
        },
        generic: {
          resolution: "720p",
          bitrate: "2500k",
          codec: "h264",
          format: "mp4",
          description: "Generic Android",
        },
      },
      // Fallback profiles
      web: {
        mobile: {
          resolution: "480p",
          bitrate: "1500k",
          codec: "h264",
          format: "mp4",
          description: "Mobile web (low bandwidth)",
        },
        tablet: {
          resolution: "720p",
          bitrate: "2500k",
          codec: "h264",
          format: "mp4",
          description: "Tablet web",
        },
      },
    };
  }

  /**
   * Optimize video for all mobile devices
   * Creates multiple versions for different devices and network conditions
   */
  static async optimizeForMobile(
    inputPath: string,
    outputDir: string
  ): Promise<Record<string, OptimizedVideo>> {
    const profiles = this.getDeviceProfiles();
    const optimizedVersions: Record<string, OptimizedVideo> = {};

    try {
      // Create output directory if it doesn't exist
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Optimize for each device type
      for (const [deviceType, devices] of Object.entries(profiles)) {
        for (const [deviceName, profile] of Object.entries(devices)) {
          const outputFile = path.join(
            outputDir,
            `${deviceType}-${deviceName}.mp4`
          );

          // FFmpeg command for optimization
          const ffmpegCmd = `ffmpeg -i "${inputPath}" \
            -vf "scale=${this.resolutionToPixels(profile.resolution)[0]}:${this.resolutionToPixels(profile.resolution)[1]}" \
            -c:v libx264 \
            -preset fast \
            -b:v ${profile.bitrate} \
            -c:a aac \
            -b:a 128k \
            -movflags +faststart \
            -y "${outputFile}"`;

          // Execute optimization
          await execAsync(ffmpegCmd);

          // Get file info
          const stats = fs.statSync(outputFile);
          const duration = await this.getVideoDuration(outputFile);

          optimizedVersions[`${deviceType}-${deviceName}`] = {
            format: profile.format,
            bitrate: profile.bitrate,
            resolution: profile.resolution,
            fileSize: stats.size,
            duration,
            codec: profile.codec,
          };
        }
      }

      return optimizedVersions;
    } catch (error) {
      console.error("Video optimization error:", error);
      throw new Error(
        `Failed to optimize video: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Create adaptive bitrate streaming (HLS) for best mobile experience
   */
  static async createAdaptiveStream(
    inputPath: string,
    outputDir: string
  ): Promise<string> {
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Create HLS playlist with multiple bitrate variants
      const hlsCmd = `ffmpeg -i "${inputPath}" \
        -filter_complex "[0:v]split=3[v1][v2][v3]; \
        [v1]scale=1280:720[v1out]; \
        [v2]scale=854:480[v2out]; \
        [v3]scale=640:360[v3out]" \
        -map "[v1out]" -c:v libx264 -b:v 4000k -c:a aac -b:a 128k -f hls -hls_time 10 -hls_list_size 0 "${outputDir}/stream-4000k.m3u8" \
        -map "[v2out]" -c:v libx264 -b:v 2500k -c:a aac -b:a 96k -f hls -hls_time 10 -hls_list_size 0 "${outputDir}/stream-2500k.m3u8" \
        -map "[v3out]" -c:v libx264 -b:v 1500k -c:a aac -b:a 64k -f hls -hls_time 10 -hls_list_size 0 "${outputDir}/stream-1500k.m3u8" \
        -y`;

      await execAsync(hlsCmd);

      // Create master playlist
      const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=4128000,RESOLUTION=1280x720
stream-4000k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2628000,RESOLUTION=854x480
stream-2500k.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=1628000,RESOLUTION=640x360
stream-1500k.m3u8`;

      fs.writeFileSync(path.join(outputDir, "master.m3u8"), masterPlaylist);

      return path.join(outputDir, "master.m3u8");
    } catch (error) {
      console.error("HLS creation error:", error);
      throw new Error(
        `Failed to create adaptive stream: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get video duration in seconds
   */
  private static async getVideoDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1:noprint_wrappers=1 "${filePath}"`
      );
      return Math.round(parseFloat(stdout));
    } catch {
      return 0;
    }
  }

  /**
   * Convert resolution string to pixel dimensions
   */
  private static resolutionToPixels(
    resolution: string
  ): [number, number] {
    const resolutionMap: Record<string, [number, number]> = {
      "1080p": [1920, 1080],
      "720p": [1280, 720],
      "480p": [854, 480],
      "360p": [640, 360],
    };
    return resolutionMap[resolution] || [1280, 720];
  }

  /**
   * Get recommended video settings based on device and network
   */
  static getRecommendedSettings(
    deviceType: "ios" | "android" | "web",
    networkSpeed: "4g" | "3g" | "wifi"
  ) {
    const settings: Record<string, Record<string, any>> = {
      ios: {
        "4g": { resolution: "1080p", bitrate: "4000k", codec: "h264" },
        "3g": { resolution: "720p", bitrate: "2500k", codec: "h264" },
        wifi: { resolution: "1080p", bitrate: "5000k", codec: "h264" },
      },
      android: {
        "4g": { resolution: "1080p", bitrate: "3500k", codec: "h264" },
        "3g": { resolution: "480p", bitrate: "1500k", codec: "h264" },
        wifi: { resolution: "1080p", bitrate: "4500k", codec: "h264" },
      },
      web: {
        "4g": { resolution: "720p", bitrate: "2500k", codec: "h264" },
        "3g": { resolution: "360p", bitrate: "1000k", codec: "h264" },
        wifi: { resolution: "1080p", bitrate: "4000k", codec: "h264" },
      },
    };

    return settings[deviceType]?.[networkSpeed] || settings.web.wifi;
  }
}

/**
 * Responsive video player component settings
 */
export const MOBILE_VIDEO_SETTINGS = {
  // iOS specific
  ios: {
    supportedFormats: ["mp4", "hls"],
    preferredCodec: "h264",
    autoplay: false,
    controls: true,
    playsinline: true, // Important for iOS inline playback
  },
  // Android specific
  android: {
    supportedFormats: ["mp4", "webm", "hls"],
    preferredCodec: "h264",
    autoplay: false,
    controls: true,
  },
  // Samsung specific
  samsung: {
    supportedFormats: ["mp4", "webm"],
    preferredCodec: "h264",
    autoplay: false,
    controls: true,
  },
  // Google Pixel specific
  google: {
    supportedFormats: ["mp4", "webm", "hls"],
    preferredCodec: "vp9",
    autoplay: false,
    controls: true,
  },
};
