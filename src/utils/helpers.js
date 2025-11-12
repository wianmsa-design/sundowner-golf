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
