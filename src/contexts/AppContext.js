import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [currentSeason, setCurrentSeason] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [entryFees, setEntryFees] = useState({});
  const [historicalSeasons, setHistoricalSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigationTarget, setNavigationTarget] = useState(null); // { week, round }

  // Load data on app start
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentSeasonData = await AsyncStorage.getItem('currentSeason');
      const playersData = await AsyncStorage.getItem('players');
      const scoresData = await AsyncStorage.getItem('scores');
      const entryFeesData = await AsyncStorage.getItem('entryFees');
      const historicalData = await AsyncStorage.getItem('historicalSeasons');

      if (currentSeasonData) setCurrentSeason(JSON.parse(currentSeasonData));
      if (playersData) setPlayers(JSON.parse(playersData));
      if (scoresData) setScores(JSON.parse(scoresData));
      if (entryFeesData) setEntryFees(JSON.parse(entryFeesData));
      if (historicalData) setHistoricalSeasons(JSON.parse(historicalData));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('currentSeason', JSON.stringify(currentSeason));
      await AsyncStorage.setItem('players', JSON.stringify(players));
      await AsyncStorage.setItem('scores', JSON.stringify(scores));
      await AsyncStorage.setItem('entryFees', JSON.stringify(entryFees));
      await AsyncStorage.setItem('historicalSeasons', JSON.stringify(historicalSeasons));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  // Save data whenever it changes
  useEffect(() => {
    if (!loading) {
      saveData();
    }
  }, [currentSeason, players, scores, entryFees, historicalSeasons]);

  const value = {
    currentSeason,
    setCurrentSeason,
    players,
    setPlayers,
    scores,
    setScores,
    entryFees,
    setEntryFees,
    historicalSeasons,
    setHistoricalSeasons,
    loading,
    navigationTarget,
    setNavigationTarget,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
