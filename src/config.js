// Build-time configuration.
// The web/viewer build sets EXPO_PUBLIC_READ_ONLY=true. The master app on the phone leaves it unset.
export const READ_ONLY = process.env.EXPO_PUBLIC_READ_ONLY === 'true';

export const GITHUB_REPO = 'wianmsa-design/sundowner-golf';
export const DATA_BRANCH = 'data';
export const DATA_PATH = 'data.json';

// Primary: GitHub API (fresh within ~1 min; conditional 304 responses don't count toward rate limits).
export const DATA_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_PATH}?ref=${DATA_BRANCH}`;

// Fallback / local-testing override: static file URL (raw.githubusercontent.com can lag up to ~5 min).
export const DATA_URL =
  process.env.EXPO_PUBLIC_DATA_URL ||
  `https://raw.githubusercontent.com/${GITHUB_REPO}/${DATA_BRANCH}/${DATA_PATH}`;

export const POLL_INTERVAL_MS = 60 * 1000;
export const PUBLISH_DEBOUNCE_MS = 10 * 1000;
export const PUBLISH_RETRY_MS = 60 * 1000;
