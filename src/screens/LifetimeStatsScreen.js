import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AppContext } from '../contexts/AppContext';
import { theme } from '../utils/theme';
import { calculateTop8Scores, calculateAverage, calculateLifetimeAverage, calculateLifetimeStandardDeviation } from '../utils/helpers';

export default function LifetimeStatsScreen() {
  const { currentSeason, players, scores, historicalSeasons } = useContext(AppContext);

  // Calculate lifetime stats for each active player
  const lifetimeStats = useMemo(() => {
    if (!players || players.length === 0) return [];

    const activePlayers = players.filter((p) => p.active);

    return activePlayers.map((player) => {
      let wins = 0;
      let secondPlaces = 0;
      const allScores = [];

      // Process historical seasons - use preCalculatedLeaderboard for wins/2nd places
      historicalSeasons.forEach((season) => {
        // Collect scores for this player in this season
        Object.values(season.scores || {}).forEach((weekScores) => {
          if (weekScores[player.id]) {
            const scoreData = weekScores[player.id];
            allScores.push({
              score: scoreData.score,
              isDouble: scoreData.isDouble || false,
            });
          }
        });

        // Use preCalculatedLeaderboard to determine wins and 2nd places
        if (season.preCalculatedLeaderboard && season.preCalculatedLeaderboard.length > 0) {
          // Winner is the first entry in preCalculatedLeaderboard
          const winner = season.preCalculatedLeaderboard[0];
          if (winner && winner.playerId === player.id) {
            wins++;
          }

          // 2nd place: must be at index 1, not tied with 1st, and not tied with 3rd
          if (season.preCalculatedLeaderboard.length >= 2) {
            const secondPlace = season.preCalculatedLeaderboard[1];
            if (secondPlace && secondPlace.playerId === player.id) {
              // Check not tied with 1st place
              const notTiedWith1st = secondPlace.average !== winner.average;

              // Check not tied with 3rd place (if exists)
              let notTiedWith3rd = true;
              if (season.preCalculatedLeaderboard.length >= 3) {
                const thirdPlace = season.preCalculatedLeaderboard[2];
                notTiedWith3rd = secondPlace.average !== thirdPlace.average;
              }

              if (notTiedWith1st && notTiedWith3rd) {
                secondPlaces++;
              }
            }
          }
        }
      });

      // Process current season scores
      if (currentSeason) {
        Object.values(scores).forEach((weekScores) => {
          if (weekScores[player.id]) {
            const scoreData = weekScores[player.id];
            allScores.push({
              score: scoreData.score,
              isDouble: scoreData.isDouble || false,
            });
          }
        });
      }

      // Calculate lifetime statistics using original scores (not doubled)
      const lifetimeAverage = allScores.length > 0 ? calculateLifetimeAverage(allScores) : '-';
      const lifetimeStdDev = allScores.length > 0 ? calculateLifetimeStandardDeviation(allScores) : '-';
      // For best round, always use original score (not doubled value)
      const bestScore = allScores.length > 0
        ? Math.max(...allScores.map(s => s.score))
        : 0;

      return {
        player,
        wins,
        secondPlaces,
        lifetimeAverage,
        lifetimeStdDev,
        bestScore,
        totalRounds: allScores.length,
      };
    });
  }, [players, scores, currentSeason, historicalSeasons]);

  if (!currentSeason) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No active season</Text>
      </View>
    );
  }

  if (lifetimeStats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No players added</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.captureContainer}>
          <View style={styles.captureHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.trophyText}>📊</Text>
              <Text style={styles.captureTitle}>LIFETIME STATS</Text>
            </View>
            <Text style={styles.captureSubtitle}>
              All Seasons Career Statistics
            </Text>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.nameCol}>
              <Text style={styles.headerText}>Player</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>Wins</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>2nd</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>Rounds</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>Avg</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>SD</Text>
            </View>
            <View style={styles.numberCol}>
              <Text style={styles.headerText}>Best</Text>
            </View>
          </View>

          {/* Table Rows */}
          {lifetimeStats.map(({ player, wins, secondPlaces, totalRounds, lifetimeAverage, lifetimeStdDev, bestScore }) => (
            <View key={player.id} style={styles.tableRow}>
              <View style={styles.nameCol}>
                <Text style={styles.cellText}>{player.name}</Text>
              </View>
              <View style={styles.numberCol}>
                <Text style={styles.cellText}>{wins}</Text>
              </View>
              <View style={styles.numberCol}>
                <Text style={styles.cellText}>{secondPlaces}</Text>
              </View>
              <View style={styles.numberCol}>
                <Text style={styles.cellText}>{totalRounds}</Text>
              </View>
              <View style={styles.numberCol}>
                <Text style={styles.cellText}>{lifetimeAverage}</Text>
              </View>
              <View style={styles.numberCol}>
                <Text style={styles.cellText}>{lifetimeStdDev}</Text>
              </View>
              <View style={styles.numberCol}>
                <Text style={styles.cellText}>{bestScore > 0 ? bestScore : '-'}</Text>
              </View>
            </View>
          ))}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  trophyText: {
    fontSize: 18,
    marginRight: 8,
  },
  captureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  captureSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
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
  headerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cellText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  nameCol: {
    width: '30%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  numberCol: {
    width: '11.67%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
