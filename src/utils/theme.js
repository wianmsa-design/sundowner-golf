// Dark mode theme inspired by Sundowner Golf logo
export const theme = {
  colors: {
    background: '#1a1a1a',
    surface: '#2a2a2a',
    primary: '#4CAF50', // Green from logo
    secondary: '#FFC107', // Yellow/Gold from logo
    accent: '#FF5252', // Red from logo
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    border: '#404040',

    // Score color coding
    scoreRed: '#FF5252',
    scoreOrange: '#FF9800',
    scoreYellowGreen: '#CDDC39', // Bright yellow-green for 16-19
    scoreGreen: '#4CAF50', // Bright rich green for 20+

    // Status colors
    weekCurrent: '#4CAF50',
    weekPast: '#808080', // Grey for past weeks
    weekFuture: '#FF9800', // Orange for future weeks

    // Trophy colors
    trophyGold: '#FFD700',
    trophySilver: '#C0C0C0',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },

  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
};

// Helper function to get score color
export const getScoreColor = (score) => {
  if (score >= 20) return theme.colors.scoreGreen; // Rich green for 20+
  if (score >= 16) return theme.colors.scoreYellowGreen; // Yellow-green for 16-19
  if (score >= 10) return theme.colors.scoreOrange;
  return theme.colors.scoreRed;
};

// Helper function to get contrasting text color
export const getContrastTextColor = (backgroundColor) => {
  // Simple contrast calculation - can be enhanced
  return '#000000'; // Dark text for colored backgrounds
};
