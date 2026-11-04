import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeLifetimeStatsFromHistory } from '../utils/helpers';
import { READ_ONLY, POLL_INTERVAL_MS, PUBLISH_DEBOUNCE_MS, PUBLISH_RETRY_MS } from '../config';
import { buildSnapshot, snapshotKey, getToken, publishSnapshot, fetchRemoteSnapshot, isValidSnapshot } from '../utils/sync';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [activeSeasons, setActiveSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [entryFees, setEntryFees] = useState({});
  const [historicalSeasons, setHistoricalSeasons] = useState([]);
  const [storedLifetimeStats, setStoredLifetimeStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [navigationTarget, setNavigationTarget] = useState(null); // { week, round }

  // Computed value: get the currently selected season
  const selectedSeason = activeSeasons.find(s => s.id === selectedSeasonId) || activeSeasons[0] || null;

  // Sync / publish status (shown in the UI)
  const [publishStatus, setPublishStatus] = useState({ state: 'idle', time: null, message: '' });
  const [lastSynced, setLastSynced] = useState(null);
  const [syncError, setSyncError] = useState('');
  const lastRemoteKey = useRef(null);
  const publishing = useRef(false);
  const publishTimer = useRef(null);
  const latestSnapshot = useRef(null);

  // Load data on app start
  useEffect(() => {
    if (READ_ONLY) {
      loadReadOnly();
    } else {
      loadData();
      AsyncStorage.getItem('publishStatus').then(v => v && setPublishStatus(JSON.parse(v))).catch(() => {});
    }
  }, []);

  // ---------- Read-only (viewer) mode ----------
  const applySnapshot = (d) => {
    const seasons = d.activeSeasons.map((season, index) => ({
      ...season,
      id: season.id || `${season.year}-${season.season}-${index}`,
    }));
    setActiveSeasons(seasons);
    setSelectedSeasonId(prev => (prev && seasons.some(x => x.id === prev) ? prev : seasons[0]?.id || null));
    setPlayers(d.players);
    setScores(d.scores);
    setEntryFees(d.entryFees);
    setHistoricalSeasons(d.historicalSeasons);
    setStoredLifetimeStats(
      d.historicalSeasons.length > 0
        ? computeLifetimeStatsFromHistory(d.historicalSeasons)
        : d.storedLifetimeStats || {}
    );
  };

  const refreshRemote = useCallback(async () => {
    try {
      const d = await fetchRemoteSnapshot();
      const key = JSON.stringify(d);
      if (key !== lastRemoteKey.current) {
        lastRemoteKey.current = key;
        applySnapshot(d);
        AsyncStorage.setItem('remoteCache', key).catch(() => {});
      }
      setLastSynced(new Date());
      setSyncError('');
    } catch (error) {
      setSyncError(error.message || 'Could not update');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReadOnly = async () => {
    // Show cached data immediately (works offline), then refresh from the network
    try {
      const cached = await AsyncStorage.getItem('remoteCache');
      if (cached) {
        const d = JSON.parse(cached);
        if (isValidSnapshot(d)) {
          lastRemoteKey.current = cached;
          applySnapshot(d);
          setLoading(false);
        }
      }
    } catch (e) {}
    refreshRemote();
  };

  useEffect(() => {
    if (!READ_ONLY) return;
    const interval = setInterval(refreshRemote, POLL_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && refreshRemote());
    let onVisible;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      onVisible = () => document.visibilityState === 'visible' && refreshRemote();
      document.addEventListener('visibilitychange', onVisible);
    }
    return () => {
      clearInterval(interval);
      sub.remove();
      if (onVisible) document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshRemote]);

  const loadData = async () => {
    try {
      const activeSeasonsData = await AsyncStorage.getItem('activeSeasons');
      const selectedSeasonIdData = await AsyncStorage.getItem('selectedSeasonId');
      const playersData = await AsyncStorage.getItem('players');
      const scoresData = await AsyncStorage.getItem('scores');
      const entryFeesData = await AsyncStorage.getItem('entryFees');
      const historicalData = await AsyncStorage.getItem('historicalSeasons');

      // Backward compatibility: migrate from old currentSeason structure
      if (!activeSeasonsData) {
        const currentSeasonData = await AsyncStorage.getItem('currentSeason');
        if (currentSeasonData) {
          const oldCurrentSeason = JSON.parse(currentSeasonData);
          // Ensure season has an ID
          if (!oldCurrentSeason.id) {
            oldCurrentSeason.id = Date.now().toString();
          }
          setActiveSeasons([oldCurrentSeason]);
          setSelectedSeasonId(oldCurrentSeason.id);
          // Clean up old storage key
          await AsyncStorage.removeItem('currentSeason');
        }
      } else {
        const loadedActiveSeasons = JSON.parse(activeSeasonsData);
        // Ensure all seasons have IDs
        const seasonsWithIds = loadedActiveSeasons.map((season, index) => ({
          ...season,
          id: season.id || `${season.year}-${season.season}-${index}`,
        }));
        setActiveSeasons(seasonsWithIds);

        // Set selected season ID
        if (selectedSeasonIdData) {
          setSelectedSeasonId(selectedSeasonIdData);
        } else if (seasonsWithIds.length > 0) {
          // Default to first active season
          setSelectedSeasonId(seasonsWithIds[0].id);
        }
      }

      if (playersData) setPlayers(JSON.parse(playersData));
      if (scoresData) setScores(JSON.parse(scoresData));
      if (entryFeesData) setEntryFees(JSON.parse(entryFeesData));

      let loadedHistoricalSeasons = [];
      if (historicalData) {
        loadedHistoricalSeasons = JSON.parse(historicalData);
        setHistoricalSeasons(loadedHistoricalSeasons);
      }

      // Rebuild from history so stats saved by older versions of the logic can't go stale
      if (loadedHistoricalSeasons.length > 0) {
        setStoredLifetimeStats(computeLifetimeStatsFromHistory(loadedHistoricalSeasons));
      } else {
        const storedLifetimeData = await AsyncStorage.getItem('storedLifetimeStats');
        if (storedLifetimeData) setStoredLifetimeStats(JSON.parse(storedLifetimeData));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('activeSeasons', JSON.stringify(activeSeasons));
      await AsyncStorage.setItem('selectedSeasonId', selectedSeasonId || '');
      await AsyncStorage.setItem('players', JSON.stringify(players));
      await AsyncStorage.setItem('scores', JSON.stringify(scores));
      await AsyncStorage.setItem('entryFees', JSON.stringify(entryFees));
      await AsyncStorage.setItem('historicalSeasons', JSON.stringify(historicalSeasons));
      await AsyncStorage.setItem('storedLifetimeStats', JSON.stringify(storedLifetimeStats));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  // Save data whenever it changes (master only)
  useEffect(() => {
    if (!loading && !READ_ONLY) {
      saveData();
    }
  }, [activeSeasons, selectedSeasonId, players, scores, entryFees, historicalSeasons, storedLifetimeStats]);

  // ---------- Publishing (master only) ----------
  const setStatus = (status) => {
    setPublishStatus(status);
    AsyncStorage.setItem('publishStatus', JSON.stringify(status)).catch(() => {});
  };

  // force=true publishes even if nothing changed since the last publish
  const doPublish = useCallback(async (force = false) => {
    if (READ_ONLY || publishing.current || !latestSnapshot.current) return;
    const snapshot = latestSnapshot.current;
    const key = snapshotKey(snapshot);
    const lastKey = await AsyncStorage.getItem('lastPublishedKey');
    if (!force && lastKey === key) return;

    const token = await getToken();
    if (!token) {
      setStatus({ state: 'error', time: new Date().toISOString(), message: 'No GitHub token set. Add it under Management > Setup.' });
      return;
    }
    publishing.current = true;
    setStatus({ state: 'publishing', time: new Date().toISOString(), message: '' });
    try {
      await publishSnapshot(token, snapshot);
      await AsyncStorage.setItem('lastPublishedKey', key);
      setStatus({ state: 'ok', time: new Date().toISOString(), message: '' });
    } catch (error) {
      setStatus({ state: 'error', time: new Date().toISOString(), message: error.message || 'Publish failed' });
      // Retry later (e.g. no signal on the course)
      clearTimeout(publishTimer.current);
      publishTimer.current = setTimeout(() => doPublish(false), PUBLISH_RETRY_MS);
    } finally {
      publishing.current = false;
      // Data may have changed while uploading
      if (latestSnapshot.current && snapshotKey(latestSnapshot.current) !== key) {
        clearTimeout(publishTimer.current);
        publishTimer.current = setTimeout(() => doPublish(false), PUBLISH_DEBOUNCE_MS);
      }
    }
  }, []);

  useEffect(() => {
    if (loading || READ_ONLY) return;
    latestSnapshot.current = buildSnapshot({ activeSeasons, players, scores, entryFees, historicalSeasons, storedLifetimeStats });
    clearTimeout(publishTimer.current);
    publishTimer.current = setTimeout(() => doPublish(false), PUBLISH_DEBOUNCE_MS);
    return () => clearTimeout(publishTimer.current);
  }, [loading, activeSeasons, players, scores, entryFees, historicalSeasons, storedLifetimeStats]);

  const value = {
    // New multi-season structure
    activeSeasons,
    setActiveSeasons,
    selectedSeason,
    selectedSeasonId,
    setSelectedSeasonId,
    // Backward compatibility aliases
    currentSeason: selectedSeason,
    setCurrentSeason: (season) => {
      // Update the selected season in the activeSeasons array
      setActiveSeasons(prev => prev.map(s => s.id === season.id ? season : s));
    },
    players,
    setPlayers,
    scores,
    setScores,
    entryFees,
    setEntryFees,
    historicalSeasons,
    setHistoricalSeasons,
    storedLifetimeStats,
    setStoredLifetimeStats,
    loading,
    navigationTarget,
    setNavigationTarget,
    // Viewer / publishing
    readOnly: READ_ONLY,
    publishStatus,
    publishNow: () => doPublish(true),
    lastSynced,
    syncError,
    refreshRemote,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
