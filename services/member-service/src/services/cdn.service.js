/**
 * CDN Service
 * Handles CDN URL generation and configuration
 * Supports AWS CloudFront, Cloudflare, and custom CDN
 */
class CDNService {
  constructor() {
    this.cdnUrl = process.env.CDN_URL;
    this.cdnType = process.env.CDN_TYPE || 'cloudfront'; // cloudfront, cloudflare, custom
    this.s3BucketName = process.env.AWS_S3_BUCKET_NAME;
    this.s3Region = process.env.AWS_REGION || 'us-east-1';
  }

  /**
   * Check if CDN is configured
   * @returns {boolean} - True if CDN is enabled
   */
  isEnabled() {
    return !!this.cdnUrl;
  }

  /**
   * Generate CDN URL from S3 key
   * @param {string} key - S3 object key
   * @returns {string} - CDN URL or S3 URL if CDN not configured
   */
  getUrl(key) {
    if (!key) {
      return null;
    }

    // If CDN is configured, use CDN URL
    if (this.isEnabled()) {
      // Remove leading slash if present
      const cleanKey = key.startsWith('/') ? key.substring(1) : key;
      return `${this.cdnUrl}/${cleanKey}`;
    }

    // Fallback to S3 URL
    return `https://${this.s3BucketName}.s3.${this.s3Region}.amazonaws.com/${key}`;
  }

  /**
   * Generate signed CDN URL (for private assets)
   * @param {string} key - S3 object key
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} - Signed CDN URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.isEnabled()) {
      // If no CDN, return regular S3 signed URL
      const { S3Client } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const { GetObjectCommand } = require('@aws-sdk/client-s3');

      const s3Client = new S3Client({
        region: this.s3Region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const command = new GetObjectCommand({
        Bucket: this.s3BucketName,
        Key: key,
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    }

    // For CloudFront, would need CloudFront signed URLs
    // For now, return regular CDN URL (assuming public access)
    return this.getUrl(key);
  }

  /**
   * Convert S3 URL to CDN URL
   * @param {string} s3Url - S3 URL
   * @returns {string} - CDN URL or original S3 URL
   */
  convertS3UrlToCDN(s3Url) {
    if (!s3Url || !this.isEnabled()) {
      return s3Url;
    }

    try {
      // Extract key from S3 URL
      const urlObj = new URL(s3Url);
      const key = urlObj.pathname.substring(1); // Remove leading slash
      
      return this.getUrl(key);
    } catch (error) {
      console.error('[ERROR] Error converting S3 URL to CDN:', error);
      return s3Url; // Return original URL on error
    }
  }

  /**
   * Get CDN configuration info
   * @returns {Object} - CDN configuration
   */
  getConfig() {
    return {
      enabled: this.isEnabled(),
      type: this.cdnType,
      url: this.cdnUrl,
      s3Bucket: this.s3BucketName,
      s3Region: this.s3Region,
    };
  }

  /**
   * Invalidate CDN cache for specific paths
   * @param {string[]} paths - Array of paths to invalidate
   * @returns {Promise<Object>} - Invalidation result
   */
  async invalidateCache(paths) {
    if (!this.isEnabled()) {
      return {
        success: false,
        error: 'CDN is not configured',
      };
    }

    // CloudFront invalidation
    if (this.cdnType === 'cloudfront' && process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID) {
      try {
        const { CloudFrontClient, CreateInvalidationCommand } = require('@aws-sdk/client-cloudfront');

        const cloudfrontClient = new CloudFrontClient({
          region: this.s3Region,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        const command = new CreateInvalidationCommand({
          DistributionId: process.env.AWS_CLOUDFRONT_DISTRIBUTION_ID,
          InvalidationBatch: {
            Paths: {
              Quantity: paths.length,
              Items: paths,
            },
            CallerReference: `invalidation-${Date.now()}`,
          },
        });

        const result = await cloudfrontClient.send(command);

        return {
          success: true,
          invalidationId: result.Invalidation?.Id,
          status: result.Invalidation?.Status,
        };
      } catch (error) {
        console.error('[ERROR] CloudFront invalidation error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    // Cloudflare invalidation (purge cache)
    if (this.cdnType === 'cloudflare' && process.env.CLOUDFLARE_ZONE_ID && process.env.CLOUDFLARE_API_TOKEN) {
      try {
        const axios = require('axios');

        const response = await axios.post(
          `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/purge_cache`,
          {
            files: paths,
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );

        return {
          success: true,
          result: response.data,
        };
      } catch (error) {
        console.error('[ERROR] Cloudflare cache purge error:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    }

    return {
      success: false,
      error: 'CDN invalidation not configured for this CDN type',
    };
  }
}

module.exports = new CDNService();

