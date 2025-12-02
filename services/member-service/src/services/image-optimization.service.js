const sharp = require('sharp');

/**
 * Image Optimization Service
 * Handles image resizing, compression, and format conversion
 */
class ImageOptimizationService {
  constructor() {
    // Default settings
    this.defaultSettings = {
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 85,
      format: 'jpeg', // jpeg, webp, png
      progressive: true,
    };

    // Avatar-specific settings
    this.avatarSettings = {
      maxWidth: 400,
      maxHeight: 400,
      quality: 80,
      format: 'jpeg',
      progressive: true,
      fit: 'cover', // cover, contain, fill, inside, outside
    };

    // Certification settings
    this.certificationSettings = {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 90,
      format: 'jpeg',
      progressive: true,
    };

    // Thumbnail settings
    this.thumbnailSettings = {
      maxWidth: 300,
      maxHeight: 300,
      quality: 75,
      format: 'jpeg',
      fit: 'cover',
    };
  }

  /**
   * Optimize image with custom settings
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {Object} options - Optimization options
   * @returns {Promise<Buffer>} Optimized image buffer
   */
  async optimizeImage(imageBuffer, options = {}) {
    try {
      const settings = { ...this.defaultSettings, ...options };
      
      let pipeline = sharp(imageBuffer);

      // Resize if needed
      if (settings.maxWidth || settings.maxHeight) {
        pipeline = pipeline.resize(settings.maxWidth, settings.maxHeight, {
          fit: settings.fit || 'inside',
          withoutEnlargement: true, // Don't enlarge small images
        });
      }

      // Convert format and apply compression
      switch (settings.format.toLowerCase()) {
        case 'webp':
          pipeline = pipeline.webp({ quality: settings.quality, progressive: settings.progressive });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: settings.quality, progressive: settings.progressive });
          break;
        case 'jpeg':
        case 'jpg':
        default:
          pipeline = pipeline.jpeg({ 
            quality: settings.quality, 
            progressive: settings.progressive,
            mozjpeg: true, // Better compression
          });
          break;
      }

      // Apply additional optimizations
      if (settings.stripMetadata !== false) {
        pipeline = pipeline.removeAlpha(); // Remove alpha channel for JPEG
      }

      const optimizedBuffer = await pipeline.toBuffer();

      return {
        success: true,
        buffer: optimizedBuffer,
        originalSize: imageBuffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: ((1 - optimizedBuffer.length / imageBuffer.length) * 100).toFixed(2),
      };
    } catch (error) {
      console.error('[ERROR] Image optimization error:', error);
      return {
        success: false,
        error: error.message,
        buffer: imageBuffer, // Return original on error
      };
    }
  }

  /**
   * Optimize avatar image
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeAvatar(imageBuffer) {
    return await this.optimizeImage(imageBuffer, this.avatarSettings);
  }

  /**
   * Optimize certification image
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeCertification(imageBuffer) {
    return await this.optimizeImage(imageBuffer, this.certificationSettings);
  }

  /**
   * Create thumbnail
   * @param {Buffer} imageBuffer - Original image buffer
   * @returns {Promise<Object>} Thumbnail result
   */
  async createThumbnail(imageBuffer) {
    return await this.optimizeImage(imageBuffer, this.thumbnailSettings);
  }

  /**
   * Get image metadata
   * @param {Buffer} imageBuffer - Image buffer
   * @returns {Promise<Object>} Image metadata
   */
  async getImageMetadata(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      
      return {
        success: true,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
        hasAlpha: metadata.hasAlpha || false,
        channels: metadata.channels,
        density: metadata.density,
        orientation: metadata.orientation,
      };
    } catch (error) {
      console.error('[ERROR] Get image metadata error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate image format and size
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} constraints - Validation constraints
   * @returns {Promise<Object>} Validation result
   */
  async validateImage(imageBuffer, constraints = {}) {
    try {
      const {
        maxWidth = 4096,
        maxHeight = 4096,
        maxSize = 10 * 1024 * 1024, // 10MB
        minWidth = 1,
        minHeight = 1,
        allowedFormats = ['jpeg', 'jpg', 'png', 'webp'],
      } = constraints;

      // Check file size
      if (imageBuffer.length > maxSize) {
        return {
          success: false,
          error: `Image size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
        };
      }

      // Get metadata
      const metadataResult = await this.getImageMetadata(imageBuffer);
      if (!metadataResult.success) {
        return metadataResult;
      }

      const { width, height, format } = metadataResult;

      // Check dimensions
      if (width > maxWidth || height > maxHeight) {
        return {
          success: false,
          error: `Image dimensions (${width}x${height}) exceed maximum allowed (${maxWidth}x${maxHeight})`,
        };
      }

      if (width < minWidth || height < minHeight) {
        return {
          success: false,
          error: `Image dimensions (${width}x${height}) are below minimum required (${minWidth}x${minHeight})`,
        };
      }

      // Check format
      const normalizedFormat = format.toLowerCase();
      if (!allowedFormats.some(f => normalizedFormat.includes(f.toLowerCase()))) {
        return {
          success: false,
          error: `Image format (${format}) is not allowed. Allowed formats: ${allowedFormats.join(', ')}`,
        };
      }

      return {
        success: true,
        metadata: metadataResult,
      };
    } catch (error) {
      console.error('[ERROR] Image validation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Convert image to different format
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} targetFormat - Target format (jpeg, webp, png)
   * @param {Object} options - Conversion options
   * @returns {Promise<Object>} Conversion result
   */
  async convertFormat(imageBuffer, targetFormat, options = {}) {
    try {
      let pipeline = sharp(imageBuffer);

      switch (targetFormat.toLowerCase()) {
        case 'webp':
          pipeline = pipeline.webp({ quality: options.quality || 85 });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: options.quality || 90 });
          break;
        case 'jpeg':
        case 'jpg':
        default:
          pipeline = pipeline.jpeg({ quality: options.quality || 85 });
          break;
      }

      const convertedBuffer = await pipeline.toBuffer();

      return {
        success: true,
        buffer: convertedBuffer,
        format: targetFormat,
        size: convertedBuffer.length,
      };
    } catch (error) {
      console.error('[ERROR] Format conversion error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new ImageOptimizationService();

