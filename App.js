import 'react-native-gesture-handler';
import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppProvider, AppContext } from './src/contexts/AppContext';
import { READ_ONLY } from './src/config';
import { theme } from './src/utils/theme';

// Import screens
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import AwardsScreen from './src/screens/AwardsScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import HistoricalScoresScreen from './src/screens/HistoricalScoresScreen';
import LifetimeStatsScreen from './src/screens/LifetimeStatsScreen';

// Editor screens are only loaded in the master app, so the read-only web build never bundles them.
const ScoreEntryScreen = READ_ONLY ? null : require('./src/screens/ScoreEntryScreen').default;
const ManagementScreen = READ_ONLY ? null : require('./src/screens/ManagementScreen').default;

const Tab = createBottomTabNavigator();

function SyncBanner() {
  const { readOnly, lastSynced, syncError, activeSeasons, selectedSeasonId, setSelectedSeasonId } = useContext(AppContext);
  if (!readOnly) return null;
  const text = syncError
    ? `Couldn't update (${syncError}). Showing last saved data.`
    : lastSynced
      ? `Updated ${lastSynced.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
      : 'Loading...';
  return (
    <View style={[bannerStyles.bar, syncError && bannerStyles.barError]}>
      <Text style={bannerStyles.text}>{text}</Text>
      {activeSeasons.length > 1 && (
        <Picker
          selectedValue={selectedSeasonId}
          onValueChange={setSelectedSeasonId}
          style={bannerStyles.picker}
          dropdownIconColor={theme.colors.text}
        >
          {activeSeasons.map((season) => (
            <Picker.Item key={season.id} label={`${season.year} - Season ${season.season}`} value={season.id} />
          ))}
        </Picker>
      )}
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  bar: { backgroundColor: theme.colors.surface, paddingVertical: 4, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  barError: { backgroundColor: '#5a2a2a' },
  picker: { color: theme.colors.text, backgroundColor: theme.colors.background, marginTop: 4 },
  text: { fontSize: 12, color: theme.colors.textSecondary, textAlign: 'center' },
});

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <View style={{ flex: 1 }}>
        <SyncBanner />
        <Tab.Navigator
          initialRouteName={READ_ONLY ? 'SeasonResults' : 'ScoreEntry'}
          screenOptions={{
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              borderTopWidth: 1,
              height: 60,
              paddingBottom: 8,
              paddingTop: 8,
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarShowLabel: false,
            headerStyle: {
              backgroundColor: theme.colors.surface,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            },
            headerTintColor: theme.colors.text,
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 20,
            },
          }}
        >
          {!READ_ONLY && (
          <Tab.Screen
            name="ScoreEntry"
            component={ScoreEntryScreen}
            options={({ navigation, route }) => ({
              title: 'Score Entry',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="edit" size={size} color={color} />
              ),
            })}
          />
          )}
          <Tab.Screen
            name="SeasonResults"
            component={LeaderboardScreen}
            options={{
              title: 'Season Results',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="emoji-events" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Awards"
            component={AwardsScreen}
            options={{
              title: 'Season Awards',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="military-tech" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Overview"
            component={OverviewScreen}
            options={{
              title: 'Player Stats',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="analytics" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="LifetimeStats"
            component={LifetimeStatsScreen}
            options={{
              title: 'Lifetime Stats',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="insights" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="HistoricalScores"
            component={HistoricalScoresScreen}
            options={{
              title: 'Historical Seasons',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="history" size={size} color={color} />
              ),
            }}
          />
          {!READ_ONLY && (
          <Tab.Screen
            name="Management"
            component={ManagementScreen}
            options={{
              title: 'Management',
              tabBarIcon: ({ color, size }) => (
                <MaterialIcons name="settings" size={size} color={color} />
              ),
            }}
          />
          )}
        </Tab.Navigator>
        </View>
      </NavigationContainer>
    </AppProvider>
  );
}
