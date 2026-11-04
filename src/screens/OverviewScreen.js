import React, { useContext, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { AppContext } from '../contexts/AppContext';
import { theme, getScoreColor } from '../utils/theme';
import { calculateTop8Scores, calculateAverage, calculateStandardDeviation, getSeasonScores, getBestRoundHolder } from '../utils/helpers';

const Tab = createMaterialTopTabNavigator();

// ─── Counting Rounds Tab ──────────────────────────────────────────────────────

function CountingRoundsTab({ countingRoundsRef, playerStats, columnWidth, overallBestRound, bestRoundHolderInfo }) {
  return (
    <View style={styles.tabContentContainer}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.tableContainer} ref={countingRoundsRef} collapsable={false}>
          <View style={styles.tableRow}>
            <View style={[styles.cell, styles.headerCell, { width: columnWidth, height: columnWidth }]}>
              <Text style={styles.headerText}>Rd</Text>
            </View>
            {playerStats.map(({ player }) => (
              <View
                key={player.id}
                style={[styles.cell, styles.headerCell, { width: columnWidth, height: columnWidth }]}
              >
                <Text style={styles.headerText} numberOfLines={1}>
                  {player.shortName}
                </Text>
              </View>
            ))}
          </View>

          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <View key={`rank-${index}`} style={[styles.tableRow, index % 2 === 1 && styles.alternatingRow]}>
              <View style={[styles.cell, { width: columnWidth, height: columnWidth }]}>
                <Text style={styles.cellText}>{index + 1}</Text>
              </View>
              {playerStats.map(({ player, top8 }) => {
                const score = top8[index];
                const displayScore = score
                  ? (score.isDouble ? score.score * 2 : score.score)
                  : null;
                const textColor = displayScore ? getScoreColor(score.score) : theme.colors.textSecondary;

                return (
                  <View
                    key={player.id}
                    style={[styles.cell, { width: columnWidth, height: columnWidth }]}
                  >
                    {displayScore ? (
                      <View style={styles.scoreBox}>
                        <Text style={[styles.cellText, { color: textColor }]}>
                          {displayScore}
                          {score?.isDouble && 'ᴰ'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.cellText, { color: textColor }]}>-</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          <View style={[styles.tableRow, styles.averageRow]}>
            <View style={[styles.cell, styles.averageCell, { width: columnWidth, height: columnWidth }]}>
              <Text style={styles.averageText}>Avg</Text>
            </View>
            {playerStats.map(({ player, top8Average }) => (
              <View
                key={player.id}
                style={[styles.cell, styles.averageCell, { width: columnWidth, height: columnWidth }]}
              >
                <Text style={styles.averageText}>{top8Average}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── All Rounds Tab ───────────────────────────────────────────────────────────

function AllRoundsTab({ playerStats, columnWidth, weekKeysWithScores, overallBestRound, bestRoundHolderInfo, handleScoreClick, handleWeekClick }) {
  return (
    <View style={styles.tabContentContainer}>
      <View style={styles.stickyHeader}>
        <View style={styles.tableRow}>
          <View style={[styles.cell, styles.headerCell, { width: columnWidth, height: columnWidth }]}>
            <Text style={styles.headerText}>Week</Text>
          </View>
          {playerStats.map(({ player }) => (
            <View
              key={player.id}
              style={[styles.cell, styles.headerCell, { width: columnWidth, height: columnWidth }]}
            >
              <Text style={styles.headerText} numberOfLines={1}>
                {player.shortName}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.tableContainer}>
          <View style={[styles.tableRow, styles.averageRow]}>
            <View style={[styles.cell, styles.averageCell, { width: columnWidth, height: columnWidth }]}>
              <Text style={styles.averageText}>Avg</Text>
            </View>
            {playerStats.map(({ player, allScoresAverage }) => (
              <View
                key={player.id}
                style={[styles.cell, styles.averageCell, { width: columnWidth, height: columnWidth }]}
              >
                <Text style={styles.averageText}>{allScoresAverage}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.tableRow, styles.stdDevRow]}>
            <View style={[styles.cell, styles.stdDevCell, { width: columnWidth, height: columnWidth }]}>
              <Text style={styles.stdDevText}>SD</Text>
            </View>
            {playerStats.map(({ player, allScoresStdDev }) => (
              <View
                key={player.id}
                style={[styles.cell, styles.stdDevCell, { width: columnWidth, height: columnWidth }]}
              >
                <Text style={styles.stdDevText}>{allScoresStdDev}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.tableRow, styles.numRoundsRow]}>
            <View style={[styles.cell, styles.numRoundsCell, { width: columnWidth, height: columnWidth }]}>
              <Text style={styles.numRoundsText}>#</Text>
            </View>
            {playerStats.map(({ player, numRounds }) => (
              <View
                key={player.id}
                style={[styles.cell, styles.numRoundsCell, { width: columnWidth, height: columnWidth }]}
              >
                <Text style={styles.numRoundsText}>{numRounds}</Text>
              </View>
            ))}
          </View>

          {weekKeysWithScores.map((weekKey, index) => {
            const parts = weekKey.split('_');
            const weekNum = parseInt(parts[2]);
            const roundNum = parts[3] ? parseInt(parts[3]) : null;
            const displayLabel = roundNum ? `${weekNum}.${roundNum}` : weekNum;

            return (
              <View key={weekKey} style={[styles.tableRow, index % 2 === 1 && styles.alternatingRow]}>
                <TouchableOpacity
                  style={[styles.cell, { width: columnWidth, height: columnWidth }]}
                  onPress={() => handleWeekClick(weekKey)}
                >
                  <Text style={styles.cellText}>{displayLabel}</Text>
                </TouchableOpacity>
                {playerStats.map(({ player, scoresByWeekKey, top8WeekKeys, bestRound }) => {
                  const weekScore = scoresByWeekKey[weekKey];
                  const score = weekScore?.score;
                  const isDouble = weekScore?.isDouble;
                  const displayScore = score ? (isDouble ? score * 2 : score) : null;
                  const isTop8 = top8WeekKeys.has(weekKey);
                  const isBestRound = bestRoundHolderInfo &&
                    player.id === bestRoundHolderInfo.playerId &&
                    weekKey === bestRoundHolderInfo.weekKey;
                  const textColor = displayScore ? getScoreColor(score) : theme.colors.textSecondary;

                  return (
                    <TouchableOpacity
                      key={player.id}
                      style={[styles.cell, { width: columnWidth, height: columnWidth }]}
                      onPress={() => score && handleScoreClick(weekKey, player.id, score)}
                    >
                      {displayScore ? (
                        <View style={[
                          styles.scoreBox,
                          isTop8 && !isBestRound && styles.top8Box,
                          isBestRound && styles.bestRoundBox,
                        ]}>
                          <Text style={[
                            styles.cellText,
                            { color: textColor },
                            (isTop8 || isBestRound) && { fontWeight: 'bold' },
                          ]}>
                            {displayScore}
                            {isDouble && 'ᴰ'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.cellText, { color: textColor }]}>-</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OverviewScreen({ navigation }) {
  const { currentSeason, players, scores, setScores, setNavigationTarget, readOnly } = useContext(AppContext);
  const countingRoundsRef = useRef();
  const [editingScore, setEditingScore] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [deletingWeek, setDeletingWeek] = useState(null);

  const activePlayers = players.filter((p) => p.active);

  // Season stats
  const playerStats = useMemo(() => {
    const seasonScores = getSeasonScores(scores, currentSeason);

    const stats = activePlayers.map((player) => {
      const playerScores = [];
      const scoresByWeekKey = {};

      Object.keys(seasonScores).forEach((weekKey) => {
        const weekData = seasonScores[weekKey];
        if (weekData[player.id] && weekData[player.id].score > 0) {
          const weekNum = parseInt(weekKey.split('_')[2]);
          playerScores.push({
            week: weekNum,
            score: weekData[player.id].score,
            isDouble: weekData[player.id].isDouble || false,
          });
          scoresByWeekKey[weekKey] = weekData[player.id];
        }
      });

      const top8 = calculateTop8Scores(playerScores);
      const top8WeekKeys = new Set();

      Object.keys(seasonScores).forEach((weekKey) => {
        const weekData = seasonScores[weekKey];
        if (weekData[player.id]) {
          const scoreData = weekData[player.id];
          const isInTop8 = top8.some(t =>
            t.score === scoreData.score && t.isDouble === scoreData.isDouble
          );
          if (isInTop8) top8WeekKeys.add(weekKey);
        }
      });

      const actualScores = playerScores.map(s => ({ score: s.score, isDouble: false }));

      const allScoresAverage = actualScores.length > 0 ? calculateAverage(actualScores) : '-';
      const allScoresStdDev = actualScores.length > 0 ? calculateStandardDeviation(actualScores) : '-';
      const top8Average = top8.length > 0 ? calculateAverage(top8) : '-';
      const bestRound = playerScores.length > 0 ? Math.max(...playerScores.map(s => s.score)) : 0;

      return {
        player,
        playerScores,
        scoresByWeekKey,
        top8,
        top8WeekKeys,
        allScoresAverage,
        allScoresStdDev,
        top8Average,
        allScoresAverageNum: actualScores.length > 0 ? parseFloat(calculateAverage(actualScores)) : 0,
        top8AverageNum: top8.length > 0 ? parseFloat(calculateAverage(top8)) : 0,
        bestRound,
        numRounds: playerScores.length,
      };
    });

    return stats.sort((a, b) => (b.top8AverageNum - a.top8AverageNum) || (b.allScoresAverageNum - a.allScoresAverageNum));
  }, [activePlayers, scores, currentSeason]);

  const handleShare = useCallback(async () => {
    if (!currentSeason) {
      Alert.alert('Error', 'No active season to share');
      return;
    }
    try {
      const uri = await captureRef(countingRoundsRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Season Stats',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share');
      console.error(error);
    }
  }, [currentSeason]);

  const bestRoundHolderInfo = useMemo(() => {
    const seasonScores = getSeasonScores(scores, currentSeason);
    return getBestRoundHolder(seasonScores);
  }, [scores, currentSeason]);

  const overallBestRound = bestRoundHolderInfo ? bestRoundHolderInfo.score : 0;

  const weekKeysWithScores = useMemo(() => {
    const seasonScores = getSeasonScores(scores, currentSeason);
    const keys = Object.keys(seasonScores).filter(weekKey =>
      Object.keys(seasonScores[weekKey]).length > 0
    );
    return keys.sort((a, b) => {
      const aParts = a.split('_');
      const bParts = b.split('_');
      const aWeek = parseInt(aParts[2]);
      const bWeek = parseInt(bParts[2]);
      if (aWeek !== bWeek) return aWeek - bWeek;
      const aRound = aParts[3] ? parseInt(aParts[3]) : 1;
      const bRound = bParts[3] ? parseInt(bParts[3]) : 1;
      return aRound - bRound;
    });
  }, [scores, currentSeason]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => Platform.OS === 'web' ? null : (
        <TouchableOpacity style={styles.headerShareButton} onPress={handleShare}>
          <MaterialIcons name="share" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, handleShare]);

  if (!currentSeason) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active season</Text>
      </View>
    );
  }

  if (activePlayers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No players added</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const numColumns = playerStats.length + 1;
  const tableMargins = theme.spacing.sm * 2;
  const columnWidth = (screenWidth - tableMargins) / numColumns;

  const handleScoreClick = (weekKey, playerId, currentScore) => {
    if (readOnly) return;
    setEditingScore({ weekKey, playerId, currentScore });
    setEditValue(currentScore?.toString() || '');
  };

  const handleSaveScore = () => {
    const newScore = parseInt(editValue);
    if (!isNaN(newScore) && newScore >= 0) {
      const updatedScores = { ...scores };
      if (!updatedScores[editingScore.weekKey]) updatedScores[editingScore.weekKey] = {};
      updatedScores[editingScore.weekKey][editingScore.playerId] = {
        ...updatedScores[editingScore.weekKey][editingScore.playerId],
        score: newScore,
      };
      setScores(updatedScores);
    }
    setEditingScore(null);
    setEditValue('');
  };

  const handleWeekClick = (weekKey) => {
    if (readOnly) return;
    const parts = weekKey.split('_');
    const weekNum = parseInt(parts[2]);
    const roundNum = parts[3] ? parseInt(parts[3]) : 1;
    setDeletingWeek({ weekKey, weekNum, roundNum });
  };

  const handleConfirmDelete = () => {
    if (deletingWeek) {
      const updatedScores = { ...scores };
      delete updatedScores[deletingWeek.weekKey];
      setScores(updatedScores);
      setDeletingWeek(null);
    }
  };

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: theme.colors.surface },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarIndicatorStyle: { backgroundColor: theme.colors.primary },
          tabBarLabelStyle: { fontSize: 11, fontWeight: 'bold' },
          sceneContainerStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Tab.Screen name="COUNTING ROUNDS">
          {() => (
            <CountingRoundsTab
              countingRoundsRef={countingRoundsRef}
              playerStats={playerStats}
              columnWidth={columnWidth}
              overallBestRound={overallBestRound}
              bestRoundHolderInfo={bestRoundHolderInfo}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="ALL ROUNDS">
          {() => (
            <AllRoundsTab
              playerStats={playerStats}
              columnWidth={columnWidth}
              weekKeysWithScores={weekKeysWithScores}
              overallBestRound={overallBestRound}
              bestRoundHolderInfo={bestRoundHolderInfo}
              handleScoreClick={handleScoreClick}
              handleWeekClick={handleWeekClick}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Edit Score Modal */}
      <Modal
        visible={editingScore !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditingScore(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditingScore(null)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Edit Score</Text>
            <Text style={styles.modalSubtitle}>
              {editingScore && players.find(p => p.id === editingScore.playerId)?.name}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              keyboardType="numeric"
              placeholder="Enter score"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setEditingScore(null)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveScore}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Delete Week Modal */}
      <Modal
        visible={deletingWeek !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeletingWeek(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDeletingWeek(null)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Delete Week</Text>
            <Text style={styles.modalSubtitle}>
              {deletingWeek && `Are you sure you want to delete week ${deletingWeek.weekNum}${deletingWeek.roundNum > 1 ? ` round ${deletingWeek.roundNum}` : ''}?`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setDeletingWeek(null)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.modalButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  },
  emptyText: {
    fontSize: theme.fontSize.xl,
    color: theme.colors.textSecondary,
  },

  // ── Season table (shared) ───────────────────────────────────────────────────
  tabContentContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerShareButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  stickyHeader: {
    backgroundColor: theme.colors.background,
    zIndex: 1,
    marginHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderTopLeftRadius: theme.borderRadius.md,
    borderTopRightRadius: theme.borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  tableContainer: {
    paddingTop: 0,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    marginHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tableRow: {
    flexDirection: 'row',
  },
  alternatingRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  cell: {
    padding: theme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  headerCell: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  headerText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  cellText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    textAlign: 'center',
  },
  scoreBox: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 20,
  },
  top8Box: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  bestRoundBox: {
    borderWidth: 1,
    borderColor: theme.colors.trophyGold,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  averageRow: {},
  averageCell: {
    backgroundColor: theme.colors.surface,
  },
  averageText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  stdDevRow: {},
  stdDevCell: {
    backgroundColor: theme.colors.surface,
  },
  stdDevText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  numRoundsRow: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  numRoundsCell: {
    backgroundColor: theme.colors.surface,
  },
  numRoundsText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },

  // ── Modals ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  modalSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.lg,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  modalButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalButtonSave: {
    backgroundColor: theme.colors.primary,
  },
  modalButtonDelete: {
    backgroundColor: '#D32F2F',
  },
  modalButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
});
