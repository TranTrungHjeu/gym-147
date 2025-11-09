/**
 * Leaderboard Utility Functions
 * Shared helpers for leaderboard calculations and period filtering
 */

/**
 * Get period filter for date-based queries
 * @param {string} period - Period type: 'weekly', 'monthly', 'yearly', 'alltime'
 * @returns {Object} Prisma where clause for date filtering
 */
function getPeriodFilter(period) {
  const now = new Date();
  let startDate;

  switch (period?.toLowerCase()) {
    case 'weekly':
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'yearly':
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'alltime':
    case 'all_time':
      return {}; // No date filter
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    gte: startDate,
  };
}

/**
 * Format leaderboard entry with member details
 * @param {Object} entry - Raw leaderboard entry
 * @param {Object} member - Member details
 * @param {number} rank - Rank position
 * @returns {Object} Formatted leaderboard entry
 */
function formatLeaderboardEntry(entry, member, rank) {
  return {
    rank,
    memberId: entry.member_id || member.id,
    memberName: member?.full_name || 'Unknown',
    avatarUrl: member?.profile_photo || null,
    membershipType: member?.membership_type || 'BASIC',
    isCurrentUser: false, // Will be set by frontend
  };
}

module.exports = {
  getPeriodFilter,
  formatLeaderboardEntry,
};

