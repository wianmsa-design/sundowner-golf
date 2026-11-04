import * as SecureStore from 'expo-secure-store';
import { GITHUB_REPO, DATA_BRANCH, DATA_PATH, DATA_URL, DATA_API_URL } from '../config';

const TOKEN_KEY = 'githubPublishToken';

// ---------- Token (master app only) ----------
export const getToken = async () => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (e) {
    return null;
  }
};
export const setToken = async (token) => {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token.trim());
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// ---------- Snapshot ----------
export const buildSnapshot = ({ activeSeasons, players, scores, entryFees, historicalSeasons, storedLifetimeStats }) => ({
  version: 1,
  activeSeasons,
  players,
  scores,
  entryFees,
  historicalSeasons,
  storedLifetimeStats,
});

// Stable string used for change detection (excludes the timestamp).
export const snapshotKey = (snapshot) => JSON.stringify(snapshot);

export const isValidSnapshot = (d) =>
  !!d &&
  typeof d === 'object' &&
  Array.isArray(d.activeSeasons) &&
  Array.isArray(d.players) &&
  Array.isArray(d.historicalSeasons) &&
  d.scores && typeof d.scores === 'object' &&
  d.entryFees && typeof d.entryFees === 'object';

// ---------- UTF-8 safe base64 ----------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export const utf8ToBase64 = (str) => {
  // Encode to UTF-8 bytes
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
        i++;
      }
    }
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 || 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 || 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
};

// ---------- Publish (master) ----------
const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_PATH}`;

const ghHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
});

const getRemoteSha = async (token) => {
  const res = await fetch(`${apiUrl}?ref=${DATA_BRANCH}&t=${Date.now()}`, { headers: ghHeaders(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub ${res.status} while reading current file`);
  const json = await res.json();
  return json.sha;
};

const putFile = async (token, content, sha) => {
  const body = {
    message: `Update data ${new Date().toISOString()}`,
    content,
    branch: DATA_BRANCH,
  };
  if (sha) body.sha = sha;
  return fetch(apiUrl, { method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body) });
};

// Uploads the snapshot. Retries once with a fresh sha if GitHub reports a conflict.
export const publishSnapshot = async (token, snapshot) => {
  if (!token) throw new Error('No GitHub token set');
  const content = utf8ToBase64(JSON.stringify({ ...snapshot, updatedAt: new Date().toISOString() }));
  let sha = await getRemoteSha(token);
  let res = await putFile(token, content, sha);
  if (res.status === 409 || res.status === 422) {
    sha = await getRemoteSha(token);
    res = await putFile(token, content, sha);
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('GitHub rejected the token (expired or missing permission)');
  }
  if (!res.ok) throw new Error(`GitHub error ${res.status}`);
};

// ---------- Fetch (viewer) ----------
const parseSnapshot = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('Data file is not valid JSON');
  }
  if (!isValidSnapshot(data)) throw new Error('Data file has an unexpected shape');
  return data;
};

const fetchText = async (url, options) => {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`Data fetch failed (${res.status})`);
  return res.text();
};

export const fetchRemoteSnapshot = async () => {
  // A test override (EXPO_PUBLIC_DATA_URL) is used directly.
  if (process.env.EXPO_PUBLIC_DATA_URL) {
    return parseSnapshot(await fetchText(DATA_URL));
  }
  try {
    return parseSnapshot(await fetchText(DATA_API_URL, { headers: { Accept: 'application/vnd.github.raw+json' } }));
  } catch (e) {
    // API unavailable or rate-limited: fall back to the static file (may be a few minutes old)
    return parseSnapshot(await fetchText(`${DATA_URL}?t=${Math.floor(Date.now() / 60000)}`));
  }
};
