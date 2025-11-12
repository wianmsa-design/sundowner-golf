import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as LegacyFileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { AppContext } from '../contexts/AppContext';
import { theme } from '../utils/theme';
import { getNextSeasonInfo } from '../utils/helpers';

const Tab = createMaterialTopTabNavigator();

export default function ManagementScreen() {
  const {
    currentSeason,
    setCurrentSeason,
    players,
    setPlayers,
    scores,
    setScores,
    historicalSeasons,
    setHistoricalSeasons,
  } = useContext(AppContext);

  const [addPlayerModal, setAddPlayerModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerShortName, setNewPlayerShortName] = useState('');
  const [startSeasonModal, setStartSeasonModal] = useState(false);
  const [newSeasonYear, setNewSeasonYear] = useState('');
  const [newSeasonNumber, setNewSeasonNumber] = useState('1');
  const [newSeasonStartDate, setNewSeasonStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim() || !newPlayerShortName.trim()) {
      Alert.alert('Error', 'Both name and short name are required');
      return;
    }

    const newPlayer = {
      id: Date.now().toString(),
      name: newPlayerName.trim(),
      shortName: newPlayerShortName.trim().toUpperCase(),
      active: true,
    };

    setPlayers([...players, newPlayer]);
    setNewPlayerName('');
    setNewPlayerShortName('');
    setAddPlayerModal(false);
  };

  const handleRemovePlayer = (playerId, playerName) => {
    Alert.alert(
      'Confirm',
      `Are you sure you want to remove ${playerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            setPlayers(players.filter((p) => p.id !== playerId));
          },
        },
      ]
    );
  };

  const openStartSeasonModal = () => {
    const nextSeason = getNextSeasonInfo(currentSeason);
    setNewSeasonYear(nextSeason.year.toString());
    setNewSeasonNumber(nextSeason.season.toString());
    setNewSeasonStartDate(new Date());
    setStartSeasonModal(true);
  };

  const handleStartNewSeason = () => {
    const year = parseInt(newSeasonYear);
    const season = parseInt(newSeasonNumber);
    const startDate = newSeasonStartDate.toISOString().split('T')[0];

    if (!year || !season) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Check if start date is more than one week in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(startDate);
    selectedDate.setHours(0, 0, 0, 0);
    const oneWeekFromNow = new Date(today);
    oneWeekFromNow.setDate(today.getDate() + 7);

    if (selectedDate > oneWeekFromNow) {
      Alert.alert('Error', 'Season start date cannot be more than one week in the future');
      return;
    }

    if (currentSeason) {
      const archivedSeason = {
        ...currentSeason,
        scores: { ...scores },
        archived: true,
      };
      setHistoricalSeasons([...historicalSeasons, archivedSeason]);
    }

    const newSeason = {
      year,
      season,
      startDate,
      weeks: [],
    };

    setCurrentSeason(newSeason);
    setScores({});
    setStartSeasonModal(false);

    Alert.alert('Success', `Season ${year} - Season ${season} started!`);
  };

  const handleDeleteSeason = () => {
    if (!currentSeason) {
      Alert.alert('Error', 'No active season to delete');
      return;
    }

    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${currentSeason.year} - Season ${currentSeason.season}? This will delete all scores for this season.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setCurrentSeason(null);
            setScores({});
            Alert.alert('Success', 'Season deleted');
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      // Prepare backup data
      const backupData = {
        currentSeason,
        players,
        scores,
        historicalSeasons,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
      };

      // Create filename with current date
      const date = new Date().toISOString().split('T')[0];
      const filename = `sundowner-golf-backup-${date}.json`;
      const jsonString = JSON.stringify(backupData, null, 2);

      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        // Android: Use Storage Access Framework
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          Alert.alert('Permission required', 'Storage permission is needed to save the backup file');
          return;
        }

        const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename,
          'application/json'
        );

        await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, jsonString);
        Alert.alert('Success', 'Backup file saved successfully');
      } else {
        // iOS or fallback: Use cache directory and share (legacy API for Expo Go)
        const fileUri = LegacyFileSystem.cacheDirectory + filename;
        await LegacyFileSystem.writeAsStringAsync(fileUri, jsonString);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Save Backup File',
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
      console.error(error);
    }
  };

  const handleImportData = async () => {
    try {
      // Open document picker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      let fileContent;
      if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
        // Android: Use Storage Access Framework
        fileContent = await FileSystem.StorageAccessFramework.readAsStringAsync(result.assets[0].uri);
      } else {
        // iOS or fallback (legacy API for Expo Go)
        fileContent = await LegacyFileSystem.readAsStringAsync(result.assets[0].uri);
      }

      const backupData = JSON.parse(fileContent);

      // Validate backup data
      if (!backupData.version || !backupData.exportDate) {
        Alert.alert('Error', 'Invalid backup file format');
        return;
      }

      // Confirm restore
      Alert.alert(
        'Confirm Restore',
        `This will replace all current data with the backup from ${new Date(backupData.exportDate).toLocaleDateString()}. Are you sure?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              // Restore data
              if (backupData.currentSeason) setCurrentSeason(backupData.currentSeason);
              if (backupData.players) setPlayers(backupData.players);
              if (backupData.scores) setScores(backupData.scores);
              if (backupData.historicalSeasons) setHistoricalSeasons(backupData.historicalSeasons);

              Alert.alert('Success', 'Data restored successfully');
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to import data. Please ensure you selected a valid backup file.');
      console.error(error);
    }
  };

  const activePlayers = players.filter((p) => p.active);

  // Setup Tab Component (Competition + Data Management)
  const SetupTab = () => (
    <ScrollView style={styles.container}>
      {/* Competition Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Competition Management</Text>

        {currentSeason ? (
          <View style={styles.currentSeasonInfo}>
            <Text style={styles.currentSeasonText}>
              Current: {currentSeason.year} - Season {currentSeason.season}
            </Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>No active season</Text>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={openStartSeasonModal}
        >
          <MaterialIcons name="flag" size={20} color={theme.colors.text} />
          <Text style={styles.addButtonText}>Start New Season</Text>
        </TouchableOpacity>

        {currentSeason && (
          <TouchableOpacity
            style={[styles.addButton, styles.deleteSeasonButton]}
            onPress={handleDeleteSeason}
          >
            <MaterialIcons name="delete" size={20} color={theme.colors.text} />
            <Text style={styles.addButtonText}>Delete Season</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Data Management Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleExportData}
        >
          <MaterialIcons name="upload" size={20} color={theme.colors.text} />
          <Text style={styles.addButtonText}>Export Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleImportData}
        >
          <MaterialIcons name="download" size={20} color={theme.colors.text} />
          <Text style={styles.addButtonText}>Import Data</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Entry Fees Tab Component
  const EntryFeesTab = () => {
    const { entryFees, setEntryFees } = useContext(AppContext);

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

    const sortedActivePlayers = activePlayers.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    const paidCount = sortedActivePlayers.filter(p => getPaymentStatus(p.id)).length;
    const totalCount = sortedActivePlayers.length;

    return (
      <View style={styles.tabContainer}>
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

        <ScrollView style={styles.feesSection}>
          {sortedActivePlayers.length === 0 ? (
            <Text style={styles.emptyText}>No players added yet</Text>
          ) : (
            sortedActivePlayers.map((player) => {
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
        </ScrollView>
      </View>
    );
  };

  // Players Tab Component
  const PlayersTab = () => (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        {activePlayers.length === 0 && (
          <Text style={styles.emptyText}>No players added yet</Text>
        )}

        {activePlayers.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.name}</Text>
              <Text style={styles.playerShortName}>({player.shortName})</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleRemovePlayer(player.id, player.name)}
              style={styles.deleteButton}
            >
              <MaterialIcons name="delete" size={20} color={theme.colors.accent} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setAddPlayerModal(true)}
        >
          <MaterialIcons name="add" size={20} color={theme.colors.text} />
          <Text style={styles.addButtonText}>Add Player</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.tabContainer}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarIndicatorStyle: {
            backgroundColor: theme.colors.primary,
            height: 3,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: 'bold',
            textTransform: 'uppercase',
          },
        }}
      >
        <Tab.Screen name="Setup" component={SetupTab} />
        <Tab.Screen name="Entry Fees" component={EntryFeesTab} />
        <Tab.Screen name="Players" component={PlayersTab} />
      </Tab.Navigator>

      {/* Add Player Modal */}
      <Modal
        visible={addPlayerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setAddPlayerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Player</Text>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              placeholderTextColor={theme.colors.textSecondary}
              value={newPlayerName}
              onChangeText={setNewPlayerName}
            />

            <Text style={styles.inputLabel}>Short Name</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              placeholderTextColor={theme.colors.textSecondary}
              value={newPlayerShortName}
              onChangeText={(text) => setNewPlayerShortName(text.toUpperCase())}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setAddPlayerModal(false);
                  setNewPlayerName('');
                  setNewPlayerShortName('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddPlayer}
              >
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Start New Season Modal */}
      <Modal
        visible={startSeasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => setStartSeasonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm New Season</Text>

            <Text style={styles.inputLabel}>Year</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newSeasonYear}
                onValueChange={(value) => setNewSeasonYear(value)}
                style={styles.picker}
                dropdownIconColor={theme.colors.text}
              >
                {yearOptions.map((year) => (
                  <Picker.Item key={year} label={year.toString()} value={year.toString()} />
                ))}
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Season</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newSeasonNumber}
                onValueChange={(value) => setNewSeasonNumber(value)}
                style={styles.picker}
                dropdownIconColor={theme.colors.text}
              >
                <Picker.Item label="Season 1" value="1" />
                <Picker.Item label="Season 2" value="2" />
              </Picker>
            </View>

            <Text style={styles.inputLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {newSeasonStartDate.toLocaleDateString()}
              </Text>
              <MaterialIcons name="calendar-today" size={20} color={theme.colors.text} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={newSeasonStartDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setNewSeasonStartDate(selectedDate);
                  }
                }}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setStartSeasonModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleStartNewSeason}
              >
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  section: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  feesSection: {
    padding: theme.spacing.xs,
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
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  playerName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  playerShortName: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: theme.spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  addButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  deleteSeasonButton: {
    backgroundColor: theme.colors.accent,
  },
  currentSeasonInfo: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  currentSeasonText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  pickerContainer: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  picker: {
    color: theme.colors.text,
  },
  dateButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.border,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
  },
  modalButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
});
