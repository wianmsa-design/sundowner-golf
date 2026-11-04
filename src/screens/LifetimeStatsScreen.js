import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AppContext } from '../contexts/AppContext';
import { theme } from '../utils/theme';
import { mergeLifetimeWithActiveSeasons } from '../utils/helpers';

const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const stdDev = (arr) => {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length);
};

// firstDir: direction on the first tap; SD starts low-to-high since lower means more consistent
const COLUMNS = [
  { key: 'name', label: 'Player', width: '24%', align: 'flex-start', firstDir: 'asc', value: (r) => r.player.name.toLowerCase() },
  { key: 'wins', label: 'Wins', width: '12%', firstDir: 'desc', value: (r) => r.wins },
  { key: 'second', label: '2nd', width: '11%', firstDir: 'desc', value: (r) => r.secondPlaces },
  { key: 'rounds', label: 'Rounds', width: '16%', firstDir: 'desc', value: (r) => r.totalRounds },
  { key: 'avg', label: 'Avg', width: '13%', firstDir: 'desc', value: (r) => r.avgValue },
  { key: 'sd', label: 'SD', width: '11%', firstDir: 'asc', value: (r) => r.sdValue },
  { key: 'best', label: 'Best', width: '13%', firstDir: 'desc', value: (r) => (r.bestScore > 0 ? r.bestScore : null) },
];
const colStyle = (column) => ({ width: column.width, justifyContent: 'center', alignItems: column.align || 'center' });
const COL = Object.fromEntries(COLUMNS.map((c) => [c.key, colStyle(c)]));

export default function LifetimeStatsScreen() {
  const { players, scores, activeSeasons, storedLifetimeStats } = useContext(AppContext);
  const [sort, setSort] = useState(null); // { key, dir }; null keeps the standings order

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
          sdValue: rounds.length > 0 ? stdDev(rounds) : null,
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

  const sortedStats = useMemo(() => {
    const column = sort && COLUMNS.find((c) => c.key === sort.key);
    if (!column) return lifetimeStats;
    const sign = sort.dir === 'asc' ? 1 : -1;
    // Stable sort, so ties keep the standings order; players with no value always go last
    return [...lifetimeStats].sort((a, b) => {
      const av = column.value(a);
      const bv = column.value(b);
      if (av == null || bv == null) return (av == null) - (bv == null);
      if (av < bv) return -sign;
      if (av > bv) return sign;
      return 0;
    });
  }, [lifetimeStats, sort]);

  const handleSortPress = (column) => {
    setSort((prev) =>
      prev && prev.key === column.key
        ? { key: column.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: column.key, dir: column.firstDir }
    );
  };

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
            <View style={styles.headerCenter}>
              <MaterialIcons name="insights" size={32} color={theme.colors.accent} />
              <Text style={styles.headerTitle}>Lifetime Stats</Text>
            </View>
          </View>

          {/* Table Header - tap a column to sort by it, tap again to reverse */}
          <View style={styles.tableHeader}>
            {COLUMNS.map((column) => {
              const active = sort && sort.key === column.key;
              return (
                <TouchableOpacity
                  key={column.key}
                  style={COL[column.key]}
                  onPress={() => handleSortPress(column)}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${column.label}`}
                >
                  {/* The arrow slot is always reserved so labels never shift when sorting changes */}
                  <View style={styles.headerLabelRow}>
                    {!column.align && <View style={styles.sortArrowBalance} />}
                    <Text style={[styles.headerText, active && styles.headerTextActive]} numberOfLines={1}>
                      {column.label}
                    </Text>
                    <Text style={[styles.sortArrow, !active && styles.sortArrowHidden]}>
                      {active && sort.dir === 'asc' ? '▲' : '▼'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Table Rows */}
          {sortedStats.map(({ player, wins, secondPlaces, totalRounds, lifetimeAverage, lifetimeStdDev, bestScore }) => (
            <View key={player.id} style={styles.tableRow}>
              <View style={COL.name}>
                <Text style={styles.cellText}>{player.name}</Text>
              </View>
              <View style={COL.wins}>
                <Text style={styles.cellText}>{wins}</Text>
              </View>
              <View style={COL.second}>
                <Text style={styles.cellText}>{secondPlaces}</Text>
              </View>
              <View style={COL.rounds}>
                <Text style={styles.cellText}>{totalRounds}</Text>
              </View>
              <View style={COL.avg}>
                <Text style={styles.cellText}>{lifetimeAverage}</Text>
              </View>
              <View style={COL.sd}>
                <Text style={styles.cellText}>{lifetimeStdDev}</Text>
              </View>
              <View style={COL.best}>
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
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  headerCenter: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
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
  headerTextActive: {
    color: theme.colors.primary,
  },
  cellText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  headerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortArrow: {
    width: 10,
    marginLeft: 2,
    fontSize: 8,
    color: theme.colors.primary,
  },
  sortArrowHidden: {
    opacity: 0,
  },
  sortArrowBalance: {
    width: 12,
  },
});
