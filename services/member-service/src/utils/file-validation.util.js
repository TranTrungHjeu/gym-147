/**
 * File Validation Utility
 * Provides comprehensive file validation including MIME type, file signature, and security checks
 */

class FileValidationUtil {
  /**
   * File signatures (magic numbers) for image validation
   */
  static FILE_SIGNATURES = {
    'image/jpeg': [
      [0xff, 0xd8, 0xff], // JPEG
    ],
    'image/png': [
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG
    ],
    'image/webp': [
      [0x52, 0x49, 0x46, 0x46], // WebP (RIFF)
    ],
    'image/gif': [
      [0x47, 0x49, 0x46, 0x38], // GIF87a or GIF89a
    ],
  };

  /**
   * Check if buffer matches file signature
   * @param {Buffer} buffer - File buffer
   * @param {string} mimeType - Expected MIME type
   * @returns {boolean} - True if signature matches
   */
  static checkFileSignature(buffer, mimeType) {
    if (!buffer || buffer.length < 4) {
      return false;
    }

    const signatures = this.FILE_SIGNATURES[mimeType];
    if (!signatures) {
      return false; // Unknown MIME type
    }

    return signatures.some(signature => {
      return signature.every((byte, index) => buffer[index] === byte);
    });
  }

  /**
   * Validate file MIME type matches actual file signature
   * @param {Buffer} buffer - File buffer
   * @param {string} declaredMimeType - MIME type declared by client
   * @returns {Object} - Validation result
   */
  static validateMimeType(buffer, declaredMimeType) {
    // Check if declared MIME type is valid image type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validImageTypes.includes(declaredMimeType)) {
      return {
        valid: false,
        error: `Invalid MIME type: ${declaredMimeType}. Allowed: ${validImageTypes.join(', ')}`,
      };
    }

    // Check file signature matches declared MIME type
    if (!this.checkFileSignature(buffer, declaredMimeType)) {
      return {
        valid: false,
        error: `File signature does not match declared MIME type: ${declaredMimeType}`,
      };
    }

    return {
      valid: true,
      detectedMimeType: declaredMimeType,
    };
  }

  /**
   * Detect actual file type from buffer
   * @param {Buffer} buffer - File buffer
   * @returns {string|null} - Detected MIME type or null
   */
  static detectFileType(buffer) {
    if (!buffer || buffer.length < 4) {
      return null;
    }

    for (const [mimeType, signatures] of Object.entries(this.FILE_SIGNATURES)) {
      if (signatures.some(signature => {
        return signature.every((byte, index) => buffer[index] === byte);
      })) {
        return mimeType;
      }
    }

    return null;
  }

  /**
   * Validate file size
   * @param {Buffer} buffer - File buffer
   * @param {number} maxSize - Maximum size in bytes
   * @param {number} minSize - Minimum size in bytes (default: 1KB)
   * @returns {Object} - Validation result
   */
  static validateFileSize(buffer, maxSize, minSize = 1024) {
    const size = buffer.length;

    if (size < minSize) {
      return {
        valid: false,
        error: `File size (${size} bytes) is below minimum required size (${minSize} bytes)`,
      };
    }

    if (size > maxSize) {
      return {
        valid: false,
        error: `File size (${size} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
      };
    }

    return {
      valid: true,
      size,
    };
  }

  /**
   * Comprehensive file validation
   * @param {Buffer} buffer - File buffer
   * @param {string} declaredMimeType - MIME type declared by client
   * @param {Object} options - Validation options
   * @returns {Object} - Validation result
   */
  static validateFile(buffer, declaredMimeType, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      minSize = 1024, // 1KB minimum
      allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'],
      checkSignature = true,
    } = options;

    // Check if buffer exists
    if (!buffer || !Buffer.isBuffer(buffer)) {
      return {
        valid: false,
        error: 'Invalid file buffer',
      };
    }

    // Check file size
    const sizeValidation = this.validateFileSize(buffer, maxSize, minSize);
    if (!sizeValidation.valid) {
      return sizeValidation;
    }

    // Check if declared MIME type is allowed
    if (!allowedMimeTypes.includes(declaredMimeType)) {
      return {
        valid: false,
        error: `MIME type ${declaredMimeType} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
      };
    }

    // Check file signature if enabled
    if (checkSignature) {
      const signatureValidation = this.validateMimeType(buffer, declaredMimeType);
      if (!signatureValidation.valid) {
        return signatureValidation;
      }

      // Also detect actual file type
      const detectedType = this.detectFileType(buffer);
      if (detectedType && detectedType !== declaredMimeType) {
        return {
          valid: false,
          error: `File signature indicates type ${detectedType}, but declared type is ${declaredMimeType}`,
          detectedType,
          declaredType: declaredMimeType,
        };
      }
    }

    return {
      valid: true,
      size: buffer.length,
      mimeType: declaredMimeType,
    };
  }

  /**
   * Sanitize filename
   * @param {string} filename - Original filename
   * @returns {string} - Sanitized filename
   */
  static sanitizeFilename(filename) {
    if (!filename) {
      return 'file';
    }

    // Remove path traversal attempts
    let sanitized = filename.replace(/\.\./g, '').replace(/\//g, '').replace(/\\/g, '');

    // Remove special characters except dots, hyphens, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Limit length
    if (sanitized.length > 255) {
      const ext = sanitized.split('.').pop();
      sanitized = sanitized.substring(0, 255 - ext.length - 1) + '.' + ext;
    }

    return sanitized;
  }

  /**
   * Validate file extension matches MIME type
   * @param {string} filename - Filename
   * @param {string} mimeType - MIME type
   * @returns {boolean} - True if extension matches
   */
  static validateExtension(filename, mimeType) {
    const extensionMap = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
    };

    const extensions = extensionMap[mimeType];
    if (!extensions) {
      return false;
    }

    const fileExt = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return extensions.includes(fileExt);
  }
}

module.exports = FileValidationUtil;

