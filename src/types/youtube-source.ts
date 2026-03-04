/**
 * YouTube Source Plugin Configuration Types
 *
 * These types are used for configuring the youtube-source plugin
 * via the POST /youtube and GET /youtube endpoints.
 *
 * @see https://github.com/lavalink-devs/youtube-source
 */

/**
 * YouTube source configuration for update requests.
 * Used with POST /youtube endpoint.
 */
export interface YouTubeSourceConfig {
	/**
	 * OAuth2 refresh token for YouTube authentication.
	 * Provides access to age-restricted content and higher rate limits.
	 * Obtain through YouTube OAuth flow.
	 */
	refreshToken?: string;

	/**
	 * Whether to skip OAuth initialization flow.
	 * Set to true when providing a refreshToken to skip the interactive flow.
	 * @default false
	 */
	skipInitialization?: boolean;

	/**
	 * Proof of Origin token for bot detection bypass.
	 * Used with visitorData to appear as a legitimate browser.
	 * Generate using youtube-trusted-session-generator.
	 * @see https://github.com/iv-org/youtube-trusted-session-generator
	 */
	poToken?: string;

	/**
	 * Visitor data associated with the poToken.
	 * Must be obtained alongside the poToken from the same session.
	 */
	visitorData?: string;
}

/**
 * YouTube source configuration response.
 * Returned by GET /youtube endpoint.
 */
export interface YouTubeSourceConfigResponse {
	/**
	 * Current OAuth2 refresh token, or null if not set.
	 */
	refreshToken: string | null;
}

/**
 * OAuth token refresh response.
 * Returned by GET /youtube/oauth/{refreshToken} endpoint.
 */
export interface YouTubeOAuthTokenResponse {
	/**
	 * The access token for API requests.
	 */
	access_token: string;

	/**
	 * Time in seconds until the token expires.
	 */
	expires_in: number;

	/**
	 * The OAuth scope granted.
	 */
	scope: string;

	/**
	 * Token type (typically "Bearer").
	 */
	token_type: string;
}
