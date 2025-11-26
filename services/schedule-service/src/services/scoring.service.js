/**
 * Scoring Service - Tính điểm sắp xếp hạng cho class recommendations
 * Công thức: score = w1*sim + w2*pop + w3*r + w4*div
 */

class ScoringService {
  constructor() {
    // Trọng số mặc định (có thể điều chỉnh qua env)
    this.weights = {
      similarity: parseFloat(process.env.SCORE_WEIGHT_SIMILARITY || '0.4'), // w1
      popularity: parseFloat(process.env.SCORE_WEIGHT_POPULARITY || '0.3'), // w2
      recency: parseFloat(process.env.SCORE_WEIGHT_RECENCY || '0.2'), // w3
      diversity: parseFloat(process.env.SCORE_WEIGHT_DIVERSITY || '0.1'), // w4
    };

    // Normalize weights
    const total = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
    Object.keys(this.weights).forEach(key => {
      this.weights[key] = this.weights[key] / total;
    });
  }

  /**
   * Tính điểm popularity của một class
   * Dựa trên: số lượng thành viên đã tham gia, tỷ lệ hoàn thành, đánh giá trung bình
   * @param {Object} classData - Class data với attendance stats
   * @returns {number} - Popularity score [0, 1]
   */
  calculatePopularity(classData) {
    const {
      attendanceCount = 0,
      bookingCount = 0,
      averageRating = 0,
      completionRate = 0,
      maxCapacity = 20,
    } = classData;

    // Normalize attendance count (0-1 scale, max 100 attendees)
    const normalizedAttendance = Math.min(attendanceCount / 100, 1);

    // Normalize booking count
    const normalizedBookings = Math.min(bookingCount / 100, 1);

    // Normalize rating (1-5 scale to 0-1)
    const normalizedRating = (averageRating - 1) / 4; // (rating - 1) / (5 - 1)

    // Completion rate (0-1)
    const normalizedCompletion = Math.min(completionRate, 1);

    // Weighted average
    const popularity =
      normalizedAttendance * 0.3 +
      normalizedBookings * 0.2 +
      normalizedRating * 0.3 +
      normalizedCompletion * 0.2;

    return Math.max(0, Math.min(1, popularity));
  }

  /**
   * Tính điểm recency của một class
   * Dựa trên thời gian cuối cùng class được diễn ra
   * @param {Date} lastScheduleDate - Ngày cuối cùng class được schedule
   * @returns {number} - Recency score [0, 1]
   */
  calculateRecency(lastScheduleDate) {
    if (!lastScheduleDate) return 0.5; // Default nếu không có data

    const now = new Date();
    const daysSinceLastSchedule = Math.floor(
      (now - new Date(lastScheduleDate)) / (1000 * 60 * 60 * 24)
    );

    // Recency decay: giảm dần theo thời gian
    // Classes trong 7 ngày gần nhất: score cao
    // Classes trong 30 ngày: score trung bình
    // Classes > 30 ngày: score thấp
    if (daysSinceLastSchedule <= 7) {
      return 1.0;
    } else if (daysSinceLastSchedule <= 30) {
      return 1.0 - (daysSinceLastSchedule - 7) / 30;
    } else {
      return Math.max(0.1, 1.0 - daysSinceLastSchedule / 90);
    }
  }

  /**
   * Tính điểm diversity
   * Giảm điểm nếu đã gợi ý quá nhiều cùng loại class
   * @param {string} category - Category của class
   * @param {Array} recentRecommendations - Danh sách categories đã được gợi ý gần đây
   * @returns {number} - Diversity score [0, 1]
   */
  calculateDiversity(category, recentRecommendations = []) {
    if (!recentRecommendations || recentRecommendations.length === 0) {
      return 1.0; // Không có gợi ý trước đó -> diversity cao
    }

    // Đếm số lần category này đã được gợi ý
    const categoryCount = recentRecommendations.filter(c => c === category).length;
    const totalRecommendations = recentRecommendations.length;

    // Nếu category này chiếm > 50% gợi ý -> giảm diversity
    const categoryRatio = categoryCount / totalRecommendations;

    if (categoryRatio > 0.5) {
      return 0.3; // Diversity thấp
    } else if (categoryRatio > 0.3) {
      return 0.6; // Diversity trung bình
    } else {
      return 1.0; // Diversity cao
    }
  }

  /**
   * Tính điểm tổng hợp cho một class
   * score = w1*sim + w2*pop + w3*r + w4*div
   * @param {Object} params - Các tham số tính điểm
   * @returns {number} - Final score [0, 1]
   */
  calculateFinalScore({
    similarity, // sim_i: cosine similarity [0, 1]
    popularity, // pop_i: popularity score [0, 1]
    recency, // r_i: recency score [0, 1]
    diversity, // div_i: diversity score [0, 1]
  }) {
    // Normalize similarity từ [-1, 1] về [0, 1]
    const normalizedSimilarity = (similarity + 1) / 2;

    // Tính điểm tổng hợp
    const score =
      this.weights.similarity * normalizedSimilarity +
      this.weights.popularity * popularity +
      this.weights.recency * recency +
      this.weights.diversity * diversity;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Tính điểm cho nhiều classes và sắp xếp
   * @param {Array} classes - Danh sách classes với các metrics
   * @param {Array} recentCategories - Categories đã được gợi ý gần đây
   * @returns {Array} - Danh sách classes đã được sắp xếp theo score
   */
  scoreAndRankClasses(classes, recentCategories = []) {
    return classes
      .map(classItem => {
        const score = this.calculateFinalScore({
          similarity: classItem.similarity || 0,
          popularity: classItem.popularity || 0,
          recency: classItem.recency || 0.5,
          diversity: this.calculateDiversity(classItem.category, recentCategories),
        });

        return {
          ...classItem,
          finalScore: score,
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore); // Sort descending
  }
}

module.exports = new ScoringService();

