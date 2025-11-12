import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { AppContext } from '../contexts/AppContext';
import { theme, getScoreColor, getContrastTextColor } from '../utils/theme';

const Tab = createMaterialTopTabNavigator();

// Custom Dropdown Component
const CustomDropdown = ({ value, options, onValueChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = React.useRef(null);
  const [dropdownLayout, setDropdownLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const handleOpen = () => {
    if (buttonRef.current) {
      buttonRef.current.measureInWindow((x, y, width, height) => {
        setDropdownLayout({ x, y, width, height });
        setIsOpen(true);
      });
    }
  };

  return (
    <View style={styles.pickerWrapper}>
      <TouchableOpacity
        ref={buttonRef}
        style={styles.dropdownButton}
        onPress={handleOpen}
      >
        <Text style={styles.dropdownButtonText}>
          {value ? options.find(o => o.value === value)?.label : placeholder}
        </Text>
        <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View
            style={[
              styles.dropdownMenu,
              {
                position: 'absolute',
                top: dropdownLayout.y + dropdownLayout.height,
                left: dropdownLayout.x,
                width: dropdownLayout.width,
              }
            ]}
          >
            <ScrollView style={styles.dropdownScrollView}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownItem,
                    value === option.value && styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    onValueChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === option.value && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// All Scores Tab Component
function AllScoresTab({ currentHistoricalSeason, fallbackPlayers }) {
  // Calculate player statistics for historical season
  const playerStats = useMemo(() => {
    if (!currentHistoricalSeason) return [];

    const scores = currentHistoricalSeason.scores || {};
    // Use season players if available, otherwise fallback to global players
    const allPlayers = currentHistoricalSeason.players && currentHistoricalSeason.players.length > 0
      ? currentHistoricalSeason.players
      : fallbackPlayers;

    const stats = allPlayers.map((player) => {
      const scoresByWeekKey = {};
      const playerScores = [];

      Object.keys(scores).forEach((weekKey) => {
        const weekData = scores[weekKey];
        if (weekData[player.id]) {
          scoresByWeekKey[weekKey] = weekData[player.id];
          const scoreData = weekData[player.id];
          // Use actual score (half if double) for average calculation
          const actualScore = scoreData.isDouble ? scoreData.score / 2 : scoreData.score;
          playerScores.push({
            score: scoreData.score,
            actualScore: actualScore,
            isDouble: scoreData.isDouble || false,
          });
        }
      });

      const average = playerScores.length > 0
        ? (playerScores.reduce((sum, s) => sum + s.actualScore, 0) / playerScores.length).toFixed(1)
        : '-';

      return {
        player,
        scoresByWeekKey,
        average,
        averageNum: playerScores.length > 0 ? parseFloat(average) : 0,
      };
    });

    return stats
      .filter((s) => Object.keys(s.scoresByWeekKey).length > 0)
      .sort((a, b) => b.averageNum - a.averageNum);
  }, [currentHistoricalSeason, fallbackPlayers]);

  const weekKeysWithScores = useMemo(() => {
    if (!currentHistoricalSeason) return [];

    const scores = currentHistoricalSeason.scores || {};
    const keys = Object.keys(scores).filter((weekKey) => {
      const weekData = scores[weekKey];
      return Object.keys(weekData).length > 0;
    });

    return keys.sort((a, b) => {
      const aParts = a.split('_');
      const bParts = b.split('_');
      const aWeek = parseInt(aParts[1]);
      const bWeek = parseInt(bParts[1]);

      if (aWeek !== bWeek) return aWeek - bWeek;

      const aRound = aParts[2] ? parseInt(aParts[2]) : 1;
      const bRound = bParts[2] ? parseInt(bParts[2]) : 1;
      return aRound - bRound;
    });
  }, [currentHistoricalSeason]);

  if (!currentHistoricalSeason) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data for selected season</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const numColumns = playerStats.length + 1;
  const tableMargins = 16; // 8px on each side
  const columnWidth = (screenWidth - tableMargins) / numColumns;

  return (
    <View style={styles.tabContainer}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.tableContainer}>
          <View style={styles.tableRow}>
            <View style={[styles.cell, styles.headerCell, { width: columnWidth, height: columnWidth }]}>
              <Text style={styles.headerText}>W</Text>
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

          <View style={[styles.tableRow, styles.averageRow]}>
            <View style={[styles.cell, styles.averageCell, { width: columnWidth, height: columnWidth }]}>
              <Text style={styles.averageText}>Avg</Text>
            </View>
            {playerStats.map(({ player, average }) => (
              <View
                key={player.id}
                style={[styles.cell, styles.averageCell, { width: columnWidth, height: columnWidth }]}
              >
                <Text style={styles.averageText}>
                  {average}
                </Text>
              </View>
            ))}
          </View>

          {weekKeysWithScores.map((weekKey, index) => {
            const parts = weekKey.split('_');
            const weekNum = parseInt(parts[1]);
            const roundNum = parts[2] ? parseInt(parts[2]) : 1;
            const displayWeek = roundNum === 1 ? weekNum.toString() : `${weekNum}.${roundNum}`;

            return (
              <View key={weekKey} style={[styles.tableRow, index % 2 === 1 && styles.alternatingRow]}>
                <View style={[styles.cell, { width: columnWidth, height: columnWidth }]}>
                  <Text style={styles.cellText}>{displayWeek}</Text>
                </View>
                {playerStats.map(({ player, scoresByWeekKey }) => {
                  const weekScore = scoresByWeekKey[weekKey];
                  const score = weekScore?.score;
                  const isDouble = weekScore?.isDouble;
                  // Display actual score (half if double)
                  const displayScore = score ? (isDouble ? score / 2 : score) : null;
                  const textColor = displayScore ? getScoreColor(displayScore) : theme.colors.textSecondary;

                  return (
                    <View
                      key={player.id}
                      style={[styles.cell, { width: columnWidth, height: columnWidth }]}
                    >
                      {displayScore ? (
                        <View style={styles.scoreBox}>
                          <Text style={[styles.cellText, { color: textColor }]}>
                            {displayScore}
                            {isDouble && 'ᴰ'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={[styles.cellText, { color: textColor }]}>-</Text>
                      )}
                    </View>
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

// Leaderboard Tab Component
function LeaderboardTab({ currentHistoricalSeason, fallbackPlayers }) {
  const leaderboardData = useMemo(() => {
    if (!currentHistoricalSeason) return [];

    // If pre-calculated leaderboard exists, use it
    if (currentHistoricalSeason.preCalculatedLeaderboard) {
      return currentHistoricalSeason.preCalculatedLeaderboard.map(item => ({
        player: {
          id: item.playerId,
          name: item.name,
        },
        roundsPlayed: item.roundsPlayed,
        top8Average: item.average,
        top8AverageNum: parseFloat(item.average),
      }));
    }

    const scores = currentHistoricalSeason.scores || {};
    // Use season players if available, otherwise fallback to global players
    const allPlayers = currentHistoricalSeason.players && currentHistoricalSeason.players.length > 0
      ? currentHistoricalSeason.players
      : fallbackPlayers;
    const countRounds = currentHistoricalSeason.countRounds || 8;

    const stats = allPlayers.map((player) => {
      const playerScores = [];

      Object.keys(scores).forEach((weekKey) => {
        const weekData = scores[weekKey];
        if (weekData[player.id]) {
          const scoreData = weekData[player.id];
          // Use actual score (half if double) for average calculation
          const actualScore = scoreData.isDouble ? scoreData.score / 2 : scoreData.score;
          playerScores.push({
            score: scoreData.score,
            actualScore: actualScore,
            isDouble: scoreData.isDouble || false,
          });
        }
      });

      // Calculate top N scores based on countRounds using actual scores
      const sortedScores = [...playerScores].sort((a, b) => b.actualScore - a.actualScore);
      const topScores = sortedScores.slice(0, countRounds);
      const topAverage = topScores.length > 0
        ? (topScores.reduce((sum, s) => sum + s.actualScore, 0) / topScores.length).toFixed(2)
        : '-';

      return {
        player,
        roundsPlayed: playerScores.length,
        top8Average: topAverage,
        top8AverageNum: topScores.length > 0 ? parseFloat(topAverage) : 0,
      };
    });

    return stats
      .filter((s) => s.roundsPlayed > 0)
      .sort((a, b) => b.top8AverageNum - a.top8AverageNum);
  }, [currentHistoricalSeason, fallbackPlayers]);

  if (!currentHistoricalSeason) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data for selected season</Text>
      </View>
    );
  }

  return (
    <View style={styles.tabContainer}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.leaderboardContainer}>
        {/* Header Row */}
        <View style={styles.leaderboardHeader}>
          <View style={styles.leaderboardRankCell}>
            <Text style={styles.leaderboardHeaderText}>Rank</Text>
          </View>
          <View style={styles.leaderboardPlayerCell}>
            <Text style={styles.leaderboardHeaderText}>Player</Text>
          </View>
          <View style={styles.leaderboardRoundsCell}>
            <Text style={styles.leaderboardHeaderText}>Rounds</Text>
          </View>
          <View style={styles.leaderboardAvgCell}>
            <Text style={styles.leaderboardHeaderText}>Avg</Text>
          </View>
        </View>

        {/* Leaderboard Rows */}
        {leaderboardData.map((item, index) => (
          <View key={item.player.id} style={[styles.leaderboardRow, index % 2 === 1 && styles.alternatingRow]}>
            <View style={styles.leaderboardRankCell}>
              <Text style={styles.leaderboardRankText}>{index + 1}</Text>
            </View>
            <View style={styles.leaderboardPlayerCell}>
              <Text style={styles.leaderboardPlayerText}>{item.player.name}</Text>
            </View>
            <View style={styles.leaderboardRoundsCell}>
              <Text style={styles.leaderboardText}>{item.roundsPlayed}</Text>
            </View>
            <View style={styles.leaderboardAvgCell}>
              <Text style={[styles.leaderboardText, styles.leaderboardAvgText]}>
                {item.top8Average}
              </Text>
            </View>
          </View>
        ))}
        </View>
      </ScrollView>
    </View>
  );
}

export default function HistoricalScoresScreen({ navigation }) {
  const { historicalSeasons, setHistoricalSeasons, players } = useContext(AppContext);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get available years as options
  const yearOptions = useMemo(() => {
    const years = new Set();
    historicalSeasons.forEach((season) => {
      years.add(season.year);
    });
    return Array.from(years)
      .sort((a, b) => b - a)
      .map(year => ({ label: year.toString(), value: year.toString() }));
  }, [historicalSeasons]);

  // Get available seasons for selected year as options
  const seasonOptions = useMemo(() => {
    if (!selectedYear) return [];
    const seasons = historicalSeasons
      .filter((s) => s.year === parseInt(selectedYear))
      .map((s) => s.season)
      .sort((a, b) => a - b);
    return seasons.map(season => ({ label: `Season ${season}`, value: season.toString() }));
  }, [selectedYear, historicalSeasons]);

  // Set initial selection to most recent (latest by year and season)
  useEffect(() => {
    if (historicalSeasons.length > 0 && !selectedYear) {
      const mostRecent = [...historicalSeasons].sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.season - a.season;
      })[0];
      setSelectedYear(mostRecent.year.toString());
      setSelectedSeason(mostRecent.season.toString());
    }
  }, [historicalSeasons]);

  // Update selected season when year changes
  useEffect(() => {
    if (selectedYear && seasonOptions.length > 0) {
      const seasonValues = seasonOptions.map(s => s.value);
      if (!seasonValues.includes(selectedSeason)) {
        setSelectedSeason(seasonOptions[0].value);
      }
    }
  }, [selectedYear, seasonOptions]);

  // Get selected season data
  const currentHistoricalSeason = useMemo(() => {
    if (!selectedYear || !selectedSeason) return null;
    return historicalSeasons.find(
      (s) => s.year === parseInt(selectedYear) && s.season === parseInt(selectedSeason)
    );
  }, [selectedYear, selectedSeason, historicalSeasons]);

  const handleDeleteSeason = () => {
    if (!selectedYear || !selectedSeason) return;

    const updatedSeasons = historicalSeasons.filter(
      (s) => !(s.year === parseInt(selectedYear) && s.season === parseInt(selectedSeason))
    );
    setHistoricalSeasons(updatedSeasons);
    setShowDeleteConfirm(false);

    // Reset selection
    setSelectedYear('');
    setSelectedSeason('');
  };

  // Set up header button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        currentHistoricalSeason ? (
          <TouchableOpacity
            style={styles.headerDeleteButton}
            onPress={() => setShowDeleteConfirm(true)}
          >
            <MaterialIcons name="delete" size={24} color={theme.colors.accent} />
          </TouchableOpacity>
        ) : null
      ),
    });
  }, [navigation, currentHistoricalSeason]);

  if (historicalSeasons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No historical data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Selection Dropdowns */}
      <View style={styles.selectorsContainer}>
        <CustomDropdown
          value={selectedYear}
          options={yearOptions}
          onValueChange={setSelectedYear}
          placeholder="Select Year"
        />
        <CustomDropdown
          value={selectedSeason}
          options={seasonOptions}
          onValueChange={setSelectedSeason}
          placeholder="Select Season"
        />
      </View>

      {/* Tabs */}
      {currentHistoricalSeason ? (
        <Tab.Navigator
          screenOptions={{
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarIndicatorStyle: {
              backgroundColor: theme.colors.primary,
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: 'bold',
            },
            sceneContainerStyle: {
              backgroundColor: theme.colors.background,
            },
          }}
        >
          <Tab.Screen name="ALL SCORES">
            {() => <AllScoresTab currentHistoricalSeason={currentHistoricalSeason} fallbackPlayers={players} />}
          </Tab.Screen>
          <Tab.Screen name="LEADERBOARD">
            {() => <LeaderboardTab currentHistoricalSeason={currentHistoricalSeason} fallbackPlayers={players} />}
          </Tab.Screen>
        </Tab.Navigator>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No data for selected season</Text>
        </View>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteConfirm(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Delete Season</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to delete {selectedYear} - Season {selectedSeason}?
            </Text>
            <Text style={styles.modalWarning}>This action cannot be undone.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteSeason}
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
  tabContainer: {
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
  selectorsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  pickerWrapper: {
    flex: 1,
  },
  headerDeleteButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  dropdownButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  dropdownButtonText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  dropdownOverlay: {
    flex: 1,
  },
  dropdownMenu: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: theme.colors.primary + '20',
  },
  dropdownItemText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.md,
  },
  dropdownItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: 'bold',
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
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
  averageRow: {
  },
  averageCell: {
    backgroundColor: theme.colors.surface,
  },
  averageText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
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
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  modalWarning: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.accent,
    marginBottom: theme.spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  modalButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalButtonDelete: {
    backgroundColor: theme.colors.accent,
  },
  modalButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
  },
  leaderboardContainer: {
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  leaderboardRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.border,
  },
  leaderboardRankCell: {
    width: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardPlayerCell: {
    flex: 1,
    justifyContent: 'center',
  },
  leaderboardRoundsCell: {
    width: 55,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardAvgCell: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardHeaderText: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  leaderboardRankText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  leaderboardPlayerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  leaderboardText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  leaderboardAvgText: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
});
