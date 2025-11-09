const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const axios = require('axios');

/**
 * AI Certification Scanner Service
 */

class AICertificationScanner {
  constructor() {
    // AI Configuration
    this.AI_API_KEY = process.env.AI_API_KEY;
    this.AI_MODEL_URL = process.env.AI_MODEL_URL;

    // Gym147 Official Seal Template
    this.OFFICIAL_SEAL_URL = process.env.OFFICIAL_SEAL_URL;

    // Fallback: Sharp-based analysis
    this.redColorRanges = [
      // Bright red
      { h: [0, 10], s: [50, 100], v: [50, 100] },
      { h: [350, 360], s: [50, 100], v: [50, 100] },
      // Dark red
      { h: [0, 10], s: [70, 100], v: [30, 70] },
      { h: [350, 360], s: [70, 100], v: [30, 70] },
    ];

    // Minimum seal size (percentage of image)
    this.minSealSize = 0.01; // 1% of image
    this.maxSealSize = 0.3; // 30% of image
  }

  /**
   * @param {string} imageSource - Path to local file or URL to the certificate image
   * @returns {Object} - Scan result with hasRedSeal boolean and confidence score
   */
  async scanForRedSeal(imageSource) {
    try {
      console.log(`Scanning certificate for red seal: ${imageSource}`);

      // Only use AI analysis
      if (this.isUrl(imageSource) && this.AI_API_KEY) {
        console.log('Using AI for analysis...');
        const aiResult = await this.scanWithAIModel(imageSource);
        if (aiResult) {
          console.log(`AI result:`, aiResult);
          return aiResult;
        }
        console.log('AI failed, returning default result...');
      }

      // Return default result if AI is not available
      return {
        hasRedSeal: false,
        isGym147Seal: false,
        confidence: 0,
        description: 'AI analysis not available',
        sealLocation: 'Unknown',
        sealType: 'Unknown',
        similarityScore: 0,
        source: 'AI Not Available',
        imageUrl: imageSource,
        officialSealUrl: this.OFFICIAL_SEAL_URL,
        timestamp: new Date().toISOString(),
      };

      // Commented out Sharp analysis - only using AI
      /*
      // Method 2: Fallback to Sharp analysis
      console.log('Using Sharp analysis...');
      return await this.scanWithSharp(imageSource);
      */
    } catch (error) {
      console.error('Error scanning certificate:', error);
      return {
        hasRedSeal: false,
        confidence: 0,
        error: error.message,
        source: 'Error',
      };
    }
  }

  /**
   * @param {string} imageUrl - URL to the certificate image
   * @returns {Object} - AI scan result
   */
  async scanWithAIModel(imageUrl) {
    try {
      const response = await axios.post(
        this.AI_MODEL_URL,
        {
          model: 'google/gemma-3-4b-it:free',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Phân tích ảnh chứng chỉ này và so sánh với con dấu mẫu của Gym147. 
                Con dấu mẫu: ${this.OFFICIAL_SEAL_URL}
                
                Hãy kiểm tra:
                1. Có con dấu đỏ trong ảnh không?
                2. Con dấu có giống với mẫu Gym147 không?
                3. Vị trí và kích thước của con dấu
                4. Trích xuất thông tin từ chứng chỉ:
                   - Tên chứng chỉ (certification_name) - bắt buộc phải có
                   - Tổ chức cấp (certification_issuer) - bắt buộc phải có
                   - Ngày cấp (issued_date) - format: YYYY-MM-DD, bắt buộc phải có
                   - Ngày hết hạn (expiration_date) - format: YYYY-MM-DD, QUAN TRỌNG: Nếu chứng chỉ có ngày hết hạn thì PHẢI trích xuất, nếu không có thì để null. Tìm kiếm các từ khóa như "hết hạn", "expires", "valid until", "expiration date", "ngày hết hạn"
                   - Danh mục (category) - QUAN TRỌNG: Phải trích xuất danh mục dựa trên nội dung chứng chỉ. Mapping như sau:
                     * Tim mạch, Cardio, Cardiovascular → CARDIO
                     * Sức mạnh, Strength, Bodybuilding, Weightlifting → STRENGTH
                     * Yoga → YOGA
                     * Pilates → PILATES
                     * Khiêu vũ, Dance, Dancing → DANCE
                     * Võ thuật, Martial Arts, Boxing, Muay Thai, Karate, Taekwondo → MARTIAL_ARTS
                     * Thủy sinh, Aqua, Swimming, Bơi lội → AQUA
                     * Chức năng, Functional, Functional Training → FUNCTIONAL
                     * Phục hồi, Recovery, Rehabilitation → RECOVERY
                     * Chuyên biệt, Specialized, Other → SPECIALIZED
                     Phải trả về đúng giá trị enum: CARDIO, STRENGTH, YOGA, PILATES, DANCE, MARTIAL_ARTS, AQUA, FUNCTIONAL, RECOVERY, hoặc SPECIALIZED
                   - Cấp độ (certification_level) - một trong: BASIC, INTERMEDIATE, ADVANCED, EXPERT
                
                Trả về JSON với format: {
                  "hasRedSeal": boolean,
                  "isGym147Seal": boolean,
                  "confidence": number (0-1),
                  "description": string,
                  "sealLocation": string,
                  "sealType": string,
                  "similarityScore": number (0-1),
                  "extractedData": {
                    "certification_name": string hoặc null,
                    "certification_issuer": string hoặc null,
                    "issued_date": string (YYYY-MM-DD) hoặc null,
                    "expiration_date": string (YYYY-MM-DD) hoặc null,
                    "category": string hoặc null,
                    "certification_level": string hoặc null
                  }
                }`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                  },
                },
                {
                  type: 'text',
                  text: `Đây là con dấu mẫu chính thức của Gym147 để so sánh:`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: this.OFFICIAL_SEAL_URL,
                  },
                },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.AI_API_KEY}`,
          },
          timeout: 60000, // 60 seconds timeout for AI API call
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      if (content) {
        // Try to parse JSON from AI response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);

          // Đảm bảo có đầy đủ các field cần thiết
          const processedResult = {
            hasRedSeal: result.hasRedSeal || false,
            isGym147Seal: result.isGym147Seal || false,
            confidence: result.confidence || 0,
            description: result.description || 'No description provided',
            sealLocation: result.sealLocation || 'Unknown',
            sealType: result.sealType || 'Unknown',
            similarityScore: result.similarityScore || 0,
            extractedData: result.extractedData || null,
            source: 'AI Vision Analysis',
            imageUrl: imageUrl,
            officialSealUrl: this.OFFICIAL_SEAL_URL,
            timestamp: new Date().toISOString(),
          };

          console.log(`AI Analysis Result:`, processedResult);
          return processedResult;
        }
      }

      return null;
    } catch (error) {
      console.error('AI Error:', error);
      return null;
    }
  }

  /**
   * Fallback: Sharp-based analysis (existing code)
   * @param {string} imageSource - Path to local file or URL to the certificate image
   * @returns {Object} - Sharp scan result
   */
  async scanWithSharp(imageSource) {
    try {
      let imageBuffer;
      let imageInfo;

      // Check if it's a URL or local file path
      if (this.isUrl(imageSource)) {
        console.log('Downloading image from URL...');
        imageBuffer = await this.downloadImageFromUrl(imageSource);
        imageInfo = await sharp(imageBuffer).metadata();
      } else {
        // Local file path
        if (!fs.existsSync(imageSource)) {
          throw new Error(`Certificate file not found: ${imageSource}`);
        }
        imageBuffer = fs.readFileSync(imageSource);
        imageInfo = await sharp(imageBuffer).metadata();
      }

      console.log(`Image dimensions: ${imageInfo.width}x${imageInfo.height}`);

      // Convert to HSV for better color detection
      const { data, info } = await sharp(imageBuffer)
        .toFormat('raw')
        .toColorspace('hsv')
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixels = data;
      const width = info.width;
      const height = info.height;
      const channels = info.channels;

      // Analyze pixels for red color
      const redPixels = [];
      const totalPixels = width * height;

      for (let i = 0; i < pixels.length; i += channels) {
        const h = pixels[i]; // Hue (0-255)
        const s = pixels[i + 1]; // Saturation (0-255)
        const v = pixels[i + 2]; // Value/Brightness (0-255)

        // Check if pixel matches red color ranges
        if (this.isRedPixel(h, s, v)) {
          const x = Math.floor((i / channels) % width);
          const y = Math.floor(i / channels / width);
          redPixels.push({ x, y });
        }
      }

      console.log(`Found ${redPixels.length} red pixels out of ${totalPixels} total pixels`);

      // Calculate red pixel percentage
      const redPixelPercentage = redPixels.length / totalPixels;
      console.log(`Red pixel percentage: ${(redPixelPercentage * 100).toFixed(2)}%`);

      // Check if red pixels form a seal-like pattern
      const sealAnalysis = this.analyzeSealPattern(redPixels, width, height);

      // Determine if red seal is present
      const hasRedSeal = this.determineRedSealPresence(redPixelPercentage, sealAnalysis);
      const confidence = this.calculateConfidence(redPixelPercentage, sealAnalysis);

      const result = {
        hasRedSeal,
        confidence,
        redPixelCount: redPixels.length,
        totalPixels,
        redPixelPercentage,
        sealAnalysis,
        imageDimensions: { width, height },
        source: 'Sharp Analysis',
        timestamp: new Date().toISOString(),
      };

      console.log(`Sharp scan result:`, result);
      return result;
    } catch (error) {
      console.error('Error in Sharp analysis:', error);
      throw error;
    }
  }

  /**
   * Check if a pixel is red based on HSV values
   * @param {number} h - Hue (0-255)
   * @param {number} s - Saturation (0-255)
   * @param {number} v - Value/Brightness (0-255)
   * @returns {boolean}
   */
  isRedPixel(h, s, v) {
    // Convert to 0-360 range for hue
    const hue = (h / 255) * 360;
    const saturation = (s / 255) * 100;
    const value = (v / 255) * 100;

    // Check against red color ranges
    for (const range of this.redColorRanges) {
      if (
        hue >= range.h[0] &&
        hue <= range.h[1] &&
        saturation >= range.s[0] &&
        saturation <= range.s[1] &&
        value >= range.v[0] &&
        value <= range.v[1]
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Analyze if red pixels form a seal-like pattern
   * @param {Array} redPixels - Array of red pixel coordinates
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Object} - Analysis result
   */
  analyzeSealPattern(redPixels, width, height) {
    if (redPixels.length === 0) {
      return {
        isSealLike: false,
        compactness: 0,
        centerX: 0,
        centerY: 0,
        radius: 0,
      };
    }

    // Calculate center of red pixels
    const centerX = redPixels.reduce((sum, pixel) => sum + pixel.x, 0) / redPixels.length;
    const centerY = redPixels.reduce((sum, pixel) => sum + pixel.y, 0) / redPixels.length;

    // Calculate average distance from center (radius)
    const distances = redPixels.map(pixel =>
      Math.sqrt(Math.pow(pixel.x - centerX, 2) + Math.pow(pixel.y - centerY, 2))
    );
    const avgRadius = distances.reduce((sum, dist) => sum + dist, 0) / distances.length;

    // Calculate compactness (how close pixels are to the center)
    const maxPossibleDistance = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
    const compactness = 1 - avgRadius / maxPossibleDistance;

    // Check if pattern is seal-like (circular and compact)
    const isSealLike = compactness > 0.3 && avgRadius < Math.min(width, height) * 0.2;

    return {
      isSealLike,
      compactness,
      centerX,
      centerY,
      radius: avgRadius,
      maxPossibleDistance,
    };
  }

  /**
   * Determine if red seal is present based on analysis
   * @param {number} redPixelPercentage - Percentage of red pixels
   * @param {Object} sealAnalysis - Seal pattern analysis
   * @returns {boolean}
   */
  determineRedSealPresence(redPixelPercentage, sealAnalysis) {
    // Criteria for red seal presence:
    // 1. Red pixels should be 0.5% to 15% of image
    // 2. Pattern should be seal-like (compact and circular)
    // 3. Should be within reasonable size range

    const hasReasonableRedAmount = redPixelPercentage >= 0.005 && redPixelPercentage <= 0.15;
    const hasSealPattern = sealAnalysis.isSealLike;
    const hasReasonableSize = sealAnalysis.radius > 0 && sealAnalysis.radius < 200;

    return hasReasonableRedAmount && hasSealPattern && hasReasonableSize;
  }

  /**
   * Calculate confidence score for red seal detection
   * @param {number} redPixelPercentage - Percentage of red pixels
   * @param {Object} sealAnalysis - Seal pattern analysis
   * @returns {number} - Confidence score (0-1)
   */
  calculateConfidence(redPixelPercentage, sealAnalysis) {
    let confidence = 0;

    // Red pixel percentage score (0-0.4)
    if (redPixelPercentage >= 0.01 && redPixelPercentage <= 0.08) {
      confidence += 0.4;
    } else if (redPixelPercentage >= 0.005 && redPixelPercentage <= 0.12) {
      confidence += 0.3;
    } else if (redPixelPercentage >= 0.002 && redPixelPercentage <= 0.15) {
      confidence += 0.2;
    }

    // Seal pattern score (0-0.4)
    if (sealAnalysis.isSealLike) {
      confidence += 0.4;
    } else if (sealAnalysis.compactness > 0.2) {
      confidence += 0.2;
    }

    // Size reasonableness score (0-0.2)
    if (sealAnalysis.radius > 10 && sealAnalysis.radius < 150) {
      confidence += 0.2;
    } else if (sealAnalysis.radius > 5 && sealAnalysis.radius < 200) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate a detailed scan report
   * @param {string} imagePath - Path to the certificate image
   * @returns {Object} - Detailed scan report
   */
  async generateScanReport(imagePath) {
    const scanResult = await this.scanForRedSeal(imagePath);

    return {
      ...scanResult,
      timestamp: new Date().toISOString(),
      imagePath,
      recommendations: this.generateRecommendations(scanResult),
    };
  }

  /**
   * Generate recommendations based on scan result
   * @param {Object} scanResult - Scan result
   * @returns {Array} - Array of recommendations
   */
  generateRecommendations(scanResult) {
    const recommendations = [];

    if (!scanResult.hasRedSeal) {
      if (scanResult.redPixelPercentage < 0.005) {
        recommendations.push(
          'No red elements detected. Please ensure the certificate has a red seal/stamp.'
        );
      } else if (scanResult.redPixelPercentage > 0.15) {
        recommendations.push(
          'Too many red pixels detected. The image might be corrupted or not a certificate.'
        );
      } else if (!scanResult.sealAnalysis.isSealLike) {
        recommendations.push(
          'Red elements detected but they do not form a seal-like pattern. Please ensure the red seal is clearly visible and circular.'
        );
      }
    } else {
      if (scanResult.confidence < 0.7) {
        recommendations.push(
          'Red seal detected but with low confidence. Please ensure the seal is clear and well-defined.'
        );
      } else {
        recommendations.push(
          'Red seal detected with high confidence. Certificate appears to be valid.'
        );
      }
    }

    return recommendations;
  }

  /**
   * Check if string is a valid URL
   * @param {string} str - String to check
   * @returns {boolean}
   */
  isUrl(str) {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download image from URL
   * @param {string} url - Image URL
   * @returns {Promise<Buffer>} - Image buffer
   */
  async downloadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https:') ? https : http;

      protocol
        .get(url, response => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download image: ${response.statusCode}`));
            return;
          }

          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
          response.on('error', reject);
        })
        .on('error', reject);
    });
  }
}

module.exports = new AICertificationScanner();
