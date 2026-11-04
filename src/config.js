// Build-time configuration.
// The web/viewer build sets EXPO_PUBLIC_READ_ONLY=true. The master app on the phone leaves it unset.
export const READ_ONLY = process.env.EXPO_PUBLIC_READ_ONLY === 'true';

export const GITHUB_REPO = 'wianmsa-design/sundowner-golf';
export const DATA_BRANCH = 'data';
export const DATA_PATH = 'data.json';

export const DATA_URL =
  process.env.EXPO_PUBLIC_DATA_URL ||
  `https://raw.githubusercontent.com/${GITHUB_REPO}/${DATA_BRANCH}/${DATA_PATH}`;

export const POLL_INTERVAL_MS = 60 * 1000;
export const PUBLISH_DEBOUNCE_MS = 10 * 1000;
export const PUBLISH_RETRY_MS = 60 * 1000;
