import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { AppContext } from '../contexts/AppContext';
import { theme } from '../utils/theme';

export default function EntryFeesScreen() {
  const {
    currentSeason,
    players,
    entryFees,
    setEntryFees,
  } = useContext(AppContext);

  const handleTogglePayment = (playerId, currentStatus) => {
    if (!currentSeason) {
      Alert.alert('Error', 'No active season');
      return;
    }

    const seasonKey = `${currentSeason.year}-${currentSeason.season}`;
    const updatedFees = { ...entryFees };

    if (!updatedFees[seasonKey]) {
      updatedFees[seasonKey] = {};
    }

    updatedFees[seasonKey][playerId] = !currentStatus;
    setEntryFees(updatedFees);
  };

  const getPaymentStatus = (playerId) => {
    if (!currentSeason || !entryFees) return false;
    const seasonKey = `${currentSeason.year}-${currentSeason.season}`;
    return entryFees[seasonKey]?.[playerId] || false;
  };

  const activePlayers = players.filter((p) => p.active).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const paidCount = activePlayers.filter(p => getPaymentStatus(p.id)).length;
  const totalCount = activePlayers.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {currentSeason ? (
          <>
            <Text style={styles.seasonText}>
              {currentSeason.year} - Season {currentSeason.season}
            </Text>
            <Text style={styles.summaryText}>
              {paidCount} of {totalCount} paid
            </Text>
          </>
        ) : (
          <Text style={styles.emptyText}>No active season</Text>
        )}
      </View>

      <View style={styles.section}>
        {activePlayers.length === 0 ? (
          <Text style={styles.emptyText}>No players added yet</Text>
        ) : (
          activePlayers.map((player) => {
            const isPaid = getPaymentStatus(player.id);
            return (
              <View key={player.id} style={styles.playerRow}>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerShortName}>({player.shortName})</Text>
                </View>
                <View style={styles.paymentStatus}>
                  <View style={[styles.statusBox, isPaid ? styles.paidBox : styles.unpaidBox]}>
                    <Text style={[styles.statusLabel, isPaid ? styles.paidLabel : styles.unpaidLabel]}>
                      {isPaid ? 'Paid' : 'Unpaid'}
                    </Text>
                  </View>
                  <Switch
                    value={isPaid}
                    onValueChange={() => handleTogglePayment(player.id, isPaid)}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary
                    }}
                    thumbColor={isPaid ? '#FFFFFF' : theme.colors.textSecondary}
                    disabled={!currentSeason}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  seasonText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  summaryText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    padding: theme.spacing.md,
  },
  section: {
    padding: theme.spacing.xs,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  playerName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  playerShortName: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statusBox: {
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    minWidth: 50,
    alignItems: 'center',
  },
  paidBox: {
    backgroundColor: theme.colors.primary,
  },
  unpaidBox: {
    backgroundColor: theme.colors.accent,
  },
  statusLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: 'bold',
  },
  paidLabel: {
    color: '#FFFFFF',
  },
  unpaidLabel: {
    color: '#FFFFFF',
  },
});
