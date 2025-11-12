import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppContext } from '../contexts/AppContext';
import { theme, getScoreColor, getContrastTextColor } from '../utils/theme';
import {
  getWeekDateRange,
  formatDateRange,
  getCurrentWeekNumber,
} from '../utils/helpers';

export default function ScoreEntryScreen({ navigation, route }) {
  const { currentSeason, players, scores, setScores, navigationTarget, setNavigationTarget, historicalSeasons } = useContext(AppContext);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [weekScores, setWeekScores] = useState({});
  const [doubleRounds, setDoubleRounds] = useState({});

  // Get most recent historical season
  const latestHistoricalSeason = historicalSeasons.length > 0
    ? [...historicalSeasons].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.season - a.season;
      })[0]
    : null;

  // Calculate rounds played for each player in latest historical season
  const playerRoundsInHistory = {};
  if (latestHistoricalSeason) {
    const historicalScores = latestHistoricalSeason.scores || {};
    players.forEach((player) => {
      let roundCount = 0;
      Object.keys(historicalScores).forEach((weekKey) => {
        const weekData = historicalScores[weekKey];
        if (weekData[player.id]) {
          roundCount++;
        }
      });
      playerRoundsInHistory[player.id] = roundCount;
    });
  }

  const activePlayers = players.filter((p) => p.active).sort((a, b) => {
    const aRounds = playerRoundsInHistory[a.id] || 0;
    const bRounds = playerRoundsInHistory[b.id] || 0;
    if (bRounds !== aRounds) {
      return bRounds - aRounds; // Descending order
    }
    return a.name.localeCompare(b.name); // Alphabetical if same rounds
  });

  useEffect(() => {
    if (currentSeason) {
      // Check if we have a navigation target from context
      if (navigationTarget) {
        setCurrentWeek(navigationTarget.week);
        setCurrentRound(navigationTarget.round || 1);
        loadWeekScores(navigationTarget.week, navigationTarget.round || 1);
        setNavigationTarget(null); // Clear the target
      } else {
        const targetWeek = findNextBlankWeek();
        setCurrentWeek(targetWeek.week);
        setCurrentRound(targetWeek.round);
        loadWeekScores(targetWeek.week, targetWeek.round);
      }
    }
  }, [currentSeason, navigationTarget]);

  const handleAddRound = () => {
    // Find next round number for current week
    let nextRound = currentRound === 1 ? 2 : currentRound + 1;
    while (scores[`week_${currentWeek}_${nextRound}`]) {
      nextRound++;
    }
    setCurrentRound(nextRound);
    setWeekScores({});
    setDoubleRounds({});
  };

  useEffect(() => {
    const currentCalendarWeek = getCurrentWeekNumber(currentSeason?.startDate);
    const isCurrentWeek = currentWeek === currentCalendarWeek;

    navigation.setOptions({
      headerRight: () => {
        const nextRoundNumber = currentRound === 1 ? 2 : currentRound + 1;
        return (
          <View style={styles.headerButtonContainer}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleAddRound}
            >
              <Text style={styles.headerButtonText}>R{nextRoundNumber}</Text>
            </TouchableOpacity>
            {!isCurrentWeek && currentCalendarWeek !== null && (
              <TouchableOpacity
                style={[styles.headerButton, styles.headerButtonSpaced]}
                onPress={() => {
                  setCurrentWeek(currentCalendarWeek);
                  setCurrentRound(1);
                  loadWeekScores(currentCalendarWeek, 1);
                }}
              >
                <MaterialIcons name="today" size={20} color={theme.colors.text} />
              </TouchableOpacity>
            )}
          </View>
        );
      },
    });
  }, [navigation, currentWeek, currentRound, currentSeason, scores]);

  const loadWeekScores = (week, round = 1) => {
    const weekKey = round === 1 ? `week_${week}` : `week_${week}_${round}`;
    const existingScores = scores[weekKey] || {};
    setWeekScores(existingScores);

    const doubles = {};
    Object.keys(existingScores).forEach((playerId) => {
      doubles[playerId] = existingScores[playerId]?.isDouble || false;
    });
    setDoubleRounds(doubles);
  };

  const findNextBlankWeek = () => {
    if (!currentSeason) return { week: 1, round: 1 };

    const currentCalendarWeek = getCurrentWeekNumber(currentSeason.startDate);

    // If season hasn't started yet (future season), start at week 1
    if (currentCalendarWeek === null) {
      return { week: 1, round: 1 };
    }

    // Always return current calendar week
    return { week: currentCalendarWeek, round: 1 };
  };

  const handleScoreChange = (playerId, value) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0) return;

    setWeekScores((prev) => ({
      ...prev,
      [playerId]: {
        score: numValue,
        isDouble: doubleRounds[playerId] || false,
      },
    }));
  };

  const incrementScore = (playerId, amount) => {
    const current = weekScores[playerId]?.score || 0;
    const newScore = Math.max(0, current + amount);
    handleScoreChange(playerId, newScore.toString());
  };

  const toggleDoubleRound = (playerId) => {
    const newState = !doubleRounds[playerId];
    setDoubleRounds((prev) => ({
      ...prev,
      [playerId]: newState,
    }));

    if (weekScores[playerId]) {
      setWeekScores((prev) => ({
        ...prev,
        [playerId]: {
          ...prev[playerId],
          isDouble: newState,
        },
      }));
    }
  };

  const handleSubmit = () => {
    const hasAnyScores = Object.values(weekScores).some((s) => s.score > 0);

    if (!hasAnyScores) {
      Alert.alert(
        'No Scores Entered',
        'Are you sure you want to submit with no scores?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Submit',
            onPress: () => saveAndAdvance(),
          },
        ]
      );
      return;
    }

    saveAndAdvance();
  };

  const saveAndAdvance = () => {
    const weekKey = currentRound === 1 ? `week_${currentWeek}` : `week_${currentWeek}_${currentRound}`;
    const updatedScores = { ...scores, [weekKey]: weekScores };
    setScores(updatedScores);

    // Advance to next week
    const nextWeek = currentWeek + 1;
    setCurrentWeek(nextWeek);
    setCurrentRound(1);
    setWeekScores({});
    setDoubleRounds({});
  };

  const handleUpdate = () => {
    const weekKey = currentRound === 1 ? `week_${currentWeek}` : `week_${currentWeek}_${currentRound}`;
    const updatedScores = { ...scores, [weekKey]: weekScores };
    setScores(updatedScores);

    // Advance to next week
    const nextWeek = currentWeek + 1;
    setCurrentWeek(nextWeek);
    setCurrentRound(1);
    setWeekScores({});
    setDoubleRounds({});
  };

  const handleSwipeLeft = () => {
    // If on round > 1, go to previous round of same week
    if (currentRound > 1) {
      const newRound = currentRound - 1;
      setCurrentRound(newRound);
      loadWeekScores(currentWeek, newRound);
    } else if (currentWeek > 1) {
      // Check if previous week has multiple rounds
      let checkRound = 2;
      while (scores[`week_${currentWeek - 1}_${checkRound}`]) {
        checkRound++;
      }
      const lastRound = checkRound - 1;
      const newWeek = currentWeek - 1;
      setCurrentWeek(newWeek);
      setCurrentRound(lastRound > 0 ? lastRound : 1);
      loadWeekScores(newWeek, lastRound > 0 ? lastRound : 1);
    }
  };

  const handleSwipeRight = () => {
    // Check if there's a next round for current week
    const nextRoundKey = `week_${currentWeek}_${currentRound + 1}`;
    if (scores[nextRoundKey] && Object.keys(scores[nextRoundKey]).length > 0) {
      const newRound = currentRound + 1;
      setCurrentRound(newRound);
      loadWeekScores(currentWeek, newRound);
    } else {
      // Go to next week
      const newWeek = currentWeek + 1;
      setCurrentWeek(newWeek);
      setCurrentRound(1);
      loadWeekScores(newWeek, 1);
    }
  };

  if (!currentSeason) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="flag" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No active season</Text>
        <Text style={styles.emptySubText}>
          Go to Management to start a new season
        </Text>
      </View>
    );
  }

  if (activePlayers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="person-add" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No players added</Text>
        <Text style={styles.emptySubText}>
          Go to Management to add players
        </Text>
      </View>
    );
  }

  const { start, end } = getWeekDateRange(currentSeason.startDate, currentWeek);
  const currentCalendarWeek = getCurrentWeekNumber(currentSeason.startDate);
  const isCurrentWeek = currentWeek === currentCalendarWeek;
  const isPastWeek = currentCalendarWeek !== null && currentWeek < currentCalendarWeek;
  const isFutureWeek = currentCalendarWeek === null || currentWeek > currentCalendarWeek;
  const dateRange = isCurrentWeek ? 'Current' : formatDateRange(start, end);

  let headerColor = theme.colors.weekCurrent; // default for current week
  if (isPastWeek) {
    headerColor = theme.colors.weekPast;
  } else if (isFutureWeek) {
    headerColor = theme.colors.weekFuture;
  }

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <View style={[styles.weekHeader, { backgroundColor: headerColor }]}>
        <TouchableOpacity onPress={handleSwipeLeft} style={styles.navButton}>
          <MaterialIcons name="chevron-left" size={32} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.weekInfo}>
          <Text style={styles.weekText}>
            Week {currentWeek}{currentRound > 1 ? ` - Round ${currentRound}` : ''}
          </Text>
          <Text style={styles.dateText}>{dateRange}</Text>
        </View>

        <TouchableOpacity onPress={handleSwipeRight} style={styles.navButton}>
          <MaterialIcons name="chevron-right" size={32} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Score Entry Grid */}
      <ScrollView style={styles.scrollView}>
        {activePlayers.map((player) => {
          const playerScore = weekScores[player.id]?.score || 0;
          const hasScore = playerScore > 0;
          const scoreColor = hasScore ? getScoreColor(playerScore) : theme.colors.surface;
          const isDouble = doubleRounds[player.id] || false;

          return (
            <View key={player.id} style={styles.playerCard}>
              {/* Player Name and Double Round Toggle */}
              <View style={styles.cardHeader}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => handleScoreChange(player.id, '0')}
                >
                  <MaterialIcons name="refresh" size={14} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.playerName}>{player.name}</Text>
                <TouchableOpacity
                  style={[styles.toggleSmall, isDouble && styles.toggleSmallActive]}
                  onPress={() => toggleDoubleRound(player.id)}
                >
                  <Text style={styles.toggleSmallText}>x2</Text>
                </TouchableOpacity>
              </View>

              {/* Score Input Row */}
              <View style={styles.scoreRow}>
                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => incrementScore(player.id, -10)}
                >
                  <Text style={styles.buttonText}>-10</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => incrementScore(player.id, -5)}
                >
                  <Text style={styles.buttonText}>-5</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => incrementScore(player.id, -1)}
                >
                  <Text style={styles.buttonText}>-1</Text>
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.scoreInput,
                    hasScore && { color: scoreColor, borderColor: scoreColor },
                  ]}
                  value={playerScore > 0 ? playerScore.toString() : ''}
                  onChangeText={(value) => handleScoreChange(player.id, value)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textSecondary}
                />

                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => incrementScore(player.id, 1)}
                >
                  <Text style={styles.buttonText}>+1</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => incrementScore(player.id, 5)}
                >
                  <Text style={styles.buttonText}>+5</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => incrementScore(player.id, 10)}
                >
                  <Text style={styles.buttonText}>+10</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Submit/Update Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          isPastWeek && { backgroundColor: theme.colors.weekPast },
          isFutureWeek && { backgroundColor: theme.colors.weekFuture },
        ]}
        onPress={isPastWeek ? handleUpdate : handleSubmit}
      >
        <Text style={styles.submitButtonText}>
          {isPastWeek ? 'Update' : 'Submit'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.sm,
  },
  navButton: {
    padding: theme.spacing.sm,
  },
  weekInfo: {
    alignItems: 'center',
  },
  headerButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  headerButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonSpaced: {
    marginLeft: theme.spacing.sm,
  },
  headerButtonText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  weekText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  playerCard: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    position: 'relative',
  },
  playerName: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  resetButton: {
    position: 'absolute',
    left: 0,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSmall: {
    position: 'absolute',
    right: 0,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 28,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleSmallActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary,
  },
  toggleSmallText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  buttonSmall: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    minWidth: 38,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
  },
  scoreInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 4,
    paddingHorizontal: theme.spacing.xs,
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    textAlign: 'center',
    color: theme.colors.text,
    minHeight: 32,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
});
