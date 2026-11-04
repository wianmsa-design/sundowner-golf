// Helper functions for date and season management

// Get the Monday of a given week (0 = Sunday, 1 = Monday, etc.)
const getMondayOfWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getWeekDateRange = (startDate, weekNumber) => {
  // Find the Monday of the week containing the start date
  const firstMonday = getMondayOfWeek(new Date(startDate));

  // Calculate the Monday of the target week
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    start: weekStart,
    end: weekEnd,
  };
};

export const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const startDay = start.getDate();
  const startMonth = months[start.getMonth()];
  const endDay = end.getDate();
  const endMonth = months[end.getMonth()];

  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
};

export const getCurrentWeekNumber = (startDate) => {
  // Get the Monday of the week containing the start date
  const firstMonday = getMondayOfWeek(new Date(startDate));

  // Get the Monday of the current week
  const currentMonday = getMondayOfWeek(new Date());

  // If current week's Monday is before the first Monday, season hasn't started
  if (currentMonday < firstMonday) {
    return null;
  }

  // Calculate the number of weeks between the two Mondays
  const diffTime = currentMonday - firstMonday;
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

  return diffWeeks + 1;
};

export const getNextSeasonInfo = (currentSeason) => {
  if (!currentSeason) {
    return {
      year: new Date().getFullYear(),
      season: 1,
    };
  }

  const { year, season } = currentSeason;

  if (season === 1) {
    return { year, season: 2 };
  } else {
    return { year: year + 1, season: 1 };
  }
};

export const getRelativeTime = (date) => {
  if (!date) return 'Never';

  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
};

export const calculateTop8Scores = (playerScores) => {
  if (!playerScores || playerScores.length === 0) return [];

  // Sort scores highest to lowest and take top 8
  const sorted = [...playerScores].sort((a, b) => {
    const scoreA = a.isDouble ? a.score * 2 : a.score;
    const scoreB = b.isDouble ? b.score * 2 : b.score;
    return scoreB - scoreA;
  });

  return sorted.slice(0, 8);
};

export const calculateAverage = (scores) => {
  if (!scores || scores.length === 0) return 0;

  const sum = scores.reduce((acc, s) => {
    const value = s.isDouble ? s.score * 2 : s.score;
    return acc + value;
  }, 0);

  return (sum / scores.length).toFixed(1);
};

export const calculateTotal = (scores) => {
  if (!scores || scores.length === 0) return 0;

  return scores.reduce((acc, s) => {
    const value = s.isDouble ? s.score * 2 : s.score;
    return acc + value;
  }, 0);
};

export const calculateStandardDeviation = (scores) => {
  if (!scores || scores.length === 0) return 0;

  // Calculate the mean
  const sum = scores.reduce((acc, s) => {
    const value = s.isDouble ? s.score * 2 : s.score;
    return acc + value;
  }, 0);
  const mean = sum / scores.length;

  // Calculate the variance
  const variance = scores.reduce((acc, s) => {
    const value = s.isDouble ? s.score * 2 : s.score;
    return acc + Math.pow(value - mean, 2);
  }, 0) / scores.length;

  // Return the standard deviation (square root of variance)
  return Math.sqrt(variance).toFixed(1);
};

// Lifetime stats versions - use original scores (ignore double multiplier)
export const calculateLifetimeAverage = (scores) => {
  if (!scores || scores.length === 0) return 0;

  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  return (sum / scores.length).toFixed(1);
};

export const calculateLifetimeStandardDeviation = (scores) => {
  if (!scores || scores.length === 0) return 0;

  // Calculate the mean using original scores
  const sum = scores.reduce((acc, s) => acc + s.score, 0);
  const mean = sum / scores.length;

  // Calculate the variance using original scores
  const variance = scores.reduce((acc, s) => {
    return acc + Math.pow(s.score - mean, 2);
  }, 0) / scores.length;

  // Return the standard deviation (square root of variance)
  return Math.sqrt(variance).toFixed(1);
};

// Season-scoped score key helpers
export const getSeasonKey = (season) => {
  if (!season) return null;
  return `${season.year}-${season.season}`;
};

export const getScoreKey = (season, week, round = 1) => {
  const seasonKey = getSeasonKey(season);
  if (!seasonKey) return null;
  return round === 1 ? `${seasonKey}_week_${week}` : `${seasonKey}_week_${week}_${round}`;
};

export const getSeasonScores = (allScores, season) => {
  if (!allScores || !season) return {};
  const seasonKey = getSeasonKey(season);
  const seasonScores = {};

  Object.keys(allScores).forEach((key) => {
    if (key.startsWith(seasonKey + '_')) {
      seasonScores[key] = allScores[key];
    }
  });

  return seasonScores;
};

// Ranks by top-N average; a tie on it is broken by the overall season average (actual scores, all rounds)
export const compareStandings = (a, b) =>
  (b.top8Avg - a.top8Avg) || ((b.overallAvg || 0) - (a.overallAvg || 0));

// Picks 1st and 2nd from standings sorted with compareStandings.
// The overall-average tiebreak settles both places; 2nd is only withheld if still tied on both averages.
export const pickSeasonPlaces = (ranked) => {
  const winnerId = ranked[0]?.playerId ?? null;
  let secondId = null;
  if (ranked.length >= 2) {
    const [first, second, third] = ranked;
    const tied = (x, y) => x.top8Avg === y.top8Avg && (x.overallAvg || 0) === (y.overallAvg || 0);
    if (!tied(second, first) && !(third && tied(second, third))) secondId = second.playerId;
  }
  return { winnerId, secondId };
};

// Archived season immediately before `season` (by year, then season number)
export const getPreviousSeason = (historicalSeasons, season) => {
  if (!season) return null;
  const order = (s) => Number(s.year) * 100 + Number(s.season);
  const target = order(season);
  return (historicalSeasons || [])
    .filter((s) => order(s) < target)
    .sort((a, b) => order(b) - order(a))[0] || null;
};

// Process all historical seasons into per-player lifetime stats.
// Historical seasons store isDouble rounds as score*2; we halve back to raw.
// Winner/2nd come from the saved leaderboard, or top-N displayed scores when it's missing.
export const computeLifetimeStatsFromHistory = (historicalSeasons) => {
  const stats = {};

  const init = (id) => {
    if (!stats[id]) stats[id] = { wins: 0, secondPlaces: 0, scores: [], bestScore: 0 };
  };

  (historicalSeasons || []).forEach((season) => {
    const seasonScores = season.scores || {};
    const countRounds = season.countRounds || 8;

    // Gather all player IDs present in this season (including deleted players)
    const allPlayerIds = new Set();
    Object.values(seasonScores).forEach((weekData) => {
      Object.keys(weekData).forEach((pid) => allPlayerIds.add(pid));
    });

    // Collect raw (for stats) and display (for ranking) scores per player
    const rawScores = {};
    const displayScores = {};
    allPlayerIds.forEach((pid) => {
      rawScores[pid] = [];
      displayScores[pid] = [];
      Object.values(seasonScores).forEach((weekData) => {
        const sd = weekData[pid];
        if (sd && sd.score > 0) {
          rawScores[pid].push(sd.isDouble ? sd.score / 2 : sd.score);
          displayScores[pid].push(sd.score); // already doubled in historical storage
        }
      });
    });

    const overallAvg = (pid) => {
      const r = rawScores[pid] || [];
      return r.length > 0 ? r.reduce((a, b) => a + b, 0) / r.length : 0;
    };

    // The saved leaderboard is the official result; only re-rank when it's missing
    let ranked = [];
    const savedLeaderboard = season.preCalculatedLeaderboard || [];
    if (savedLeaderboard.length > 0) {
      ranked = savedLeaderboard
        .filter((e) => e && e.playerId != null && e.average != null && e.average !== 'N/A')
        .map((e) => ({
          playerId: String(e.playerId),
          top8Avg: parseFloat(e.average),
          overallAvg: e.overallAverage != null ? Number(e.overallAverage) : overallAvg(String(e.playerId)),
        }))
        .filter((e) => !Number.isNaN(e.top8Avg));
    } else {
      allPlayerIds.forEach((pid) => {
        const topN = [...displayScores[pid]].sort((a, b) => b - a).slice(0, countRounds);
        if (topN.length >= countRounds) {
          ranked.push({ playerId: pid, top8Avg: topN.reduce((a, b) => a + b, 0) / countRounds, overallAvg: overallAvg(pid) });
        }
      });
    }
    ranked.sort(compareStandings);

    const { winnerId, secondId } = pickSeasonPlaces(ranked);

    allPlayerIds.forEach((pid) => {
      init(pid);
      rawScores[pid].forEach((s) => {
        stats[pid].scores.push(s);
        if (s > stats[pid].bestScore) stats[pid].bestScore = s;
      });
    });
    if (winnerId) { init(winnerId); stats[winnerId].wins++; }
    if (secondId) { init(secondId); stats[secondId].secondPlaces++; }
  });

  return stats;
};

// Stored lifetime stats (archived seasons) plus rounds from seasons still in progress
export const mergeLifetimeWithActiveSeasons = (storedStats, allScores, activeSeasons) => {
  const merged = {};
  Object.entries(storedStats || {}).forEach(([pid, s]) => {
    merged[pid] = { ...s, scores: [...(s.scores || [])] };
  });

  (activeSeasons || []).forEach((season) => {
    Object.values(getSeasonScores(allScores, season)).forEach((weekData) => {
      Object.entries(weekData || {}).forEach(([pid, sd]) => {
        if (!sd || !(sd.score > 0)) return;
        if (!merged[pid]) merged[pid] = { wins: 0, secondPlaces: 0, scores: [], bestScore: 0 };
        merged[pid].scores.push(sd.score);
        if (sd.score > merged[pid].bestScore) merged[pid].bestScore = sd.score;
      });
    });
  });

  return merged;
};

// Calculate best round holder chronologically
// Returns the first player to achieve the highest score
export const getBestRoundHolder = (seasonScores) => {
  if (!seasonScores || Object.keys(seasonScores).length === 0) return null;

  // Sort week keys chronologically
  const sortedWeekKeys = Object.keys(seasonScores).sort((a, b) => {
    const aParts = a.split('_');
    const bParts = b.split('_');
    // Format: "2025-2_week_1" or "2025-2_week_1_2"
    const aWeek = parseInt(aParts[2]);
    const bWeek = parseInt(bParts[2]);

    if (aWeek !== bWeek) return aWeek - bWeek;

    const aRound = aParts[3] ? parseInt(aParts[3]) : 1;
    const bRound = bParts[3] ? parseInt(bParts[3]) : 1;
    return aRound - bRound;
  });

  // Track first player to reach each score and the highest score seen
  let highestScore = 0;
  let bestRoundHolder = null;

  // Iterate chronologically through all scores
  sortedWeekKeys.forEach((weekKey) => {
    const weekData = seasonScores[weekKey];

    Object.entries(weekData).forEach(([playerId, scoreData]) => {
      const score = scoreData.score;

      // If this score beats the current highest, this player becomes the holder
      if (score > highestScore) {
        highestScore = score;
        bestRoundHolder = {
          playerId,
          score,
          weekKey,
        };
      }
    });
  });

  return bestRoundHolder;
};
