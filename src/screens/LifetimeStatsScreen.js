import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { AppContext } from '../contexts/AppContext';
import { theme } from '../utils/theme';
import { mergeLifetimeWithActiveSeasons } from '../utils/helpers';

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const stdDev = (arr) => {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length);
};

export default function LifetimeStatsScreen() {
  const { players, scores, activeSeasons, storedLifetimeStats } = useContext(AppContext);

  const lifetimeStats = useMemo(() => {
    const merged = mergeLifetimeWithActiveSeasons(storedLifetimeStats, scores, activeSeasons);

    return (players || [])
      .map((player) => {
        const s = merged[String(player.id)];
        const rounds = s ? s.scores : [];
        return {
          player,
          wins: s ? s.wins : 0,
          secondPlaces: s ? s.secondPlaces : 0,
          totalRounds: rounds.length,
          avgValue: rounds.length > 0 ? mean(rounds) : null,
          lifetimeAverage: rounds.length > 0 ? mean(rounds).toFixed(1) : '-',
          lifetimeStdDev: rounds.length > 0 ? stdDev(rounds).toFixed(1) : '-',
          bestScore: s ? s.bestScore : 0,
        };
      })
      .filter((row) => row.totalRounds > 0 || row.wins > 0 || row.secondPlaces > 0)
      .sort((a, b) =>
        b.wins - a.wins ||
        b.secondPlaces - a.secondPlaces ||
        (b.avgValue ?? -1) - (a.avgValue ?? -1)
      );
  }, [players, scores, activeSeasons, storedLifetimeStats]);

  if (lifetimeStats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No rounds recorded yet</Text>
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
