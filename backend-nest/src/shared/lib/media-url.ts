/** Shared @IsUrl options — allow localhost/dev URLs used by local storage uploads */
export const MEDIA_URL_OPTS = {
  require_tld: false,
  protocols: ['http', 'https'] as ('http' | 'https')[],
};
