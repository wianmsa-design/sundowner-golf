import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeLifetimeStatsFromHistory } from '../utils/helpers';

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

  // Load data on app start
  useEffect(() => {
    loadData();
  }, []);

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

  // Save data whenever it changes
  useEffect(() => {
    if (!loading) {
      saveData();
    }
  }, [activeSeasons, selectedSeasonId, players, scores, entryFees, historicalSeasons, storedLifetimeStats]);

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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
