/**
 * Price Mapping Service
 * Handles automatic price setting based on class difficulty level
 */

class PriceMappingService {
  /**
   * Price mapping based on difficulty level
   */
  static PRICE_MAP = {
    BEGINNER: 150000,      // 150,000 VND
    INTERMEDIATE: 200000,  // 200,000 VND
    ADVANCED: 250000,      // 250,000 VND
    ALL_LEVELS: 180000,    // 180,000 VND
  };

  /**
   * Get price for a specific difficulty level
   * @param {string} difficulty - Difficulty level (BEGINNER, INTERMEDIATE, ADVANCED, ALL_LEVELS)
   * @returns {number} - Price in VND
   */
  static getPriceByDifficulty(difficulty) {
    const normalizedDifficulty = difficulty?.toUpperCase();
    
    if (!normalizedDifficulty || !this.PRICE_MAP[normalizedDifficulty]) {
      console.warn(`⚠️ Unknown difficulty level: ${difficulty}, using default price`);
      return this.PRICE_MAP.ALL_LEVELS; // Default to ALL_LEVELS price
    }

    return this.PRICE_MAP[normalizedDifficulty];
  }

  /**
   * Get all available difficulty levels with their prices
   * @returns {Array} - Array of {level, price} objects
   */
  static getAllDifficultyPrices() {
    return Object.entries(this.PRICE_MAP).map(([level, price]) => ({
      level,
      price,
      formattedPrice: this.formatPrice(price),
    }));
  }

  /**
   * Format price for display
   * @param {number} price - Price in VND
   * @returns {string} - Formatted price string
   */
  static formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }

  /**
   * Validate if a difficulty level is supported
   * @param {string} difficulty - Difficulty level to validate
   * @returns {boolean} - True if supported
   */
  static isValidDifficulty(difficulty) {
    const normalizedDifficulty = difficulty?.toUpperCase();
    return normalizedDifficulty && this.PRICE_MAP[normalizedDifficulty] !== undefined;
  }

  /**
   * Get price range for display
   * @returns {Object} - Min and max prices
   */
  static getPriceRange() {
    const prices = Object.values(this.PRICE_MAP);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      formattedMin: this.formatPrice(Math.min(...prices)),
      formattedMax: this.formatPrice(Math.max(...prices)),
    };
  }
}

module.exports = PriceMappingService;

