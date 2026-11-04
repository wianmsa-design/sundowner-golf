import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppProvider } from './src/contexts/AppContext';
import { theme } from './src/utils/theme';

// Import screens
import ScoreEntryScreen from './src/screens/ScoreEntryScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import AwardsScreen from './src/screens/AwardsScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import ManagementScreen from './src/screens/ManagementScreen';
import HistoricalScoresScreen from './src/screens/HistoricalScoresScreen';
import LifetimeStatsScreen from './src/screens/LifetimeStatsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <Tab.Navigator
          initialRouteName="ScoreEntry"
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
        </Tab.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}
