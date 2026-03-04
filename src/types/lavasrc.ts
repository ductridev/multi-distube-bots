/**
 * LavaSrc Plugin Configuration Types
 *
 * These types are used for configuring the LavaSrc plugin via the PATCH /v4/lavasrc/config endpoint.
 * LavaSrc is a Lavalink plugin that provides support for various music sources.
 *
 * @see https://github.com/TopiSenpai/LavaSrc
 */

/**
 * Supported Deezer audio formats.
 * Higher quality formats require a premium Deezer subscription.
 */
export type DeezerFormat = 'FLAC' | 'MP3_320' | 'MP3_256' | 'MP3_128' | 'MP3_64' | 'AAC_64';

/**
 * Spotify configuration for the LavaSrc plugin.
 * Used to configure Spotify source integration.
 */
export interface SpotifyConfig {
  /**
   * The Spotify client ID from the Spotify Developer Dashboard.
   * Required for fetching track metadata and playlist information.
   */
  clientId?: string;

  /**
   * The Spotify client secret from the Spotify Developer Dashboard.
   * Used alongside clientId for API authentication.
   */
  clientSecret?: string;

  /**
   * The Spotify sp_dc cookie value for authenticated requests.
   * Provides access to user-specific content and higher rate limits.
   */
  spDc?: string;

  /**
   * Whether to prefer anonymous tokens over authenticated tokens.
   * When true, uses anonymous token which doesn't require authentication.
   * @default false
   */
  preferAnonymousToken?: boolean;

  /**
   * Custom endpoint URL for fetching anonymous tokens.
   * Useful for proxying or custom token retrieval logic.
   */
  customTokenEndpoint?: string;
}

/**
 * Apple Music configuration for the LavaSrc plugin.
 * Used to configure Apple Music source integration.
 */
export interface AppleMusicConfig {
  /**
   * The Apple Music Media API token.
   * Required for accessing Apple Music catalog and user library.
   * Can be obtained from Apple Music web player requests.
   */
  mediaAPIToken?: string;
}

/**
 * Deezer configuration for the LavaSrc plugin.
 * Used to configure Deezer source integration.
 */
export interface DeezerConfig {
  /**
   * The Deezer ARL (Authentication Request Link) cookie value.
   * Required for accessing Deezer streaming services.
   * Can be found in browser cookies after logging into Deezer.
   */
  arl?: string;

  /**
   * Array of preferred audio formats for Deezer tracks.
   * The plugin will try formats in order until a valid stream is found.
   * FLAC provides lossless quality but requires premium subscription.
   * @default ['MP3_320', 'MP3_256', 'MP3_128']
   */
  formats?: DeezerFormat[];
}

/**
 * Yandex Music configuration for the LavaSrc plugin.
 * Used to configure Yandex Music source integration.
 */
export interface YandexMusicConfig {
  /**
   * The Yandex Music access token.
   * Required for accessing Yandex Music streaming services.
   * Can be obtained through Yandex OAuth authentication.
   */
  accessToken?: string;
}

/**
 * VK Music configuration for the LavaSrc plugin.
 * Used to configure VK Music (VKontakte) source integration.
 */
export interface VkMusicConfig {
  /**
   * The VK Music user access token.
   * Required for accessing VK Music streaming services.
   * Can be obtained through VK OAuth authentication.
   */
  userToken?: string;
}

/**
 * Qobuz configuration for the LavaSrc plugin.
 * Used to configure Qobuz high-resolution music streaming integration.
 */
export interface QobuzConfig {
  /**
   * The Qobuz user OAuth token.
   * Required for authenticating with Qobuz API.
   */
  userOauthToken?: string;

  /**
   * The Qobuz application ID.
   * Required for Qobuz API requests.
   * Obtain from Qobuz developer portal.
   */
  appId?: string;

  /**
   * The Qobuz application secret.
   * Used alongside appId for API authentication.
   */
  appSecret?: string;
}

/**
 * yt-dlp configuration for the LavaSrc plugin.
 * Used to configure yt-dlp integration for additional source support.
 */
export interface YtDlpConfig {
  /**
   * Path to the yt-dlp executable.
   * If not specified, the plugin will attempt to find yt-dlp in PATH.
   */
  path?: string;

  /**
   * Custom arguments to pass to yt-dlp when loading tracks.
   * These arguments are applied during the track loading phase.
   */
  customLoadArgs?: string[];

  /**
   * Custom arguments to pass to yt-dlp during playback.
   * These arguments are applied during the audio playback phase.
   */
  customPlaybackArgs?: string[];
}

/**
 * Main LavaSrc configuration interface.
 * Combines all individual source configurations into a single object.
 * Used with the PATCH /v4/lavasrc/config endpoint to update plugin settings.
 *
 * @example
 * ```typescript
 * const config: LavaSrcConfig = {
 *   spotify: {
 *     clientId: 'your-client-id',
 *     clientSecret: 'your-client-secret'
 *   },
 *   deezer: {
 *     arl: 'your-arl-cookie',
 *     formats: ['FLAC', 'MP3_320']
 *   }
 * };
 * ```
 */
export interface LavaSrcConfig {
  /**
   * Spotify source configuration.
   * Enables playback from Spotify URLs and search.
   */
  spotify?: SpotifyConfig;

  /**
   * Apple Music source configuration.
   * Enables playback from Apple Music URLs and search.
   */
  applemusic?: AppleMusicConfig;

  /**
   * Deezer source configuration.
   * Enables playback from Deezer URLs and search.
   */
  deezer?: DeezerConfig;

  /**
   * Yandex Music source configuration.
   * Enables playback from Yandex Music URLs and search.
   */
  yandexMusic?: YandexMusicConfig;

  /**
   * VK Music source configuration.
   * Enables playback from VK Music URLs and search.
   */
  vkMusic?: VkMusicConfig;

  /**
   * Qobuz source configuration.
   * Enables playback from Qobuz URLs and search.
   */
  qobuz?: QobuzConfig;

  /**
   * yt-dlp configuration.
   * Enables playback from various additional sources via yt-dlp.
   */
  ytdlp?: YtDlpConfig;
}

/**
 * Information about a connected Lavalink node.
 * Used for listing and managing LavaSrc-enabled nodes.
 */
export interface NodeInfo {
  /**
   * Unique identifier for the Lavalink node.
   * Used to target specific nodes for configuration updates.
   */
  id: string;

  /**
   * The host URL or address of the Lavalink node.
   * Format: protocol://host:port (e.g., "http://localhost:2333")
   */
  host: string;

  /**
   * Whether the node is currently connected and available.
   * Configuration updates may fail if the node is not connected.
   */
  connected: boolean;
}
