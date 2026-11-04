import React, { useContext, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { AppContext } from '../contexts/AppContext';
import { theme } from '../utils/theme';
import { calculateTop8Scores, calculateAverage, calculateTotal, getSeasonScores, getBestRoundHolder, computeLifetimeStatsFromHistory, compareStandings } from '../utils/helpers';

// Format start date as "9 June"
const formatStartDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  return `${day} ${month}`;
};

export default function LeaderboardScreen({ navigation }) {
  const { currentSeason, players, scores, historicalSeasons } = useContext(AppContext);
  const leaderboardRef = useRef();

  const previousWins = useMemo(() => {
    const wins = {};
    Object.entries(computeLifetimeStatsFromHistory(historicalSeasons)).forEach(([pid, s]) => {
      if (s.wins > 0) wins[pid] = s.wins;
    });
    return wins;
  }, [historicalSeasons]);

  const leaderboardData = useMemo(() => {
    if (!players || players.length === 0) return [];

    const activePlayers = players.filter((p) => p.active);

    // Filter scores to only include current season
    const seasonScores = getSeasonScores(scores, currentSeason);

    const playerStats = activePlayers.map((player) => {
      // Get all scores for this player in the current season
      const playerScores = [];
      Object.keys(seasonScores).forEach((weekKey) => {
        const weekData = seasonScores[weekKey];
        if (weekData[player.id] && weekData[player.id].score > 0) {
          playerScores.push({
            week: weekKey,
            score: weekData[player.id].score,
            isDouble: weekData[player.id].isDouble || false,
          });
        }
      });

      // Calculate top 8
      const top8 = calculateTop8Scores(playerScores);
      const roundsPlayed = playerScores.length;
      const qualified = roundsPlayed >= 8;

      // Calculate best round (original score, not doubled)
      const bestRound = playerScores.length > 0
        ? Math.max(...playerScores.map(s => s.score))
        : 0;

      const average = qualified ? parseFloat(calculateAverage(top8)) : 0;
      const total = qualified ? calculateTotal(top8) : 0;

      // For unqualified players, calculate current average for sorting
      const currentAverage = playerScores.length > 0
        ? parseFloat(calculateAverage(playerScores))
        : 0;

      // Season average over all rounds at actual score, used to break a tie for 1st
      const overallAverage = playerScores.length > 0
        ? playerScores.reduce((sum, s) => sum + s.score, 0) / playerScores.length
        : 0;

      return {
        player,
        roundsPlayed,
        qualified,
        average,
        total,
        bestRound,
        currentAverage,
        overallAverage,
      };
    });

    // Separate qualified and unqualified
    const qualified = playerStats.filter((p) => p.qualified);
    const unqualified = playerStats.filter((p) => !p.qualified);

    qualified.sort((a, b) => compareStandings(
      { top8Avg: a.average, overallAvg: a.overallAverage },
      { top8Avg: b.average, overallAvg: b.overallAverage },
    ));

    // Sort unqualified by currentAverage
    unqualified.sort((a, b) => b.currentAverage - a.currentAverage);

    // Assign ranks with tie handling
    let rank = 1;
    for (let i = 0; i < qualified.length; i++) {
      if (i > 0) {
        const prev = qualified[i - 1];
        const current = qualified[i];

        // Ties for 1st and 2nd are broken by overall average; lower positions tie on the top-8 average alone
        const tiebreakSettled = prev.rank <= 2 && current.overallAverage !== prev.overallAverage;
        if (current.average === prev.average && !tiebreakSettled) {
          qualified[i].rank = prev.rank;
          qualified[i].isTied = true;
          qualified[i - 1].isTied = true;
        } else {
          rank = i + 1;
          qualified[i].rank = rank;
        }
      } else {
        qualified[0].rank = 1;
      }
    }

    return [...qualified, ...unqualified];
  }, [players, scores, currentSeason]);

  // Find best round holder chronologically
  const bestRoundHolder = useMemo(() => {
    const seasonScores = getSeasonScores(scores, currentSeason);
    const holder = getBestRoundHolder(seasonScores);

    if (!holder) return null;

    // Find the player data from leaderboardData
    const playerData = leaderboardData.find(p => p.player.id === holder.playerId);
    return playerData || null;
  }, [scores, currentSeason, leaderboardData]);

  // Calculate max icons for any single row
  const maxIconsInRow = useMemo(() => {
    if (leaderboardData.length === 0) return 0;

    let max = 0;
    leaderboardData.forEach((item) => {
      let count = 0;
      const isBestRound = bestRoundHolder && item.player.id === bestRoundHolder.player.id;
      const isQualified = item.qualified;

      if (item.rank === 1 && isQualified) count++;
      if (item.rank === 2 && isQualified && !item.isTied) count++;
      if (isBestRound) count++;

      if (count > max) max = count;
    });

    return max;
  }, [leaderboardData, bestRoundHolder]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => Platform.OS === 'web' ? null : (
        <TouchableOpacity
          style={styles.headerShareButton}
          onPress={handleShare}
        >
          <MaterialIcons name="share" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  if (!currentSeason) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="emoji-events" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No active season</Text>
        <Text style={styles.emptySubText}>
          Go to Management to start a new season
        </Text>
      </View>
    );
  }

  if (leaderboardData.length === 0) {
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

  async function handleShare() {
    if (!currentSeason) {
      Alert.alert('Error', 'No active season to share');
      return;
    }

    try {
      // Capture the leaderboard as an image
      const uri = await captureRef(leaderboardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Share the image
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Leaderboard',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share leaderboard');
      console.error(error);
    }
  }

  const iconColWidth = maxIconsInRow === 0 ? '0%' : maxIconsInRow === 1 ? '8%' : '14%';
  const nameColWidth = maxIconsInRow === 0 ? '32%' : maxIconsInRow === 1 ? '30%' : '24%';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.captureContainer} ref={leaderboardRef} collapsable={false}>
          <View style={styles.captureHeader}>
            <View style={styles.headerTable}>
              <View style={styles.headerCell1}>
                <Text style={styles.yearLabelText}>Year</Text>
                <Text style={styles.yearText}>{currentSeason?.year}</Text>
              </View>
              <View style={styles.headerCell2}>
                <Image
                  source={require('../../assets/sundowner.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.headerCell3}>
                <Text style={styles.seasonText}>Season {currentSeason?.season}</Text>
                <Text style={styles.startDateText}>{formatStartDate(currentSeason?.startDate)}</Text>
              </View>
            </View>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.rankCol}>
              <Text style={styles.headerText}>Rank</Text>
            </View>
            <View style={[styles.iconCol, { width: iconColWidth }]}>
            </View>
            <View style={[styles.nameCol, { width: nameColWidth }]}>
              <Text style={styles.headerText}>Player</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>Rounds</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>Total</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>Best</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>Avg</Text>
            </View>
          </View>

          {/* Table Rows */}
          {leaderboardData.map((item, index) => {
            const isBestRound = bestRoundHolder && item.player.id === bestRoundHolder.player.id;
            const isQualified = item.qualified;

            return (
              <View
                key={item.player.id}
                style={[
                  styles.tableRow,
                  !isQualified && !isBestRound && styles.unqualifiedRow,
                ]}
              >
                {/* Rank */}
                <View style={styles.rankCol}>
                  <Text style={[styles.cellText, !isQualified && styles.unqualifiedText]}>
                    {isQualified ? (item.isTied ? `T${item.rank}` : item.rank) : '-'}
                  </Text>
                </View>

                {/* Icons */}
                <View style={[styles.iconCol, { width: iconColWidth }]}>
                  <View style={styles.nameContainer}>
                    {item.rank === 1 && isQualified && (
                      <MaterialIcons
                        name="emoji-events"
                        size={18}
                        color={theme.colors.trophyGold}
                      />
                    )}
                    {item.rank === 2 && isQualified && !item.isTied && (
                      <MaterialIcons
                        name="emoji-events"
                        size={18}
                        color={theme.colors.trophySilver}
                      />
                    )}
                    {isBestRound && (
                      <MaterialIcons
                        name="sports-golf"
                        size={18}
                        color={theme.colors.trophyGold}
                      />
                    )}
                  </View>
                </View>

                {/* Name */}
                <View style={[styles.nameCol, { width: nameColWidth }]}>
                  <View style={styles.nameWithTrophies}>
                    <Text style={[styles.cellText, !isQualified && styles.unqualifiedText]}>
                      {item.player.name}
                    </Text>
                    {previousWins[item.player.id] > 0 && (
                      <View style={styles.trophySuperscript}>
                        <MaterialIcons
                          name="emoji-events"
                          size={10}
                          color={theme.colors.trophyGold}
                        />
                        <Text style={styles.trophyCount}>x{previousWins[item.player.id]}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Rounds Played */}
                <View style={styles.numberCol}>
                  <Text style={[styles.cellText, !isQualified && styles.unqualifiedText]}>
                    {item.roundsPlayed}
                  </Text>
                </View>

                {/* Total */}
                <View style={styles.numberCol}>
                  <Text style={[styles.cellText, !isQualified && styles.unqualifiedText]}>
                    {isQualified ? item.total : '-'}
                  </Text>
                </View>

                {/* Best Round */}
                <View style={styles.numberCol}>
                  <View style={[
                    styles.bestRoundContainer,
                    isBestRound && styles.bestRoundHighlight,
                  ]}>
                    <Text style={[
                      styles.cellText,
                      isBestRound && styles.bestRoundText,
                    ]}>
                      {item.bestRound > 0 ? item.bestRound : '-'}
                    </Text>
                  </View>
                </View>

                {/* Average */}
                <View style={styles.numberCol}>
                  <Text style={[styles.cellText, !isQualified && styles.unqualifiedText]}>
                    {isQualified ? item.average.toFixed(2) : '-'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  captureContainer: {
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  captureHeader: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  headerTable: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 60,
    paddingHorizontal: 0,
  },
  headerCell1: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: 60,
    paddingLeft: 4,
  },
  headerCell2: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
  },
  headerCell3: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 60,
    paddingRight: 4,
  },
  yearLabelText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  yearText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  seasonText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  startDateText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
  },
  logoImage: {
    width: '100%',
    maxWidth: 360,
    height: 60,
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  unqualifiedRow: {
    opacity: 0.5,
  },
  headerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cellText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  unqualifiedText: {
    color: '#FFFFFF',
    opacity: 0.5,
  },
  rankCol: {
    width: '10%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameCol: {
    width: '24%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  nameWithTrophies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trophySuperscript: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
    marginTop: -2,
  },
  trophyCount: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.trophyGold,
    marginRight: 1,
    lineHeight: 10,
  },
  iconCol: {
    width: '14%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  numberCol: {
    width: '13%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  bestRoundContainer: {
    padding: theme.spacing.xs,
  },
  bestRoundHighlight: {
    borderWidth: 2,
    borderColor: theme.colors.trophyGold,
    backgroundColor: 'transparent',
    borderRadius: 4,
  },
  bestRoundText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerShareButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
});
