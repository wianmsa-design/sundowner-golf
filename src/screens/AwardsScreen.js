import React, { useContext, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { AppContext } from '../contexts/AppContext';
import { theme } from '../utils/theme';
import { calculateTop8Scores, calculateAverage, calculateStandardDeviation, getSeasonScores, getPreviousSeason } from '../utils/helpers';

// Format start date as "9 June"
const formatStartDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('en-US', { month: 'long' });
  return `${day} ${month}`;
};

export default function AwardsScreen({ navigation }) {
  const { currentSeason, players, scores, historicalSeasons } = useContext(AppContext);
  const awardsRef = useRef();

  const awards = useMemo(() => {
    if (!currentSeason || players.length === 0) return null;

    const activePlayers = players.filter((p) => p.active);

    // Filter scores to only include current season
    const seasonScores = getSeasonScores(scores, currentSeason);
    const previousSeason = getPreviousSeason(historicalSeasons, currentSeason);

    // Calculate stats for each player (using same approach as OverviewScreen)
    const playerStats = activePlayers.map((player) => {
      // Sort week keys chronologically to ensure consecutive rounds are in order
      const sortedWeekKeys = Object.keys(seasonScores).sort((a, b) => {
        const aParts = a.split('_');
        const bParts = b.split('_');
        // New format: "2025-2_week_1" -> ["2025-2", "week", "1"]
        const aWeek = parseInt(aParts[2]);
        const bWeek = parseInt(bParts[2]);

        if (aWeek !== bWeek) return aWeek - bWeek;

        const aRound = aParts[3] ? parseInt(aParts[3]) : 1;
        const bRound = bParts[3] ? parseInt(bParts[3]) : 1;
        return aRound - bRound;
      });

      const playerScores = [];
      sortedWeekKeys.forEach((weekKey) => {
        const weekData = seasonScores[weekKey];
        if (weekData[player.id] && weekData[player.id].score > 0) {
          playerScores.push({
            score: weekData[player.id].score,
            isDouble: weekData[player.id].isDouble || false,
          });
        }
      });

      // For average and SD calculations: use actual scores (not doubled)
      // This matches the "All Rounds" tab calculation in Season Stats
      const actualScores = playerScores.map(s => ({
        score: s.score, // Use stored score as-is (it's already the actual score)
        isDouble: false,
      }));

      const average = actualScores.length > 0
        ? parseFloat(calculateAverage(actualScores))
        : 0;

      const stdDev = actualScores.length > 0
        ? parseFloat(calculateStandardDeviation(actualScores))
        : 999;

      // Full-precision SD for tie-breaking (calculateStandardDeviation rounds to 1dp)
      const stdDevRaw = (() => {
        if (actualScores.length === 0) return 999;
        const sum = actualScores.reduce((acc, s) => acc + s.score, 0);
        const mean = sum / actualScores.length;
        const variance = actualScores.reduce((acc, s) => acc + Math.pow(s.score - mean, 2), 0) / actualScores.length;
        return Math.sqrt(variance);
      })();

      const bestRound = playerScores.length > 0 ? Math.max(...playerScores.map(s => s.score)) : 0;
      const roundsPlayed = playerScores.length;

      // Calculate season-to-season improvement
      // Compare current season "All Rounds" average to previous season "All Rounds" average
      // Uses the same calculation as the Season Stats screen
      let seasonImprovement = null;
      if (previousSeason && actualScores.length >= 8) {
        const previousRaw = [];
        Object.values(previousSeason.scores || {}).forEach((weekScores) => {
          const scoreData = weekScores && weekScores[player.id];
          if (scoreData && scoreData.score > 0) {
            // Historical seasons store double rounds doubled; halve back to the actual score
            previousRaw.push(scoreData.isDouble ? scoreData.score / 2 : scoreData.score);
          }
        });

        if (previousRaw.length >= 8) {
          const previousAverage = previousRaw.reduce((a, b) => a + b, 0) / previousRaw.length;
          const currentAverage = actualScores.reduce((a, s) => a + s.score, 0) / actualScores.length;
          seasonImprovement = currentAverage - previousAverage;
        }
      }

      // Calculate hot streak (best 3 consecutive rounds using actual scores)
      let hotStreak = 0;
      let hotStreakScores = [];
      if (actualScores.length >= 3) {
        for (let i = 0; i <= actualScores.length - 3; i++) {
          const threeRounds = actualScores.slice(i, i + 3);
          const avg = parseFloat(calculateAverage(threeRounds));
          if (avg > hotStreak) {
            hotStreak = avg;
            hotStreakScores = threeRounds.map(r => r.score);
          }
        }
      }

      // Calculate best double score (using actual score, not doubled)
      const doubleScores = playerScores.filter(s => s.isDouble);
      const bestDoubleScore = doubleScores.length > 0 ? Math.max(...doubleScores.map(s => s.score)) : 0;

      return {
        player,
        average,
        stdDev,
        bestRound,
        roundsPlayed,
        seasonImprovement,
        hotStreak,
        hotStreakScores,
        bestDoubleScore,
        stdDevRaw,
      };
    });

    // Helper function to find all players tied for an award
    const getTiedPlayers = (players, getValue, sortDescending = true) => {
      if (players.length === 0) return [];

      const sorted = [...players].sort((a, b) => {
        const aVal = getValue(a);
        const bVal = getValue(b);
        return sortDescending ? bVal - aVal : aVal - bVal;
      });

      const topValue = getValue(sorted[0]);
      return sorted.filter(p => getValue(p) === topValue);
    };

    // Filter players with at least 8 rounds
    const qualifiedPlayers = playerStats.filter(p => p.roundsPlayed >= 8);

    if (qualifiedPlayers.length === 0) return null;

    // Calculate awards (all return arrays of tied players)
    const bestAverage = getTiedPlayers(qualifiedPlayers, p => p.average, true);
    const mostConsistent = getTiedPlayers(qualifiedPlayers, p => p.stdDevRaw, false);
    const leastConsistent = getTiedPlayers(qualifiedPlayers, p => p.stdDevRaw, true);

    // Clutch Player - considers ALL players (not just qualified), only those who played double rounds
    const allPlayersWithDoubleScores = playerStats.filter(p => p.bestDoubleScore > 0);
    const bestFinisher = allPlayersWithDoubleScores.length > 0
      ? getTiedPlayers(allPlayersWithDoubleScores, p => p.bestDoubleScore, true)
      : [];

    const hotStreak = getTiedPlayers(qualifiedPlayers, p => p.hotStreak, true);

    // Hard Worker - compare current season to previous season
    const playersWithSeasonImprovement = qualifiedPlayers.filter(p => p.seasonImprovement !== null);
    const mostImproved = playersWithSeasonImprovement.length > 0
      ? getTiedPlayers(playersWithSeasonImprovement, p => p.seasonImprovement, true)
      : [];

    const golfAddict = getTiedPlayers(qualifiedPlayers, p => p.roundsPlayed, true);

    return {
      bestAverage,
      mostConsistent,
      leastConsistent,
      bestFinisher,
      hotStreak,
      mostImproved,
      golfAddict,
    };
  }, [currentSeason, players, scores, historicalSeasons]);

  const handleShare = async () => {
    if (!currentSeason) {
      Alert.alert('Error', 'No active season to share');
      return;
    }

    try {
      // Capture the awards as an image
      const uri = await captureRef(awardsRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      // Share the image
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Awards',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share awards');
      console.error(error);
    }
  };

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
  }, [navigation, handleShare]);

  if (!currentSeason) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="emoji-events" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No active season</Text>
      </View>
    );
  }

  if (!awards) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialIcons name="emoji-events" size={64} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No scores yet</Text>
        <Text style={styles.emptySubText}>Awards will appear once scores are entered</Text>
      </View>
    );
  }

  const AwardCard = ({ icon, iconColor, title, winners, value, description }) => {
    // winners is now an array of winner objects
    const winnerNames = winners && winners.length > 0
      ? winners.map(w => w.player.name).join(' / ')
      : 'TBC';

    return (
      <View style={[styles.enhancedAwardCard, { borderLeftColor: iconColor }]}>
        <LinearGradient
          colors={[theme.colors.surface, theme.colors.surface + 'E0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          {/* Large watermark icon */}
          <View style={styles.watermarkContainer}>
            <MaterialIcons name={icon} size={250} color="#FFFFFF" style={styles.watermarkIcon} />
          </View>

          <View style={styles.enhancedAwardHeader}>
            <View style={styles.enhancedAwardHeaderLeft}>
              <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
                <MaterialIcons name={icon} size={28} color={iconColor} />
              </View>
              <Text style={styles.awardTitle}>{title}</Text>
            </View>
            {description && <Text style={styles.awardDescription}>{description}</Text>}
          </View>
          <View style={styles.awardContent}>
            <Text style={styles.winnerName}>{winnerNames}</Text>
            <Text style={styles.awardValue}>{value}</Text>
          </View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.awardsContainer} ref={awardsRef} collapsable={false}>
          <View style={styles.awardsHeader}>
            <View style={styles.awardsHeaderTable}>
              <View style={styles.awardsHeaderCell1}>
                <Text style={styles.awardsYearLabelText}>Year</Text>
                <Text style={styles.awardsYearText}>{currentSeason?.year}</Text>
              </View>
              <View style={styles.awardsHeaderCell2}>
                <MaterialIcons name="military-tech" size={32} color={theme.colors.trophyGold} />
                <Text style={styles.awardsHeaderTitle}>Season Awards</Text>
              </View>
              <View style={styles.awardsHeaderCell3}>
                <Text style={styles.awardsSeasonText}>Season {currentSeason?.season}</Text>
                <Text style={styles.awardsStartDateText}>{formatStartDate(currentSeason?.startDate)}</Text>
              </View>
            </View>
          </View>

          <AwardCard
            icon="repeat"
            iconColor="#A1887F"
            title="Repeat Customer"
            winners={awards.golfAddict}
            value={awards.golfAddict && awards.golfAddict.length > 0 ? `${awards.golfAddict[0].roundsPlayed} rounds` : '-'}
            description="Most rounds played"
          />

          <AwardCard
            icon="bolt"
            iconColor="#FFC107"
            title="Clutch Player"
            winners={awards.bestFinisher}
            value={awards.bestFinisher && awards.bestFinisher.length > 0 ? awards.bestFinisher[0].bestDoubleScore * 2 : '-'}
            description="Highest score on double round"
          />

          <AwardCard
            icon="local-fire-department"
            iconColor="#FF5722"
            title="Hot Streak"
            winners={awards.hotStreak}
            value={awards.hotStreak && awards.hotStreak.length > 0 ? `Total: ${awards.hotStreak[0].hotStreakScores.reduce((a, b) => a + b, 0)} | Avg: ${awards.hotStreak[0].hotStreak.toFixed(1)}` : '-'}
            description="Best 3 consecutive rounds"
          />

          <AwardCard
            icon="trending-up"
            iconColor="#4CAF50"
            title="Hard Worker"
            winners={awards.mostImproved}
            value={awards.mostImproved && awards.mostImproved.length > 0 ? `${awards.mostImproved[0].seasonImprovement > 0 ? '+' : ''}${awards.mostImproved[0].seasonImprovement.toFixed(2)}` : '-'}
            description="Biggest improvement from last season"
          />

          <AwardCard
            icon="smart-toy"
            iconColor="#2196F3"
            title="Mr. Consistent"
            winners={awards.mostConsistent}
            value={awards.mostConsistent && awards.mostConsistent.length > 0 ? `SD: ${awards.mostConsistent[0].stdDevRaw.toFixed(1)}` : '-'}
            description="Most consistent player"
          />

          <AwardCard
            icon="casino"
            iconColor="#00BCD4"
            title="Wild Card"
            winners={awards.leastConsistent}
            value={awards.leastConsistent && awards.leastConsistent.length > 0 ? `SD: ${awards.leastConsistent[0].stdDevRaw.toFixed(1)}` : '-'}
            description="Least consistent player"
          />

          <AwardCard
            icon="remove-red-eye"
            iconColor="#9C27B0"
            title="The Ringer"
            winners={awards.bestAverage}
            value={awards.bestAverage && awards.bestAverage.length > 0 ? awards.bestAverage[0].average.toFixed(2) : '-'}
            description="Highest scoring average"
          />
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
  scrollView: {
    flex: 1,
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
  awardsContainer: {
    backgroundColor: theme.colors.background,
  },
  awardsHeader: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  awardsHeaderTable: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
  },
  awardsHeaderCell1: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    height: 50,
  },
  awardsHeaderCell2: {
    flex: 2,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  awardsHeaderCell3: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 50,
  },
  awardsYearLabelText: {
    fontSize: 10,
    color: theme.colors.text,
    marginBottom: 2,
  },
  awardsYearText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  awardsHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 2,
  },
  awardsSeasonText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  awardsStartDateText: {
    fontSize: 10,
    color: theme.colors.text,
    marginTop: 2,
  },
  awardTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  awardContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  winnerName: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  awardValue: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold',
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  awardDescription: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginLeft: theme.spacing.xs,
    maxWidth: '50%',
  },
  enhancedAwardCard: {
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  gradientContainer: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    position: 'relative',
  },
  watermarkContainer: {
    position: 'absolute',
    right: -25,
    top: 0,
    bottom: 0,
    width: 200,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
  },
  watermarkIcon: {
    opacity: 0.06,
  },
  enhancedAwardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    zIndex: 1,
  },
  enhancedAwardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  namePill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  headerShareButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
});
